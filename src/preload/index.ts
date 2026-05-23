import { contextBridge, ipcRenderer } from 'electron'
import type { ExecutionContext, ExecutionResult } from '../main/executor/types'
import type { PhpBinary } from '../main/php/PhpDetector'
import type { ProjectInfo } from '../main/project/FrameworkDetector'

const api = {
  detectPhp: (): Promise<PhpBinary[]> => ipcRenderer.invoke('php:detect'),

  executePhp: (code: string, context: ExecutionContext): Promise<ExecutionResult> =>
    ipcRenderer.invoke('php:execute', code, context),

  cancelExecution: (executionId: string): Promise<boolean> =>
    ipcRenderer.invoke('execution:cancel', executionId),

  onExecutionOutput: (cb: (payload: { executionId: string; chunk: string; stream: 'stdout' | 'stderr' }) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, payload: { executionId: string; chunk: string; stream: 'stdout' | 'stderr' }) => cb(payload)
    ipcRenderer.on('execution:output', handler)
    return () => ipcRenderer.removeListener('execution:output', handler)
  },

  onExecutionStarted: (cb: (payload: { executionId: string }) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, payload: { executionId: string }) => cb(payload)
    ipcRenderer.on('execution:started', handler)
    return () => ipcRenderer.removeListener('execution:started', handler)
  },

  openProjectDialog: (): Promise<string | null> => ipcRenderer.invoke('project:open-dialog'),

  saveOutputFile: (content: string, defaultName: string): Promise<boolean> =>
    ipcRenderer.invoke('file:save-dialog', content, defaultName),

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
    ipcRenderer.invoke('recent:remove', projectPath),

  // ── Intelephense LSP ────────────────────────────────────────────────────────
  laravelDiscover: (projectPath: string, phpBinary: string): Promise<unknown> =>
    ipcRenderer.invoke('laravel:discover', projectPath, phpBinary),

  lspStart: (projectPath: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('lsp:start', projectPath),

  lspStop: (): Promise<void> => ipcRenderer.invoke('lsp:stop'),

  lspRestart: (): Promise<{ ok: boolean; error?: string }> => ipcRenderer.invoke('lsp:restart'),

  lspIsReady: (): Promise<boolean> => ipcRenderer.invoke('lsp:isReady'),

  lspGetState: (): Promise<string> => ipcRenderer.invoke('lsp:getState'),

  onLspStateChanged: (cb: (payload: { state: string; message?: string }) => void): void => {
    ipcRenderer.on('lsp:stateChanged', (_event, payload) => cb(payload))
  },

  lspDidOpen: (uri: string, text: string, version: number): Promise<void> =>
    ipcRenderer.invoke('lsp:didOpen', uri, text, version),

  lspDidChange: (uri: string, text: string, version: number): Promise<void> =>
    ipcRenderer.invoke('lsp:didChange', uri, text, version),

  lspDidClose: (uri: string): Promise<void> => ipcRenderer.invoke('lsp:didClose', uri),

  lspCompletion: (uri: string, line: number, character: number): Promise<unknown> =>
    ipcRenderer.invoke('lsp:completion', uri, line, character),

  lspHover: (uri: string, line: number, character: number): Promise<unknown> =>
    ipcRenderer.invoke('lsp:hover', uri, line, character),

  lspSignatureHelp: (uri: string, line: number, character: number): Promise<unknown> =>
    ipcRenderer.invoke('lsp:signatureHelp', uri, line, character),

  lspPathToUri: (path: string): Promise<string> => ipcRenderer.invoke('lsp:pathToUri', path),

  // History
  historyList: (projectPath: string): Promise<unknown[]> =>
    ipcRenderer.invoke('history:list', projectPath),

  historyRemove: (projectPath: string, id: string): Promise<void> =>
    ipcRenderer.invoke('history:remove', projectPath, id),

  historyToggleFavorite: (projectPath: string, id: string): Promise<boolean> =>
    ipcRenderer.invoke('history:toggleFavorite', projectPath, id),

  // Menu events from main process
  onMenuOpenProject: (cb: () => void): void => {
    ipcRenderer.on('menu:open-project', cb)
  }
}

contextBridge.exposeInMainWorld('electronAPI', api)
