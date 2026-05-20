import { ipcMain, dialog, app } from 'electron'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { createHash } from 'crypto'
import { PhpDetector } from '../php/PhpDetector'
import { LocalExecutor } from '../executor/LocalExecutor'
import { FrameworkDetector } from '../project/FrameworkDetector'
import type { ExecutionContext } from '../executor/types'

const phpDetector = new PhpDetector()
const executor = new LocalExecutor()
const frameworkDetector = new FrameworkDetector()

function sessionFile(projectPath: string): string {
  const projectHash = createHash('sha256').update(projectPath).digest('hex').slice(0, 12)
  return join(app.getPath('userData'), 'sessions', `${projectHash}.json`)
}

export function registerIpcHandlers(): void {
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
}
