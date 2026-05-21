import { spawn } from 'child_process'

export class ArtisanRunner {
  constructor(
    private readonly phpBinary: string,
    private readonly projectPath: string,
    private readonly timeoutMs = 15_000
  ) {}

  run(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn(this.phpBinary, ['artisan', ...args], {
        cwd: this.projectPath,
        env: { ...process.env }
      })

      const timer = setTimeout(() => {
        proc.kill()
        reject(new Error(`artisan ${args.join(' ')} timed out`))
      }, this.timeoutMs)

      let out = ''
      let err = ''
      proc.stdout.on('data', (d: Buffer) => { out += d.toString() })
      proc.stderr.on('data', (d: Buffer) => { err += d.toString() })

      proc.on('close', (code) => {
        clearTimeout(timer)
        if (code === 0) resolve(out)
        else reject(new Error(`artisan exited ${code}: ${err.slice(0, 200)}`))
      })
    })
  }
}
