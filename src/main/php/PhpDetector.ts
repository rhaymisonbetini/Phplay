import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface PhpBinary {
  path: string
  version: string
}

const PHP_BINARY_NAMES = [
  'php',
  'php8',
  'php8.3',
  'php8.2',
  'php8.1',
  'php8.0',
  'php7.4',
  'php7.3'
]

export class PhpDetector {
  async detect(): Promise<PhpBinary[]> {
    const results = await Promise.allSettled(PHP_BINARY_NAMES.map((name) => this.resolvePhp(name)))

    const found = new Map<string, PhpBinary>()

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        found.set(result.value.path, result.value)
      }
    }

    return Array.from(found.values())
  }

  private async resolvePhp(name: string): Promise<PhpBinary | null> {
    try {
      const { stdout: pathOutput } = await execAsync(`which ${name}`)
      const resolvedPath = pathOutput.trim()
      if (!resolvedPath) return null

      const { stdout: versionOutput } = await execAsync(`${resolvedPath} -v`)
      const version = this.parseVersion(versionOutput)

      return version ? { path: resolvedPath, version } : null
    } catch {
      return null
    }
  }

  private parseVersion(output: string): string | null {
    const match = output.match(/PHP (\d+\.\d+\.\d+)/)
    return match ? match[1] : null
  }
}
