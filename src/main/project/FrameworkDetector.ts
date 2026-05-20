import { readFile, access } from 'fs/promises'
import { join } from 'path'
import type { Framework } from '../executor/types'

export interface ProjectInfo {
  framework: Framework
  version: string | null
  bootstrapPath: string | null
  hasVendor: boolean
}

export class FrameworkDetector {
  async detect(projectPath: string): Promise<ProjectInfo> {
    const [isLaravel, isSymfony, isWordPress] = await Promise.all([
      this.detectLaravel(projectPath),
      this.detectSymfony(projectPath),
      this.detectWordPress(projectPath)
    ])

    if (isLaravel) return isLaravel
    if (isSymfony) return isSymfony
    if (isWordPress) return isWordPress

    return { framework: 'plain', version: null, bootstrapPath: null, hasVendor: false }
  }

  private async detectLaravel(projectPath: string): Promise<ProjectInfo | null> {
    const composerPath = join(projectPath, 'composer.json')
    try {
      const raw = await readFile(composerPath, 'utf-8')
      const composer = JSON.parse(raw)
      const deps = { ...composer.require, ...composer['require-dev'] }

      if (!deps['laravel/framework']) return null

      const version = deps['laravel/framework'].replace(/[^0-9.]/g, '').split('.')[0] ?? null
      const hasVendor = await this.pathExists(join(projectPath, 'vendor', 'autoload.php'))
      const bootstrapPath = hasVendor ? join(projectPath, 'bootstrap', 'app.php') : null

      return { framework: 'laravel', version, bootstrapPath, hasVendor }
    } catch {
      return null
    }
  }

  private async detectSymfony(projectPath: string): Promise<ProjectInfo | null> {
    const composerPath = join(projectPath, 'composer.json')
    try {
      const raw = await readFile(composerPath, 'utf-8')
      const composer = JSON.parse(raw)
      const deps = { ...composer.require, ...composer['require-dev'] }

      if (!deps['symfony/framework-bundle']) return null

      const version = deps['symfony/framework-bundle'].replace(/[^0-9.]/g, '').split('.')[0] ?? null
      const hasVendor = await this.pathExists(join(projectPath, 'vendor', 'autoload.php'))

      return { framework: 'symfony', version, bootstrapPath: null, hasVendor }
    } catch {
      return null
    }
  }

  private async detectWordPress(projectPath: string): Promise<ProjectInfo | null> {
    const wpLoad = join(projectPath, 'wp-load.php')
    const wpConfig = join(projectPath, 'wp-config.php')

    const [hasWpLoad, hasWpConfig] = await Promise.all([
      this.pathExists(wpLoad),
      this.pathExists(wpConfig)
    ])

    if (!hasWpLoad && !hasWpConfig) return null

    return { framework: 'wordpress', version: null, bootstrapPath: null, hasVendor: true }
  }

  private async pathExists(path: string): Promise<boolean> {
    try {
      await access(path)
      return true
    } catch {
      return false
    }
  }
}
