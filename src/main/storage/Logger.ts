import { appendFile, mkdir, rename, stat } from 'fs/promises'
import { dirname } from 'path'

type LogLevel = 'info' | 'error' | 'debug'

const MAX_SIZE_BYTES = 1_000_000 // 1 MB — rotate when exceeded

export class Logger {
  private readonly path: string
  private rotating = false

  constructor(logPath: string) {
    this.path = logPath
  }

  info(message: string): void {
    this.write('info', message)
  }

  error(message: string): void {
    this.write('error', message)
  }

  debug(message: string): void {
    this.write('debug', message)
  }

  private write(level: LogLevel, message: string): void {
    const ts = new Date().toISOString()
    const line = `${ts} [${level.toUpperCase()}] ${message}\n`
    this.ensureAndAppend(line).catch(() => { /* best-effort */ })
  }

  private async ensureAndAppend(line: string): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true })
    await appendFile(this.path, line, 'utf8')
    await this.rotateIfNeeded()
  }

  private async rotateIfNeeded(): Promise<void> {
    if (this.rotating) return
    try {
      const s = await stat(this.path)
      if (s.size < MAX_SIZE_BYTES) return
      this.rotating = true
      await rename(this.path, `${this.path}.1`)
    } catch {
      // file may not exist yet — ignore
    } finally {
      this.rotating = false
    }
  }
}
