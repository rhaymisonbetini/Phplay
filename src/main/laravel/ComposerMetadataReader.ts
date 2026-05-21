import { readFile } from 'fs/promises'
import { join } from 'path'

export interface ComposerMetadata {
  laravelVersion: string | null
  phpConstraint: string | null
  appNamespace: string
  installedPackages: Array<{ name: string; version: string }>
}

interface ComposerJson {
  require?: Record<string, string>
  autoload?: { 'psr-4'?: Record<string, string> }
}

interface ComposerLock {
  packages?: Array<{ name: string; version: string }>
}

export class ComposerMetadataReader {
  async read(projectPath: string): Promise<ComposerMetadata> {
    const [json, lock] = await Promise.all([
      this.readJson(join(projectPath, 'composer.json')),
      this.readLock(join(projectPath, 'composer.lock'))
    ])

    const require = (json?.require ?? {}) as Record<string, string>
    const psr4 = json?.autoload?.['psr-4'] ?? {}
    const appNamespace = Object.keys(psr4).find((ns) => psr4[ns] === 'app/' || psr4[ns] === 'App/') ?? 'App\\'

    return {
      laravelVersion: require['laravel/framework'] ?? null,
      phpConstraint: require['php'] ?? null,
      appNamespace,
      installedPackages: lock
    }
  }

  private async readJson(path: string): Promise<ComposerJson | null> {
    try {
      return JSON.parse(await readFile(path, 'utf-8')) as ComposerJson
    } catch {
      return null
    }
  }

  private async readLock(path: string): Promise<Array<{ name: string; version: string }>> {
    try {
      const lock = JSON.parse(await readFile(path, 'utf-8')) as ComposerLock
      return (lock.packages ?? []).map(({ name, version }) => ({ name, version }))
    } catch {
      return []
    }
  }
}
