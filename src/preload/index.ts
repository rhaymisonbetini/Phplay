import { contextBridge, ipcRenderer } from 'electron'
import type { ExecutionContext, ExecutionResult } from '../main/executor/types'
import type { PhpBinary } from '../main/php/PhpDetector'

const api = {
  detectPhp: (): Promise<PhpBinary[]> => ipcRenderer.invoke('php:detect'),

  executePhp: (code: string, context: ExecutionContext): Promise<ExecutionResult> =>
    ipcRenderer.invoke('php:execute', code, context),

  openProjectDialog: (): Promise<string | null> => ipcRenderer.invoke('project:open-dialog')
}

contextBridge.exposeInMainWorld('electronAPI', api)
