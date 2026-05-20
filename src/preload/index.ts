import { contextBridge, ipcRenderer } from 'electron'
import type { ExecutionContext, ExecutionResult } from '../main/executor/types'
import type { PhpBinary } from '../main/php/PhpDetector'
import type { ProjectInfo } from '../main/project/FrameworkDetector'

const api = {
  detectPhp: (): Promise<PhpBinary[]> => ipcRenderer.invoke('php:detect'),

  executePhp: (code: string, context: ExecutionContext): Promise<ExecutionResult> =>
    ipcRenderer.invoke('php:execute', code, context),

  openProjectDialog: (): Promise<string | null> => ipcRenderer.invoke('project:open-dialog'),

  detectFramework: (projectPath: string): Promise<ProjectInfo> =>
    ipcRenderer.invoke('project:detect-framework', projectPath)
}

contextBridge.exposeInMainWorld('electronAPI', api)
