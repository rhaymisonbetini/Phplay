import { spawn } from 'child_process'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import type { Executor, ExecutionContext, ExecutionResult } from './types'
import { LaravelBootstrap } from '../project/LaravelBootstrap'
import { PlainPhpWrapper } from '../project/PlainPhpWrapper'

const DEFAULT_TIMEOUT_MS = 30_000
const laravelBootstrap = new LaravelBootstrap()
const plainWrapper = new PlainPhpWrapper()

export class LocalExecutor implements Executor {
  async isAvailable(): Promise<boolean> {
    return true
  }

  async execute(code: string, context: ExecutionContext): Promise<ExecutionResult> {
    const tmpFile = join(tmpdir(), `phplay-${randomUUID()}.php`)

    let finalCode: string
    if (context.framework === 'laravel' && context.bootstrapPath) {
      finalCode = laravelBootstrap.generate(context.projectPath, code, context.bootstrapPath)
    } else {
      finalCode = plainWrapper.generate(code)
    }

    try {
      await writeFile(tmpFile, finalCode, 'utf-8')
      return await this.spawnPhp(tmpFile, context)
    } finally {
      await unlink(tmpFile).catch(() => undefined)
    }
  }

  private spawnPhp(filePath: string, context: ExecutionContext): Promise<ExecutionResult> {
    return new Promise((resolve) => {
      const startTime = Date.now()
      const stdout: string[] = []
      const stderr: string[] = []

      const timeout = context.timeoutMs ?? DEFAULT_TIMEOUT_MS

      const proc = spawn(context.phpBinary, [filePath], {
        cwd: context.projectPath || undefined,
        timeout
      })

      proc.stdout.on('data', (chunk: Buffer) => stdout.push(chunk.toString()))
      proc.stderr.on('data', (chunk: Buffer) => stderr.push(chunk.toString()))

      proc.on('close', (exitCode) => {
        const executionTimeMs = Date.now() - startTime
        const stderrStr = stderr.join('')

        resolve({
          stdout: stdout.join(''),
          stderr: stderrStr,
          exitCode: exitCode ?? -1,
          executionTimeMs,
          memoryUsedKb: this.parseMemoryUsage(stderrStr)
        })
      })

      proc.on('error', (err) => {
        resolve({
          stdout: '',
          stderr: err.message,
          exitCode: -1,
          executionTimeMs: Date.now() - startTime,
          memoryUsedKb: 0,
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
