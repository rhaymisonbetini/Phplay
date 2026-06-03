import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import type { SshConnectionConfig } from './types'

export class SshConnectionStore {
  private readonly filePath: string

  constructor(userDataPath: string) {
    this.filePath = join(userDataPath, 'ssh-connections.json')
  }

  async list(): Promise<SshConnectionConfig[]> {
    try {
      const raw = await readFile(this.filePath, 'utf-8')
      return JSON.parse(raw) as SshConnectionConfig[]
    } catch {
      return []
    }
  }

  async get(id: string): Promise<SshConnectionConfig | null> {
    const all = await this.list()
    return all.find((c) => c.id === id) ?? null
  }

  async save(config: SshConnectionConfig): Promise<SshConnectionConfig> {
    const all = await this.list()
    const existing = all.findIndex((c) => c.id === config.id)

    if (existing >= 0) {
      all[existing] = config
    } else {
      const newConfig = { ...config, id: config.id || randomUUID() }
      all.push(newConfig)
      return this.write(all).then(() => newConfig)
    }

    await this.write(all)
    return config
  }

  async delete(id: string): Promise<void> {
    const all = await this.list()
    await this.write(all.filter((c) => c.id !== id))
  }

  private async write(configs: SshConnectionConfig[]): Promise<void> {
    await mkdir(join(this.filePath, '..'), { recursive: true })
    await writeFile(this.filePath, JSON.stringify(configs, null, 2), 'utf-8')
  }
}
