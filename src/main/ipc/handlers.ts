import { ipcMain, dialog } from 'electron'
import { PhpDetector } from '../php/PhpDetector'
import { LocalExecutor } from '../executor/LocalExecutor'
import { FrameworkDetector } from '../project/FrameworkDetector'
import type { ExecutionContext } from '../executor/types'

const phpDetector = new PhpDetector()
const executor = new LocalExecutor()
const frameworkDetector = new FrameworkDetector()

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
}
