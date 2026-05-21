import { ipcMain, dialog, app } from 'electron'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { PhpDetector } from '../php/PhpDetector'
import { PhpExecutionService } from '../executor/PhpExecutionService'
import { FrameworkDetector } from '../project/FrameworkDetector'
import { RecentProjects } from '../project/RecentProjects'
import { IntelephenseLsp, pathToUri } from '../lsp/IntelephenseLsp'
import { Logger } from '../storage/Logger'
import { WorkspaceService } from '../workspace/WorkspaceService'
import { LaravelDiscoveryService } from '../laravel/LaravelDiscoveryService'
import { ok, fail } from './types'
import type { ExecutionContext } from '../executor/types'

const phpDetector = new PhpDetector()
const executionService = new PhpExecutionService()
const frameworkDetector = new FrameworkDetector()
const laravelDiscovery = new LaravelDiscoveryService()
const lsp = new IntelephenseLsp()
let recentProjects: RecentProjects
let workspaceService: WorkspaceService
let lspLogger: Logger | null = null
let lastProjectPath: string | null = null

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
    return result
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

    if (!lspLogger) {
      lspLogger = new Logger(join(ws.logsPath, 'lsp.log'))
      lsp.setLogger(lspLogger)
    }

    lspLogger.info(`Starting LSP for project: ${projectPath} (workspace: ${ws.id})`)

    lsp.stop()

    const onStateChanged = (payload: unknown) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send('lsp:stateChanged', payload)
      }
    }
    lsp.removeAllListeners('stateChanged')
    lsp.on('stateChanged', onStateChanged)

    lsp.start(ws.lspCachePath)

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

  ipcMain.handle('lsp:stop', async () => {
    lsp.stop()
  })

  ipcMain.handle('lsp:isReady', () => {
    return lsp.isReady()
  })

  ipcMain.handle('lsp:getState', () => {
    return lsp.getState()
  })

  ipcMain.handle('lsp:didOpen', (_event, uri: string, text: string, version: number) => {
    lsp.didOpen(uri, text, version)
  })

  ipcMain.handle('lsp:didChange', (_event, uri: string, text: string, version: number) => {
    lsp.didChange(uri, text, version)
  })

  ipcMain.handle('lsp:didClose', (_event, uri: string) => {
    lsp.didClose(uri)
  })

  ipcMain.handle('lsp:completion', async (_event, uri: string, line: number, character: number) => {
    try {
      return ok(await lsp.completion(uri, line, character))
    } catch (e) {
      return fail('LSP_ERROR', (e as Error).message)
    }
  })

  ipcMain.handle('lsp:hover', async (_event, uri: string, line: number, character: number) => {
    try {
      return ok(await lsp.hover(uri, line, character))
    } catch (e) {
      return fail('LSP_ERROR', (e as Error).message)
    }
  })

  ipcMain.handle('lsp:signatureHelp', async (_event, uri: string, line: number, character: number) => {
    try {
      return ok(await lsp.signatureHelp(uri, line, character))
    } catch (e) {
      return fail('LSP_ERROR', (e as Error).message)
    }
  })

  // Expose URI helper so renderer doesn't need path manipulation
  ipcMain.handle('lsp:pathToUri', (_event, path: string) => pathToUri(path))
}
