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
      openProjectDialog: () => Promise<string | null>
      detectFramework: (projectPath: string) => Promise<ProjectInfo>
    }
  }
}
