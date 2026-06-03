import { SshTransport } from './SshTransport'
import { RemotePhpWrapper } from './RemotePhpWrapper'
import type { SshConnectionConfig } from './types'
import type { ExecutionResult } from '../executor/types'

export type ChunkCallback = (chunk: string, stream: 'stdout' | 'stderr') => void

export class SshExecutor {
  private transport: SshTransport | null = null
  private cancelled = false

  async run(
    config: SshConnectionConfig,
    code: string,
    onChunk: ChunkCallback,
    timeoutMs = 30_000
  ): Promise<ExecutionResult> {
    this.cancelled = false
    const transport = new SshTransport()
    this.transport = transport

    const startTime = Date.now()
    let stdout = ''
    let stderr = ''

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('EXECUTION_TIMEOUT')), timeoutMs)
    )

    try {
      await Promise.race([transport.connect(config), timeout])

      const phpBinary = config.phpBinary || 'php'
      const command = RemotePhpWrapper.buildCommand(phpBinary, code)

      await Promise.race([
        transport.exec(command, (chunk, stream) => {
          if (this.cancelled) return
          if (stream === 'stdout') {
            stdout += chunk
          } else {
            stderr += chunk
          }
          onChunk(chunk, stream)
        }),
        timeout
      ])

      const executionTimeMs = Date.now() - startTime
      return {
        stdout,
        stderr,
        exitCode: 0,
        executionTimeMs,
        memoryUsedKb: 0
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      const executionTimeMs = Date.now() - startTime

      return {
        stdout,
        stderr: stderr + (stderr ? '\n' : '') + message,
        exitCode: 1,
        executionTimeMs,
        memoryUsedKb: 0
      }
    } finally {
      transport.disconnect()
      this.transport = null
    }
  }

  cancel(): void {
    this.cancelled = true
    this.transport?.disconnect()
    this.transport = null
  }
}
