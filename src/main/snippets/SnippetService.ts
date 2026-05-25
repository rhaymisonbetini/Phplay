import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

export interface SavedSnippet {
  id: string
  name: string
  code: string
  savedAt: number
}

export class SnippetService {
  private async snippetFile(storagePath: string): Promise<string> {
    await mkdir(storagePath, { recursive: true })
    return join(storagePath, 'snippets.json')
  }

  async list(storagePath: string): Promise<SavedSnippet[]> {
    try {
      const raw = await readFile(await this.snippetFile(storagePath), 'utf-8')
      return JSON.parse(raw) as SavedSnippet[]
    } catch {
      return []
    }
  }

  async save(storagePath: string, name: string, code: string): Promise<SavedSnippet> {
    const items = await this.list(storagePath)
    const snippet: SavedSnippet = { id: randomUUID(), name, code, savedAt: Date.now() }
    await this.write(storagePath, [snippet, ...items])
    return snippet
  }

  async remove(storagePath: string, id: string): Promise<void> {
    const items = await this.list(storagePath)
    await this.write(storagePath, items.filter((s) => s.id !== id))
  }

  private async write(storagePath: string, items: SavedSnippet[]): Promise<void> {
    await writeFile(await this.snippetFile(storagePath), JSON.stringify(items, null, 2), 'utf-8')
  }
}
