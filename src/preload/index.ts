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
    ipcRenderer.invoke('project:detect-framework', projectPath),

  saveSession: (projectPath: string, sessions: unknown): Promise<void> =>
    ipcRenderer.invoke('session:save', projectPath, sessions),

  loadSession: (projectPath: string): Promise<unknown> =>
    ipcRenderer.invoke('session:load', projectPath),

  listRecentProjects: (): Promise<unknown[]> => ipcRenderer.invoke('recent:list'),

  addRecentProject: (project: { path: string; name: string; framework: string }): Promise<void> =>
    ipcRenderer.invoke('recent:add', project),

  removeRecentProject: (projectPath: string): Promise<void> =>
    ipcRenderer.invoke('recent:remove', projectPath)
}

contextBridge.exposeInMainWorld('electronAPI', api)
