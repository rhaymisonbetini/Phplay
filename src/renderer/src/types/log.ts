export type LogCategory = 'execution' | 'lsp' | 'discovery' | 'error' | 'performance'
export type LogLevel = 'info' | 'warn' | 'error' | 'debug'

export interface LogEntry {
  id: string
  timestamp: number
  category: LogCategory
  level: LogLevel
  message: string
  detail?: string
}
