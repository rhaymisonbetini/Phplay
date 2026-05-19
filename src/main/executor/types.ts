export type Framework = 'laravel' | 'symfony' | 'wordpress' | 'plain'

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

export interface Executor {
  execute(code: string, context: ExecutionContext): Promise<ExecutionResult>
  isAvailable(): Promise<boolean>
}
