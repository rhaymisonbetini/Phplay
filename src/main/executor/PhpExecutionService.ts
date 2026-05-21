import { spawn, type ChildProcess } from 'child_process'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { LaravelBootstrap } from '../project/LaravelBootstrap'
import { PlainPhpWrapper } from '../project/PlainPhpWrapper'
import type { ExecutionContext, ExecutionResult } from './types'

export type ExecutionState = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout'

export interface ExecutionHandle {
  executionId: string
}

interface ActiveExecution {
  proc: ChildProcess
  tmpFile: string
  timer: ReturnType<typeof setTimeout>
}

const DEFAULT_TIMEOUT_MS = 30_000
const laravelBootstrap = new LaravelBootstrap()
const plainWrapper = new PlainPhpWrapper()

export class PhpExecutionService {
  private active = new Map<string, ActiveExecution>()

  async run(
    code: string,
    context: ExecutionContext,
    onChunk?: (executionId: string, chunk: string, stream: 'stdout' | 'stderr') => void
  ): Promise<{ executionId: string; result: Promise<ExecutionResult & { state: ExecutionState }> }> {
    const executionId = randomUUID()
    const tmpFile = join(tmpdir(), `phplay-${executionId}.php`)

    const finalCode =
      context.framework === 'laravel' && context.bootstrapPath
        ? laravelBootstrap.generate(context.projectPath, code, context.bootstrapPath)
        : plainWrapper.generate(code)

    await writeFile(tmpFile, finalCode, 'utf-8')

    const result = this.spawnProcess(executionId, tmpFile, context, onChunk)
    return { executionId, result }
  }

  cancel(executionId: string): boolean {
    const active = this.active.get(executionId)
    if (!active) return false
    clearTimeout(active.timer)
    active.proc.kill('SIGTERM')
    return true
  }

  private spawnProcess(
    executionId: string,
    tmpFile: string,
    context: ExecutionContext,
    onChunk?: (executionId: string, chunk: string, stream: 'stdout' | 'stderr') => void
  ): Promise<ExecutionResult & { state: ExecutionState }> {
    return new Promise((resolve) => {
      const startTime = Date.now()
      const stdout: string[] = []
      const stderr: string[] = []
      let state: ExecutionState = 'running'

      const timeoutMs = context.timeoutMs ?? DEFAULT_TIMEOUT_MS
      const proc = spawn(context.phpBinary, [tmpFile], {
        cwd: context.projectPath || undefined
      })

      const timer = setTimeout(() => {
        state = 'timeout'
        proc.kill('SIGTERM')
      }, timeoutMs)

      this.active.set(executionId, { proc, tmpFile, timer })

      proc.stdout.on('data', (chunk: Buffer) => {
        const str = chunk.toString()
        stdout.push(str)
        onChunk?.(executionId, str, 'stdout')
      })

      proc.stderr.on('data', (chunk: Buffer) => {
        const str = chunk.toString()
        stderr.push(str)
        onChunk?.(executionId, str, 'stderr')
      })

      const finish = (exitCode: number | null, signal: string | null) => {
        clearTimeout(timer)
        this.active.delete(executionId)
        unlink(tmpFile).catch(() => undefined)

        const executionTimeMs = Date.now() - startTime
        const stderrStr = stderr.join('')

        if (state === 'running') {
          state = signal === 'SIGTERM' ? 'cancelled' : exitCode === 0 ? 'completed' : 'failed'
        }

        resolve({
          stdout: stdout.join(''),
          stderr: stderrStr,
          exitCode: exitCode ?? -1,
          executionTimeMs,
          memoryUsedKb: this.parseMemoryUsage(stderrStr),
          state
        })
      }

      proc.on('close', finish)
      proc.on('error', (err) => {
        clearTimeout(timer)
        this.active.delete(executionId)
        unlink(tmpFile).catch(() => undefined)
        resolve({
          stdout: '',
          stderr: err.message,
          exitCode: -1,
          executionTimeMs: Date.now() - startTime,
          memoryUsedKb: 0,
          state: 'failed',
          error: { message: err.message, file: '', line: 0, trace: '' }
        })
      })
    })
  }

  private parseMemoryUsage(stderr: string): number {
    const match = stderr.match(/memory_get_peak_usage.*?(\d+)/)
    return match ? Math.round(parseInt(match[1]) / 1024) : 0
  }
}
