import { ipcMain, dialog, app } from 'electron'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { PhpDetector } from '../php/PhpDetector'
import { PhpExecutionService } from '../executor/PhpExecutionService'
import { FrameworkDetector } from '../project/FrameworkDetector'
import { RecentProjects } from '../project/RecentProjects'
import { pathToUri } from '../lsp/IntelephenseLsp'
import { LanguageServerManager } from '../lsp/LanguageServerManager'
import { Logger } from '../storage/Logger'
import { WorkspaceService } from '../workspace/WorkspaceService'
import { LaravelDiscoveryService } from '../laravel/LaravelDiscoveryService'
import { HistoryService } from '../history/HistoryService'
import { ClaudeClient } from '../ai/ClaudeClient'
import type { AiMessage } from '../ai/ClaudeClient'
import { ok, fail } from './types'
import type { ExecutionContext } from '../executor/types'

const phpDetector = new PhpDetector()
const executionService = new PhpExecutionService()
const frameworkDetector = new FrameworkDetector()
const laravelDiscovery = new LaravelDiscoveryService()
const historyService = new HistoryService()
const lspManager = new LanguageServerManager()
let recentProjects: RecentProjects
let workspaceService: WorkspaceService
let lspLogger: Logger | null = null
let lastProjectPath: string | null = null
let lastWorkspaceId: string | null = null

function sessionFile(projectPath: string): string {
  const ws = workspaceService.get(projectPath)
  return join(ws.storagePath, 'sessions.json')
}

