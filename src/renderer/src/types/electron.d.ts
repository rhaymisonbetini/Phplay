// Renderer-side type declarations for the Electron contextBridge API.
// Mirror of the types in src/main — kept separate to avoid renderer depending on Node.js types.

export type Framework = 'laravel' | 'symfony' | 'wordpress' | 'plain'

export interface LspDiagnostic {
  range: { start: { line: number; character: number }; end: { line: number; character: number } }
  severity?: number
  message: string
  source?: string
}

export interface LspLocation {
  uri: string
  range: { start: { line: number; character: number }; end: { line: number; character: number } }
}

export interface LspCodeAction {
  title: string
  kind?: string
  edit?: {
    changes?: Record<string, Array<{ range: { start: { line: number; character: number }; end: { line: number; character: number } }; newText: string }>>
  }
}

export interface AiCompletionRequest {
  textBeforeCursor: string
  textAfterCursor: string
  language: string
  cursorPosition: { lineNumber: number; column: number }
}

export interface AiProjectContext {
  framework?: 'laravel' | 'symfony' | 'wordpress' | 'plain'
  phpVersion?: string
  projectPath?: string
  currentFile?: string
}

export interface SshConnectionConfig {
  id: string
  name: string
  color: string
  host: string
  port: number
  username: string
  authType: 'password' | 'key'
  password?: string
  privateKeyPath?: string
  passphrase?: string
  remotePath: string
  phpBinary?: string
  framework?: 'laravel' | 'symfony' | 'wordpress' | 'plain'
}

export type SshSyncPhase = 'connecting' | 'archiving' | 'downloading' | 'extracting' | 'done' | 'error'

export interface SshSyncProgress {
  connectionId: string
  phase: SshSyncPhase
  percent?: number
  message?: string
  transferredBytes?: number
  totalBytes?: number
}

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
      onLspDiagnostics: (cb: (params: { uri: string; diagnostics: LspDiagnostic[] }) => void) => (() => void)
      lspDefinition: (uri: string, line: number, character: number) => Promise<{ ok: boolean; data?: LspLocation[]; error?: unknown }>
      lspReferences: (uri: string, line: number, character: number) => Promise<{ ok: boolean; data?: LspLocation[]; error?: unknown }>
      lspRename: (uri: string, line: number, character: number, newName: string) => Promise<{ ok: boolean; data?: unknown; error?: unknown }>
      lspCodeAction: (uri: string, range: unknown, diagnostics: unknown[]) => Promise<{ ok: boolean; data?: LspCodeAction[]; error?: unknown }>
      // History
      historyList: (projectPath: string) => Promise<HistoryEntry[]>
      historyRemove: (projectPath: string, id: string) => Promise<void>
      historyToggleFavorite: (projectPath: string, id: string) => Promise<boolean>
      onMenuOpenProject: (cb: () => void) => void
      // Saved Snippets
      snippetList: (projectPath: string) => Promise<SavedSnippet[]>
      snippetSave: (projectPath: string, name: string, code: string) => Promise<SavedSnippet>
      snippetDelete: (projectPath: string, id: string) => Promise<void>
      // AI Autocomplete
      aiGetCompletion: (request: AiCompletionRequest, projectContext: AiProjectContext) => Promise<{ ok: boolean; data?: string | null; error?: { code: string; message: string } }>
      aiSetAutocompleteEnabled: (enabled: boolean) => Promise<void>
      aiGetAutocompleteEnabled: () => Promise<boolean>
      // AI Assistant
      aiSetKey: (key: string) => Promise<void>
      aiGetKey: () => Promise<string>
      aiSetOpenAiKey: (key: string) => Promise<void>
      aiGetOpenAiKey: () => Promise<string>
      aiSetProvider: (provider: 'anthropic' | 'openai') => Promise<void>
      aiGetProvider: () => Promise<'anthropic' | 'openai'>
      aiChat: (messages: { role: 'user' | 'assistant'; content: string }[], systemPrompt: string) => Promise<unknown>
      onAiChunk: (cb: (payload: { text: string }) => void) => (() => void)
      onAiDone: (cb: () => void) => (() => void)
      onAiError: (cb: (payload: { message: string }) => void) => (() => void)
      // SSH Connections
      sshList: () => Promise<SshConnectionConfig[]>
      sshGet: (id: string) => Promise<SshConnectionConfig | null>
      sshSave: (config: SshConnectionConfig) => Promise<SshConnectionConfig>
      sshDelete: (id: string) => Promise<void>
      sshTest: (config: SshConnectionConfig) => Promise<{ ok: boolean; data?: { connected: boolean; phpBinary: string; phpVersion: string; framework: 'laravel' | 'symfony' | 'wordpress' | 'plain' }; error?: { code: string; message: string } }>
      sshExecute: (code: string, connectionId: string) => Promise<ExecutionResult>
      sshCancel: () => Promise<boolean>
      sshSyncWorkspace: (connectionId: string, force?: boolean) => Promise<{ ok: boolean; data?: { localPath: string; cached: boolean }; error?: { code: string; message: string } }>
      sshGetWorkspacePath: (connectionId: string) => Promise<string | null>
      onSshSyncProgress: (cb: (payload: SshSyncProgress) => void) => (() => void)
    }
  }
}

export interface RecentProject {
  path: string
  name: string
  framework: string
  openedAt: number
}

export interface HistoryEntry {
  id: string
  code: string
  executedAt: string
  projectPath: string
  durationMs: number
  favorite: boolean
}

export interface SavedSnippet {
  id: string
  name: string
  code: string
  savedAt: number
}
