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
    ipcRenderer.invoke('recent:remove', projectPath),

  // ── Intelephense LSP ────────────────────────────────────────────────────────
  lspStart: (projectPath: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('lsp:start', projectPath),

  lspStop: (): Promise<void> => ipcRenderer.invoke('lsp:stop'),

  lspIsReady: (): Promise<boolean> => ipcRenderer.invoke('lsp:isReady'),

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

  lspPathToUri: (path: string): Promise<string> => ipcRenderer.invoke('lsp:pathToUri', path)
}

contextBridge.exposeInMainWorld('electronAPI', api)