export function registerIpcHandlers(): void {
  recentProjects = new RecentProjects(app.getPath('userData'))
  workspaceService = new WorkspaceService(app.getPath('userData'))

  ipcMain.handle('php:detect', async () => {
    return phpDetector.detect()
  })

  ipcMain.handle('php:execute', async (event, code: string, context: ExecutionContext) => {
    const { executionId, result } = await executionService.run(
      code,
      context,
      (id, chunk, stream) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send('execution:output', { executionId: id, chunk, stream })
        }
      }
    )
    if (!event.sender.isDestroyed()) {
      event.sender.send('execution:started', { executionId })
    }
    const execResult = await result
    if (context.projectPath && workspaceService) {
      const ws = workspaceService.get(context.projectPath)
      historyService.add(ws.storagePath, {
        code,
        projectPath: context.projectPath,
        durationMs: execResult.executionTimeMs
      }).catch(() => undefined)
    }
    return execResult
  })

  ipcMain.handle('history:list', async (_event, projectPath: string) => {
    if (!workspaceService) return []
    const ws = workspaceService.get(projectPath)
    return historyService.list(ws.storagePath)
  })

  ipcMain.handle('history:remove', async (_event, projectPath: string, id: string) => {
    if (!workspaceService) return
    const ws = workspaceService.get(projectPath)
    await historyService.remove(ws.storagePath, id)
  })

  ipcMain.handle('history:toggleFavorite', async (_event, projectPath: string, id: string) => {
    if (!workspaceService) return false
    const ws = workspaceService.get(projectPath)
    return historyService.toggleFavorite(ws.storagePath, id)
  })

  ipcMain.handle('execution:cancel', (_event, executionId: string) => {
    return executionService.cancel(executionId)
  })

  ipcMain.handle('project:open-dialog', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Open PHP Project'
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('file:save-dialog', async (_event, content: string, defaultName: string) => {
    const result = await dialog.showSaveDialog({
      title: 'Save Output',
      defaultPath: defaultName,
      filters: [{ name: 'Text files', extensions: ['txt'] }]
    })
    if (result.canceled || !result.filePath) return false
    await writeFile(result.filePath, content, 'utf-8')
    return true
  })

  ipcMain.handle('project:detect-framework', async (_event, projectPath: string) => {
    return frameworkDetector.detect(projectPath)
  })

  ipcMain.handle('session:save', async (_event, projectPath: string, sessions: unknown) => {
    const ws = await workspaceService.ensure(projectPath)
    const file = join(ws.storagePath, 'sessions.json')
    await writeFile(file, JSON.stringify(sessions), 'utf-8')
  })

  ipcMain.handle('session:load', async (_event, projectPath: string) => {
    try {
      const raw = await readFile(sessionFile(projectPath), 'utf-8')
      return JSON.parse(raw)
    } catch {
      return null
    }
  })

  ipcMain.handle('recent:list', async () => {
    return recentProjects.list()
  })

  ipcMain.handle(
    'recent:add',
    async (_event, project: { path: string; name: string; framework: string }) => {
      return recentProjects.add(project)
    }
  )

  ipcMain.handle('recent:remove', async (_event, projectPath: string) => {
    return recentProjects.remove(projectPath)
  })

  // ── Laravel Discovery ─────────────────────────────────────────────────────

  ipcMain.handle('laravel:discover', async (_event, projectPath: string, phpBinary: string) => {
    try {
      const ws = await workspaceService.ensure(projectPath)
      const meta = await laravelDiscovery.discover(projectPath, ws.storagePath, ws.generatedPath, phpBinary)
      return ok(meta)
    } catch (e) {
      return fail('DISCOVERY_ERROR', (e as Error).message)
    }
  })

  // ── Intelephense LSP ──────────────────────────────────────────────────────

  async function startLsp(
    event: Electron.IpcMainInvokeEvent,
    projectPath: string
  ): Promise<void> {
    const ws = await workspaceService.ensure(projectPath)

    lastProjectPath = projectPath
    lastWorkspaceId = ws.id

    if (!lspLogger) {
      lspLogger = new Logger(join(ws.logsPath, 'lsp.log'))
    }

    lspLogger.info(`Starting LSP for project: ${projectPath} (workspace: ${ws.id})`)

    const onStateChanged = (payload: unknown) => {
      lspLogger?.info(`LSP stateChanged: ${JSON.stringify(payload)}`)
      if (!event.sender.isDestroyed()) {
        event.sender.send('lsp:stateChanged', payload)
      }
    }

    const lsp = lspManager.start(ws.id, projectPath, ws.lspCachePath, lspLogger, onStateChanged)

    lsp.initialize(projectPath, ws.lspCachePath).catch((err: Error) => {
      lspLogger?.error(`LSP initialize failed: ${err.message}`)
      if (!event.sender.isDestroyed()) {
        event.sender.send('lsp:stateChanged', { state: 'error', message: err.message })
      }
    })
  }

  ipcMain.handle('lsp:start', async (event, projectPath: string) => {
    await startLsp(event, projectPath)
    return { ok: true }
  })

  ipcMain.handle('lsp:restart', async (event) => {
    if (!lastProjectPath) return fail('NO_PROJECT', 'No project loaded')
    lspLogger?.info('LSP restart requested')
    await startLsp(event, lastProjectPath)
    return ok(true)
  })

  ipcMain.handle('lsp:stop', () => {
    if (lastWorkspaceId) lspManager.stop(lastWorkspaceId)
  })

  ipcMain.handle('lsp:isReady', () => {
    return lspManager.getActive()?.isReady() ?? false
  })

  ipcMain.handle('lsp:getState', () => {
    return lspManager.getActive()?.getState() ?? 'stopped'
  })

  ipcMain.handle('lsp:didOpen', (_event, uri: string, text: string, version: number) => {
    lspManager.getActive()?.didOpen(uri, text, version)
  })

  ipcMain.handle('lsp:didChange', (_event, uri: string, text: string, version: number) => {
    lspManager.getActive()?.didChange(uri, text, version)
  })

  ipcMain.handle('lsp:didClose', (_event, uri: string) => {
    lspManager.getActive()?.didClose(uri)
  })

  ipcMain.handle('lsp:completion', async (_event, uri: string, line: number, character: number) => {
    const lsp = lspManager.getActive()
    if (!lsp) return fail('LSP_NOT_READY', 'No active LSP instance')
    try {
      return ok(await lsp.completion(uri, line, character))
    } catch (e) {
      return fail('LSP_ERROR', (e as Error).message)
    }
  })

  ipcMain.handle('lsp:hover', async (_event, uri: string, line: number, character: number) => {
    const lsp = lspManager.getActive()
    if (!lsp) return fail('LSP_NOT_READY', 'No active LSP instance')
    try {
      return ok(await lsp.hover(uri, line, character))
    } catch (e) {
      return fail('LSP_ERROR', (e as Error).message)
    }
  })

  ipcMain.handle('lsp:signatureHelp', async (_event, uri: string, line: number, character: number) => {
    const lsp = lspManager.getActive()
    if (!lsp) return fail('LSP_NOT_READY', 'No active LSP instance')
    try {
      return ok(await lsp.signatureHelp(uri, line, character))
    } catch (e) {
      return fail('LSP_ERROR', (e as Error).message)
    }
  })

  // Expose URI helper so renderer doesn't need path manipulation
  ipcMain.handle('lsp:pathToUri', (_event, path: string) => pathToUri(path))

  app.on('before-quit', () => lspManager.stopAll())

  // ── AI Assistant ─────────────────────────────────────────────────────────

  const aiKeyFile = join(app.getPath('userData'), 'ai-key.json')

  ipcMain.handle('ai:setKey', async (_event, key: string) => {
    await writeFile(aiKeyFile, JSON.stringify({ key }), 'utf-8')
  })

  ipcMain.handle('ai:getKey', async () => {
    try {
      const raw = await readFile(aiKeyFile, 'utf-8')
      return (JSON.parse(raw) as { key: string }).key
    } catch {
      return ''
    }
  })

  ipcMain.handle('ai:chat', async (event, messages: AiMessage[], systemPrompt: string) => {
    let key = ''
    try {
      const raw = await readFile(aiKeyFile, 'utf-8')
      key = (JSON.parse(raw) as { key: string }).key
    } catch {
      return fail('NO_API_KEY', 'API key not configured')
    }

    if (!key) return fail('NO_API_KEY', 'API key not configured')

    const client = new ClaudeClient(key)
    client.streamChat(
      messages,
      systemPrompt,
      (text) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send('ai:chunk', { text })
        }
      },
      () => {
        if (!event.sender.isDestroyed()) {
          event.sender.send('ai:done')
        }
      },
      (err) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send('ai:error', { message: err.message })
        }
      }
    )

    return ok(true)
  })
}
