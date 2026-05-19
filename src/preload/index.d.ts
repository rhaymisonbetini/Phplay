import type { ExecutionContext, ExecutionResult } from '../main/executor/types'
import type { PhpBinary } from '../main/php/PhpDetector'

declare global {
  interface Window {
    electronAPI: {
      detectPhp: () => Promise<PhpBinary[]>
      executePhp: (code: string, context: ExecutionContext) => Promise<ExecutionResult>
      openProjectDialog: () => Promise<string | null>
    }
  }
}
