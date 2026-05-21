import { ipcMain, dialog, app } from 'electron'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { createHash } from 'crypto'
import { PhpDetector } from '../php/PhpDetector'
import { LocalExecutor } from '../executor/LocalExecutor'
import { FrameworkDetector } from '../project/FrameworkDetector'
import { RecentProjects } from '../project/RecentProjects'
import { IntelephenseLsp, pathToUri } from '../lsp/IntelephenseLsp'
import type { ExecutionContext } from '../executor/types'

const phpDetector = new PhpDetector()
const executor = new LocalExecutor()
const frameworkDetector = new FrameworkDetector()
const lsp = new IntelephenseLsp()
let recentProjects: RecentProjects

function sessionFile(projectPath: string): string {
  const projectHash = createHash('sha256').update(projectPath).digest('hex').slice(0, 12)
  return join(app.getPath('userData'), 'sessions', `${projectHash}.json`)
}

export function registerIpcHandlers(): void {
  recentProjects = new RecentProjects(app.getPath('userData'))

  ipcMain.handle('php:detect', async () => {
    return phpDetector.detect()
  })

  ipcMain.handle('php:execute', async (_event, code: string, context: ExecutionContext) => {
    return executor.execute(code, context)
  })

  ipcMain.handle('project:open-dialog', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Open PHP Project'
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('project:detect-framework', async (_event, projectPath: string) => {
    return frameworkDetector.detect(projectPath)
  })

  ipcMain.handle('session:save', async (_event, projectPath: string, sessions: unknown) => {
    const file = sessionFile(projectPath)
    await mkdir(join(app.getPath('userData'), 'sessions'), { recursive: true })
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

  // ── Intelephense LSP ──────────────────────────────────────────────────────

  ipcMain.handle('lsp:start', async (event, projectPath: string) => {
    const storagePath = join(app.getPath('userData'), 'intelephense')
    await mkdir(storagePath, { recursive: true })

    lsp.stop()

    // Forward state changes to the renderer that initiated lsp:start
    const onStateChanged = (payload: unknown) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send('lsp:stateChanged', payload)
      }
    }
    lsp.removeAllListeners('stateChanged')
    lsp.on('stateChanged', onStateChanged)

    lsp.start(storagePath)

    // Initialize in background — indexing large projects can take minutes.
    lsp.initialize(projectPath, storagePath).catch((err: Error) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send('lsp:stateChanged', { state: 'error', message: err.message })
      }
    })

    return { ok: true }
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
      return await lsp.completion(uri, line, character)
    } catch {
      return null
    }
  })

  ipcMain.handle('lsp:hover', async (_event, uri: string, line: number, character: number) => {
    try {
      return await lsp.hover(uri, line, character)
    } catch {
      return null
    }
  })

  ipcMain.handle('lsp:signatureHelp', async (_event, uri: string, line: number, character: number) => {
    try {
      return await lsp.signatureHelp(uri, line, character)
    } catch {
      return null
    }
  })

  // Expose URI helper so renderer doesn't need path manipulation
  ipcMain.handle('lsp:pathToUri', (_event, path: string) => pathToUri(path))
}
