import { describe, it, expect, vi, afterEach } from 'vitest'
import { EventEmitter } from 'events'
import { PhpExecutionService } from '../PhpExecutionService'

// Minimal mock for a child process
function makeProc(opts: { exitCode?: number; signal?: string; stdout?: string; stderr?: string } = {}) {
  const proc = new EventEmitter() as EventEmitter & {
    stdin: { write: ReturnType<typeof vi.fn> }
    stdout: EventEmitter
    stderr: EventEmitter
    kill: ReturnType<typeof vi.fn>
  }
  proc.stdin = { write: vi.fn() }
  proc.stdout = new EventEmitter()
  proc.stderr = new EventEmitter()
  proc.kill = vi.fn((signal?: string) => {
    setImmediate(() => proc.emit('close', null, signal ?? 'SIGTERM'))
    return true
  })

  if (opts.stdout !== undefined) {
    setImmediate(() => {
      proc.stdout.emit('data', Buffer.from(opts.stdout!))
      proc.emit('close', opts.exitCode ?? 0, null)
    })
  }

  if (opts.stderr !== undefined) {
    setImmediate(() => {
      proc.stderr.emit('data', Buffer.from(opts.stderr!))
      if (opts.stdout === undefined) proc.emit('close', opts.exitCode ?? 1, null)
    })
  }

  return proc
}

vi.mock('child_process', () => ({
  spawn: vi.fn()
}))

vi.mock('fs/promises', () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  unlink: vi.fn().mockResolvedValue(undefined)
}))

describe('PhpExecutionService', () => {
  afterEach(() => vi.clearAllMocks())

  it('returns stdout from a successful execution', async () => {
    const { spawn } = await import('child_process')
    const proc = makeProc({ stdout: 'Hello Phplay!', exitCode: 0 })
    vi.mocked(spawn).mockReturnValue(proc as unknown as ReturnType<typeof spawn>)

    const service = new PhpExecutionService()
    const { result } = await service.run('<?php echo "Hello Phplay!";', {
      projectPath: '/tmp',
      phpBinary: '/usr/bin/php',
      framework: 'plain'
    })

    const res = await result
    expect(res.stdout).toBe('Hello Phplay!')
    expect(res.state).toBe('completed')
    expect(res.exitCode).toBe(0)
  })

  it('captures stderr output', async () => {
    const { spawn } = await import('child_process')
    const proc = makeProc({ stderr: 'Parse error: line 1', exitCode: 255 })
    vi.mocked(spawn).mockReturnValue(proc as unknown as ReturnType<typeof spawn>)

    const service = new PhpExecutionService()
    const { result } = await service.run('<?php syntax error', {
      projectPath: '/tmp',
      phpBinary: '/usr/bin/php',
      framework: 'plain'
    })

    const res = await result
    expect(res.stderr).toBe('Parse error: line 1')
    expect(res.state).toBe('failed')
  })

  it('emits stdout chunks via onChunk callback', async () => {
    const { spawn } = await import('child_process')
    const proc = makeProc({ stdout: 'chunk1', exitCode: 0 })
    vi.mocked(spawn).mockReturnValue(proc as unknown as ReturnType<typeof spawn>)

    const service = new PhpExecutionService()
    const chunks: string[] = []
    const { result } = await service.run('<?php echo "chunk1";', {
      projectPath: '/tmp',
      phpBinary: '/usr/bin/php',
      framework: 'plain'
    }, (_id, chunk) => chunks.push(chunk))

    await result
    expect(chunks).toContain('chunk1')
  })

  it('cancel() kills the process and returns true', async () => {
    const { spawn } = await import('child_process')
    const proc = makeProc()
    vi.mocked(spawn).mockReturnValue(proc as unknown as ReturnType<typeof spawn>)

    const service = new PhpExecutionService()
    const { executionId, result } = await service.run('<?php sleep(30);', {
      projectPath: '/tmp',
      phpBinary: '/usr/bin/php',
      framework: 'plain'
    })

    const cancelled = service.cancel(executionId)
    expect(cancelled).toBe(true)
    expect(proc.kill).toHaveBeenCalled()

    const res = await result
    expect(res.state).toBe('cancelled')
  })

  it('cancel() returns false for unknown executionId', () => {
    const service = new PhpExecutionService()
    expect(service.cancel('non-existent-id')).toBe(false)
  })

  it('times out and kills process after timeoutMs', async () => {
    vi.useFakeTimers()
    const { spawn } = await import('child_process')
    const proc = makeProc()
    vi.mocked(spawn).mockReturnValue(proc as unknown as ReturnType<typeof spawn>)

    const service = new PhpExecutionService()
    const { result } = await service.run('<?php sleep(999);', {
      projectPath: '/tmp',
      phpBinary: '/usr/bin/php',
      framework: 'plain',
      timeoutMs: 100
    })

    vi.advanceTimersByTime(200)

    vi.useRealTimers()
    // Drain any pending microtasks/setImmediates
    await new Promise((r) => setImmediate(r))

    const res = await result
    expect(proc.kill).toHaveBeenCalled()
    expect(res.state).toBe('timeout')
  })
})
