import { spawn, type ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import { pathToFileURL } from 'url'
import type { LanguageServerState, LspStateChangedPayload } from './types'

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (reason: Error) => void
  timer: ReturnType<typeof setTimeout>
}

/**
 * Manages a single intelephense Language Server process.
 *
 * Communication is JSON-RPC 2.0 over stdio (Content-Length framed).
 * IPC handlers in handlers.ts expose this to the renderer process.
 */
export class IntelephenseLsp extends EventEmitter {
  private proc: ChildProcess | null = null
  private buf = ''
  private pending = new Map<number, PendingRequest>()
  private seq = 0
  private ready = false
  private _state: LanguageServerState = 'stopped'

  private setState(state: LanguageServerState, message?: string): void {
    this._state = state
    this.ready = state === 'ready'
    const payload: LspStateChangedPayload = { state, message }
    this.emit('stateChanged', payload)
  }

  start(_storagePath: string): void {
    if (this.proc) return

    this.setState('starting')
    const bin = require.resolve('intelephense/lib/intelephense.js')
    this.proc = spawn(process.execPath, [bin, '--stdio'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    })

    this.proc.stdout!.on('data', (chunk: Buffer) => {
      this.buf += chunk.toString('utf8')
      this.drain()
    })

    this.proc.stderr!.on('data', (chunk: Buffer) => {
      const line = chunk.toString().trim()
      if (line) this.emit('log', line)
    })

    this.proc.on('exit', (code) => {
      const wasReady = this._state === 'ready'
      this.proc = null
      for (const [, req] of this.pending) {
        clearTimeout(req.timer)
        req.reject(new Error('LSP process exited'))
      }
      this.pending.clear()
      if (!wasReady || code !== 0) {
        this.setState('error', `Process exited with code ${code ?? 'unknown'}`)
      } else {
        this.setState('stopped')
      }
    })
  }

  // ── LSP protocol framing ──────────────────────────────────────────────────

  private drain(): void {
    while (true) {
      const sep = this.buf.indexOf('\r\n\r\n')
      if (sep === -1) break

      const header = this.buf.slice(0, sep)
      const m = header.match(/Content-Length:\s*(\d+)/i)
      if (!m) { this.buf = this.buf.slice(sep + 4); continue }

      const len = parseInt(m[1], 10)
      const bodyStart = sep + 4
      if (this.buf.length < bodyStart + len) break // wait for more data

      const body = this.buf.slice(bodyStart, bodyStart + len)
      this.buf = this.buf.slice(bodyStart + len)

      try { this.dispatch(JSON.parse(body)) } catch { /* malformed — skip */ }
    }
  }

  private dispatch(msg: { id?: number; method?: string; result?: unknown; error?: { message: string } }): void {
    if (msg.id !== undefined && this.pending.has(msg.id)) {
      const req = this.pending.get(msg.id)!
      this.pending.delete(msg.id)
      clearTimeout(req.timer)
      if (msg.error) req.reject(new Error(msg.error.message))
      else req.resolve(msg.result ?? null)
      return
    }
    // Notifications (no id)
    if (msg.method) this.emit('notification', msg)
  }

  private request(method: string, params: unknown, timeoutMs = 8000): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.proc) { reject(new Error('LSP not running')); return }
      const id = ++this.seq
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`LSP timeout: ${method}`))
      }, timeoutMs)
      this.pending.set(id, { resolve, reject, timer })
      this.write({ jsonrpc: '2.0', id, method, params })
    })
  }

  private notify(method: string, params: unknown): void {
    if (!this.proc) return
    this.write({ jsonrpc: '2.0', method, params })
  }

  private write(msg: object): void {
    const body = JSON.stringify(msg)
    const frame = `Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n${body}`
    this.proc!.stdin!.write(frame)
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  async initialize(projectPath: string, storagePath: string): Promise<void> {
    this.setState('initializing')
    const rootUri = pathToUri(projectPath)

    await this.request('initialize', {
      processId: process.pid,
      rootUri,
      workspaceFolders: [{ uri: rootUri, name: projectPath.split('/').pop() ?? 'workspace' }],
      capabilities: {
        textDocument: {
          completion: {
            dynamicRegistration: true,
            completionItem: {
              snippetSupport: true,
              documentationFormat: ['markdown', 'plaintext'],
              insertReplaceSupport: true
            },
            completionItemKind: { valueSet: range(1, 25) }
          },
          hover: { contentFormat: ['markdown', 'plaintext'] },
          signatureHelp: {
            signatureInformation: { documentationFormat: ['markdown', 'plaintext'] }
          }
        }
      },
      initializationOptions: {
        storagePath,
        clearCache: false,
        licenceKey: ''
      }
    }, 120_000) // large projects can take minutes to index on first run

    this.notify('initialized', {})
    this.setState('ready')

    // Default settings — disable diagnostics for perf, enable completions
    this.notify('workspace/didChangeConfiguration', {
      settings: {
        intelephense: {
          files: {
            maxSize: 5_000_000,
            associations: ['*.php'],
            exclude: ['**/.git/**', '**/node_modules/**']
          },
          completion: {
            insertUseDeclaration: true,
            fullyQualifyGlobalConstantsAndFunctions: false,
            triggerParameterHints: true,
            maxItems: 100
          },
          diagnostics: { enable: false },
          format: { enable: false }
        }
      }
    })
  }

  stop(): void {
    if (!this.proc) return
    try {
      this.notify('shutdown', null)
      this.notify('exit', null)
    } catch { /* ignore */ }
    this.proc.kill()
    this.proc = null
    this.setState('stopped')
  }

  getState(): LanguageServerState { return this._state }

  isReady(): boolean { return this.ready }

  // ── Document sync ─────────────────────────────────────────────────────────

  didOpen(uri: string, text: string, version: number): void {
    this.notify('textDocument/didOpen', {
      textDocument: { uri, languageId: 'php', version, text }
    })
  }

  didChange(uri: string, text: string, version: number): void {
    this.notify('textDocument/didChange', {
      textDocument: { uri, version },
      contentChanges: [{ text }]
    })
  }

  didClose(uri: string): void {
    this.notify('textDocument/didClose', { textDocument: { uri } })
  }

  // ── LSP features ──────────────────────────────────────────────────────────

  completion(uri: string, line: number, character: number): Promise<unknown> {
    if (!this.ready) return Promise.resolve(null)
    return this.request('textDocument/completion', {
      textDocument: { uri },
      position: { line, character },
      context: { triggerKind: 1 }
    }, 4_000)
  }

  hover(uri: string, line: number, character: number): Promise<unknown> {
    if (!this.ready) return Promise.resolve(null)
    return this.request('textDocument/hover', {
      textDocument: { uri },
      position: { line, character }
    }, 4_000)
  }

  signatureHelp(uri: string, line: number, character: number): Promise<unknown> {
    if (!this.ready) return Promise.resolve(null)
    return this.request('textDocument/signatureHelp', {
      textDocument: { uri },
      position: { line, character }
    }, 4_000)
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function pathToUri(path: string): string {
  return pathToFileURL(path).toString()
}

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}
