import { createHash } from 'crypto'
import { realpathSync } from 'fs'
import { mkdir } from 'fs/promises'
import { join } from 'path'

export interface Workspace {
  id: string
  projectPath: string
  storagePath: string
  lspCachePath: string
  generatedPath: string
  logsPath: string
}

export class WorkspaceService {
  constructor(private readonly userData: string) {}

  get(projectPath: string): Workspace {
    const resolved = this.resolve(projectPath)
    const id = createHash('sha256').update(resolved).digest('hex').slice(0, 16)
    const storagePath = join(this.userData, 'workspaces', id)
    return {
      id,
      projectPath: resolved,
      storagePath,
      lspCachePath: join(storagePath, 'lsp-cache'),
      generatedPath: join(storagePath, 'generated'),
      logsPath: join(this.userData, 'logs')
    }
  }

  async ensure(projectPath: string): Promise<Workspace> {
    const ws = this.get(projectPath)
    await mkdir(ws.lspCachePath, { recursive: true })
    await mkdir(ws.generatedPath, { recursive: true })
    await mkdir(ws.logsPath, { recursive: true })
    return ws
  }

  private resolve(projectPath: string): string {
    try {
      return realpathSync(projectPath)
    } catch {
      return projectPath
    }
  }
}
