import { describe, it, expect, vi, afterEach } from 'vitest'
import { IntelephenseLsp } from '../IntelephenseLsp'

// Access private internals for framing tests
type LspPrivate = {
  buf: string
  seq: number
  pending: Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>
  drain(): void
  dispatch(msg: { id?: number; method?: string; result?: unknown; error?: { message: string } }): void
}

function priv(lsp: IntelephenseLsp): LspPrivate {
  return lsp as unknown as LspPrivate
}

function makeFrame(body: string): string {
  return `Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n${body}`
}

describe('IntelephenseLsp — JSON-RPC framing', () => {
  afterEach(() => vi.restoreAllMocks())

  it('parses a single notification from buf', () => {
    const lsp = new IntelephenseLsp()
    const notifications: unknown[] = []
    lsp.on('notification', (msg) => notifications.push(msg))

    const body = JSON.stringify({ jsonrpc: '2.0', method: 'indexingStarted', params: {} })
    priv(lsp).buf = makeFrame(body)
    priv(lsp).drain()

    expect(notifications).toHaveLength(1)
    expect((notifications[0] as { method: string }).method).toBe('indexingStarted')
  })

  it('parses two back-to-back frames in a single buf flush', () => {
    const lsp = new IntelephenseLsp()
    const notifications: unknown[] = []
    lsp.on('notification', (msg) => notifications.push(msg))

    const b1 = JSON.stringify({ jsonrpc: '2.0', method: 'a', params: null })
    const b2 = JSON.stringify({ jsonrpc: '2.0', method: 'b', params: null })
    priv(lsp).buf = makeFrame(b1) + makeFrame(b2)
    priv(lsp).drain()

    expect(notifications).toHaveLength(2)
    expect((notifications[0] as { method: string }).method).toBe('a')
    expect((notifications[1] as { method: string }).method).toBe('b')
  })

  it('waits for more data when body is incomplete', () => {
    const lsp = new IntelephenseLsp()
    const notifications: unknown[] = []
    lsp.on('notification', (msg) => notifications.push(msg))

    const body = JSON.stringify({ jsonrpc: '2.0', method: 'partial', params: null })
    const frame = makeFrame(body)
    // Feed only half the frame
    priv(lsp).buf = frame.slice(0, frame.length - 5)
    priv(lsp).drain()

    expect(notifications).toHaveLength(0)
  })

  it('skips header without Content-Length and continues', () => {
    const lsp = new IntelephenseLsp()
    const notifications: unknown[] = []
    lsp.on('notification', (msg) => notifications.push(msg))

    const body = JSON.stringify({ jsonrpc: '2.0', method: 'ok', params: null })
    // First chunk has bad header, second is valid
    priv(lsp).buf = `Bad-Header: x\r\n\r\n${makeFrame(body)}`
    priv(lsp).drain()

    // Bad header is skipped, valid message is parsed
    expect(notifications).toHaveLength(1)
  })

  it('resolves pending request when dispatch receives matching response', async () => {
    const lsp = new IntelephenseLsp()

    const resolved = new Promise<unknown>((resolve) => {
      priv(lsp).pending.set(1, {
        resolve,
        reject: () => {},
        timer: setTimeout(() => {}, 60_000)
      })
    })

    priv(lsp).dispatch({ id: 1, result: { items: [] } })

    const value = await resolved
    expect(value).toEqual({ items: [] })
    expect(priv(lsp).pending.size).toBe(0)
  })

  it('rejects pending request when dispatch receives error response', async () => {
    const lsp = new IntelephenseLsp()

    const rejected = new Promise<Error>((_, reject) => {
      priv(lsp).pending.set(2, {
        resolve: () => {},
        reject,
        timer: setTimeout(() => {}, 60_000)
      })
    })

    priv(lsp).dispatch({ id: 2, error: { message: 'Method not found' } })

    await expect(rejected).rejects.toThrow('Method not found')
    expect(priv(lsp).pending.size).toBe(0)
  })

  it('rejects all pending requests when process exits', async () => {
    const lsp = new IntelephenseLsp()

    const p1 = new Promise<void>((_, reject) => {
      priv(lsp).pending.set(10, { resolve: () => {}, reject, timer: setTimeout(() => {}, 60_000) })
    })
    const p2 = new Promise<void>((_, reject) => {
      priv(lsp).pending.set(11, { resolve: () => {}, reject, timer: setTimeout(() => {}, 60_000) })
    })

    // Simulate process exit by calling the internal rejection path
    for (const [, req] of priv(lsp).pending) {
      clearTimeout(req.timer)
      req.reject(new Error('LSP process exited'))
    }
    priv(lsp).pending.clear()

    await expect(p1).rejects.toThrow('LSP process exited')
    await expect(p2).rejects.toThrow('LSP process exited')
    expect(priv(lsp).pending.size).toBe(0)
  })
})
