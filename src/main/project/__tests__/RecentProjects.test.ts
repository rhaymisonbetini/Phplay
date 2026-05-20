import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RecentProjects } from '../RecentProjects'

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  access: vi.fn()
}))

import { readFile, writeFile, access } from 'fs/promises'
const mockReadFile = vi.mocked(readFile)
const mockWriteFile = vi.mocked(writeFile)
const mockAccess = vi.mocked(access)

describe('RecentProjects', () => {
  let recent: RecentProjects

  beforeEach(() => {
    recent = new RecentProjects('/data')
    vi.clearAllMocks()
  })

  it('returns empty list when no file exists', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'))
    expect(await recent.list()).toEqual([])
  })

  it('filters out paths that no longer exist', async () => {
    const items = [
      { path: '/a', name: 'a', framework: 'plain', openedAt: 1 },
      { path: '/b', name: 'b', framework: 'laravel', openedAt: 2 }
    ]
    mockReadFile.mockResolvedValue(JSON.stringify(items) as never)
    mockAccess.mockImplementation(async (p) => {
      if (p === '/a') return undefined as never
      throw new Error('ENOENT')
    })
    const result = await recent.list()
    expect(result).toHaveLength(1)
    expect(result[0].path).toBe('/a')
  })

  it('prepends new project and caps at 10', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'))
    mockWriteFile.mockResolvedValue(undefined as never)

    await recent.add({ path: '/new', name: 'new', framework: 'plain' })
    const written = JSON.parse((mockWriteFile.mock.calls[0][1] as string))
    expect(written[0].path).toBe('/new')
  })

  it('deduplicates on re-add', async () => {
    const existing = [{ path: '/p', name: 'p', framework: 'plain', openedAt: 1 }]
    mockReadFile.mockResolvedValue(JSON.stringify(existing) as never)
    mockAccess.mockResolvedValue(undefined as never)
    mockWriteFile.mockResolvedValue(undefined as never)

    await recent.add({ path: '/p', name: 'p', framework: 'laravel' })
    const written = JSON.parse((mockWriteFile.mock.calls[0][1] as string))
    expect(written).toHaveLength(1)
    expect(written[0].framework).toBe('laravel')
  })
})
