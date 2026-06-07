import { LaravelBootstrap } from '../project/LaravelBootstrap'
import { PlainPhpWrapper } from '../project/PlainPhpWrapper'

const laravelBootstrap = new LaravelBootstrap()
const plainWrapper = new PlainPhpWrapper()

export class RemotePhpWrapper {
  /**
   * Generates a shell command that:
   * 1. Writes the full PHP code (with framework bootstrap) to a remote temp file via base64
   * 2. Runs it with the configured PHP binary from the project directory
   * 3. Cleans up the temp file
   *
   * Using a temp file (vs eval) ensures __FILE__, __DIR__, and require_once all work correctly.
   */
  static buildCommand(
    phpBinary: string,
    remotePath: string,
    framework: string,
    code: string
  ): string {
    const fullCode = framework === 'laravel'
      ? laravelBootstrap.generate(remotePath, code, `${remotePath}/bootstrap/app.php`)
      : plainWrapper.generate(code)

    const encoded = Buffer.from(fullCode).toString('base64')
    const tmpFile = `/tmp/phplay-${Date.now()}.php`

    // printf is used instead of echo to avoid newline injection issues.
    // Semicolon before rm ensures cleanup even when PHP exits non-zero.
    return `printf '%s' '${encoded}' | base64 -d > ${tmpFile} && cd '${remotePath}' && ${phpBinary} ${tmpFile}; rm -f ${tmpFile}`
  }
}
