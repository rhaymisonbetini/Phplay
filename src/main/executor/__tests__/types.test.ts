import { describe, it, expect } from 'vitest'
import type { ExecutionResult, ExecutionContext } from '../types'

describe('ExecutionResult', () => {
  it('accepts a valid successful result', () => {
    const result: ExecutionResult = {
      stdout: 'Hello Phplay!',
      stderr: '',
      exitCode: 0,
      executionTimeMs: 42,
      memoryUsedKb: 1024
    }
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toBe('Hello Phplay!')
  })

  it('accepts a result with an error', () => {
    const result: ExecutionResult = {
      stdout: '',
      stderr: 'Parse error: syntax error',
      exitCode: 255,
      executionTimeMs: 5,
      memoryUsedKb: 0,
      error: {
        message: 'syntax error, unexpected token',
        file: '/tmp/phplay-test.php',
        line: 3,
        trace: ''
      }
    }
    expect(result.exitCode).not.toBe(0)
    expect(result.error?.line).toBe(3)
  })
})

describe('ExecutionContext', () => {
  it('accepts a minimal plain PHP context', () => {
    const ctx: ExecutionContext = {
      projectPath: '/home/user/project',
      phpBinary: '/usr/bin/php',
      framework: 'plain'
    }
    expect(ctx.framework).toBe('plain')
  })

  it('accepts a Laravel context with bootstrap path', () => {
    const ctx: ExecutionContext = {
      projectPath: '/home/user/laravel-app',
      phpBinary: '/usr/bin/php8.3',
      framework: 'laravel',
      bootstrapPath: '/home/user/laravel-app/bootstrap/app.php',
      timeoutMs: 60_000
    }
    expect(ctx.framework).toBe('laravel')
    expect(ctx.timeoutMs).toBe(60_000)
  })
})
