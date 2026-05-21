import { readFile, writeFile, stat } from 'fs/promises'
import { join } from 'path'
import { ComposerMetadataReader } from './ComposerMetadataReader'
import { ArtisanRunner } from './ArtisanRunner'
import type { ComposerMetadata } from './ComposerMetadataReader'

interface RouteEntry {
  name: string | null
  method: string
  uri: string
  action: string
}

interface ArtisanCommand {
  name: string
  description: string
}

export interface LaravelMetadata {
  composer: ComposerMetadata
  routes: RouteEntry[]
  artisanCommands: ArtisanCommand[]
  models: string[]
  cachedAt: number
}

const CACHE_FILE = 'laravel-metadata.json'

export class LaravelDiscoveryService {
  private readonly composerReader = new ComposerMetadataReader()

  async discover(
    projectPath: string,
    storagePath: string,
    phpBinary: string
  ): Promise<LaravelMetadata> {
    const cacheFile = join(storagePath, CACHE_FILE)

    if (await this.isCacheValid(projectPath, cacheFile)) {
      try {
        const raw = await readFile(cacheFile, 'utf-8')
        return JSON.parse(raw) as LaravelMetadata
      } catch { /* fall through to fresh discovery */ }
    }

    const meta = await this.run(projectPath, phpBinary)
    await writeFile(cacheFile, JSON.stringify(meta), 'utf-8').catch(() => {})
    return meta
  }

  private async run(projectPath: string, phpBinary: string): Promise<LaravelMetadata> {
    const artisan = new ArtisanRunner(phpBinary, projectPath)
    const [composer, routes, artisanCommands] = await Promise.allSettled([
      this.composerReader.read(projectPath),
      this.discoverRoutes(artisan),
      this.discoverCommands(artisan)
    ])

    return {
      composer: composer.status === 'fulfilled' ? composer.value : this.emptyComposer(),
      routes: routes.status === 'fulfilled' ? routes.value : [],
      artisanCommands: artisanCommands.status === 'fulfilled' ? artisanCommands.value : [],
      models: await this.discoverModels(projectPath),
      cachedAt: Date.now()
    }
  }

  private async discoverRoutes(artisan: ArtisanRunner): Promise<RouteEntry[]> {
    const out = await artisan.run(['route:list', '--json'])
    const rows = JSON.parse(out) as Array<Record<string, unknown>>
    return rows.map((r) => ({
      name: (r['name'] as string | null) ?? null,
      method: (r['method'] as string) ?? '',
      uri: (r['uri'] as string) ?? '',
      action: (r['action'] as string) ?? ''
    }))
  }

  private async discoverCommands(artisan: ArtisanRunner): Promise<ArtisanCommand[]> {
    const out = await artisan.run(['list', '--format=json'])
    const data = JSON.parse(out) as { commands?: Array<{ name: string; description: string }> }
    return (data.commands ?? []).map(({ name, description }) => ({ name, description }))
  }

  private async discoverModels(projectPath: string): Promise<string[]> {
    const { readdir } = await import('fs/promises')
    const modelsDir = join(projectPath, 'app', 'Models')
    try {
      const files = await readdir(modelsDir)
      return files.filter((f) => f.endsWith('.php')).map((f) => f.replace('.php', ''))
    } catch {
      return []
    }
  }

  private async isCacheValid(projectPath: string, cacheFile: string): Promise<boolean> {
    try {
      const [cacheStat, routesStat, lockStat] = await Promise.all([
        stat(cacheFile),
        stat(join(projectPath, 'routes', 'web.php')).catch(() => null),
        stat(join(projectPath, 'composer.lock')).catch(() => null)
      ])
      const cacheMs = cacheStat.mtimeMs
      if (routesStat && routesStat.mtimeMs > cacheMs) return false
      if (lockStat && lockStat.mtimeMs > cacheMs) return false
      return true
    } catch {
      return false
    }
  }

  private emptyComposer(): ComposerMetadata {
    return { laravelVersion: null, phpConstraint: null, appNamespace: 'App\\', installedPackages: [] }
  }
}
