import { readFile, writeFile, mkdir, access } from 'fs/promises'
import { join, dirname } from 'path'

const MAX_RECENT = 10

export interface RecentProject {
  path: string
  name: string
  framework: string
  openedAt: number
}

export class RecentProjects {
  private readonly filePath: string

  constructor(dataDir: string) {
    this.filePath = join(dataDir, 'recent-projects.json')
  }

  async list(): Promise<RecentProject[]> {
    try {
      const raw = await readFile(this.filePath, 'utf-8')
      const items: RecentProject[] = JSON.parse(raw)
      // Filter out projects whose folder no longer exists
      const valid = await Promise.all(
        items.map(async (item) => {
          try {
            await access(item.path)
            return item
          } catch {
            return null
          }
        })
      )
      return valid.filter((x): x is RecentProject => x !== null)
    } catch {
      return []
    }
  }

  async add(project: Omit<RecentProject, 'openedAt'>): Promise<void> {
    const current = await this.list()
    const entry: RecentProject = { ...project, openedAt: Date.now() }

    // Remove existing entry for same path, prepend new one
    const updated = [entry, ...current.filter((p) => p.path !== project.path)].slice(
      0,
      MAX_RECENT
    )

    await mkdir(dirname(this.filePath), { recursive: true })
    await writeFile(this.filePath, JSON.stringify(updated, null, 2), 'utf-8')
  }

  async remove(projectPath: string): Promise<void> {
    const current = await this.list()
    const updated = current.filter((p) => p.path !== projectPath)
    await writeFile(this.filePath, JSON.stringify(updated, null, 2), 'utf-8')
  }
}
