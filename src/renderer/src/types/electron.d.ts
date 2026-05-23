// Renderer-side type declarations for the Electron contextBridge API.
// Mirror of the types in src/main — kept separate to avoid renderer depending on Node.js types.

export type Framework = 'laravel' | 'symfony' | 'wordpress' | 'plain'

export interface PhpBinary {
  path: string
  version: string
}

export interface ExecutionContext {
  projectPath: string
  phpBinary: string
  framework: Framework
  bootstrapPath?: string
  timeoutMs?: number
}

export interface ExecutionError {
  message: string
  file: string
  line: number
  trace: string
}

export interface ExecutionResult {
  stdout: string
  stderr: string
  exitCode: number
  executionTimeMs: number
  memoryUsedKb: number
  error?: ExecutionError
}

export interface ProjectInfo {
  framework: Framework
  version: string | null
  bootstrapPath: string | null
  hasVendor: boolean
}

declare global {
  interface Window {
    electronAPI: {
      detectPhp: () => Promise<PhpBinary[]>
      executePhp: (code: string, context: ExecutionContext) => Promise<ExecutionResult>
      cancelExecution: (executionId: string) => Promise<boolean>
      onExecutionOutput: (cb: (payload: { executionId: string; chunk: string; stream: 'stdout' | 'stderr' }) => void) => (() => void)
      onExecutionStarted: (cb: (payload: { executionId: string }) => void) => (() => void)
      openProjectDialog: () => Promise<string | null>
      saveOutputFile: (content: string, defaultName: string) => Promise<boolean>
      detectFramework: (projectPath: string) => Promise<ProjectInfo>
      saveSession: (projectPath: string, sessions: unknown) => Promise<void>
      loadSession: (projectPath: string) => Promise<unknown>
      listRecentProjects: () => Promise<RecentProject[]>
      addRecentProject: (project: Omit<RecentProject, 'openedAt'>) => Promise<void>
      removeRecentProject: (projectPath: string) => Promise<void>
      laravelDiscover: (projectPath: string, phpBinary: string) => Promise<unknown>
      // Intelephense LSP
      lspStart: (projectPath: string) => Promise<{ ok: boolean; error?: string }>
      lspStop: () => Promise<void>
      lspRestart: () => Promise<{ ok: boolean; error?: string }>
      lspIsReady: () => Promise<boolean>
      lspGetState: () => Promise<string>
      onLspStateChanged: (cb: (payload: { state: string; message?: string }) => void) => void
      lspDidOpen: (uri: string, text: string, version: number) => Promise<void>
      lspDidChange: (uri: string, text: string, version: number) => Promise<void>
      lspDidClose: (uri: string) => Promise<void>
      lspCompletion: (uri: string, line: number, character: number) => Promise<unknown>
      lspHover: (uri: string, line: number, character: number) => Promise<unknown>
      lspSignatureHelp: (uri: string, line: number, character: number) => Promise<unknown>
      lspPathToUri: (path: string) => Promise<string>
      onMenuOpenProject: (cb: () => void) => void
    }
  }
}

export interface RecentProject {
  path: string
  name: string
  framework: string
  openedAt: number
}
