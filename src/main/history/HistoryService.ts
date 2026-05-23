import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

export interface HistoryEntry {
  id: string
  code: string
  executedAt: string
  projectPath: string
  durationMs: number
  favorite: boolean
}

const MAX_HISTORY = 500

export class HistoryService {
  private async historyFile(storagePath: string): Promise<string> {
    await mkdir(storagePath, { recursive: true })
    return join(storagePath, 'history.json')
  }

  async list(storagePath: string): Promise<HistoryEntry[]> {
    try {
      const file = await this.historyFile(storagePath)
      const raw = await readFile(file, 'utf-8')
      return JSON.parse(raw) as HistoryEntry[]
    } catch {
      return []
    }
  }

  async add(storagePath: string, entry: Omit<HistoryEntry, 'id' | 'executedAt' | 'favorite'>): Promise<HistoryEntry> {
    const entries = await this.list(storagePath)
    const newEntry: HistoryEntry = {
      id: randomUUID(),
      executedAt: new Date().toISOString(),
      favorite: false,
      ...entry
    }
    const updated = [newEntry, ...entries].slice(0, MAX_HISTORY)
    await this.save(storagePath, updated)
    return newEntry
  }

  async remove(storagePath: string, id: string): Promise<void> {
    const entries = await this.list(storagePath)
    await this.save(storagePath, entries.filter((e) => e.id !== id))
  }

  async toggleFavorite(storagePath: string, id: string): Promise<boolean> {
    const entries = await this.list(storagePath)
    let newFavorite = false
    const updated = entries.map((e) => {
      if (e.id !== id) return e
      newFavorite = !e.favorite
      return { ...e, favorite: newFavorite }
    })
    await this.save(storagePath, updated)
    return newFavorite
  }

  private async save(storagePath: string, entries: HistoryEntry[]): Promise<void> {
    const file = await this.historyFile(storagePath)
    await writeFile(file, JSON.stringify(entries, null, 2), 'utf-8')
  }
}
