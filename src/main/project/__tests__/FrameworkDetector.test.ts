import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FrameworkDetector } from '../FrameworkDetector'

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  access: vi.fn()
}))

import { readFile, access } from 'fs/promises'

const mockReadFile = vi.mocked(readFile)
const mockAccess = vi.mocked(access)

describe('FrameworkDetector', () => {
  let detector: FrameworkDetector

  beforeEach(() => {
    detector = new FrameworkDetector()
    vi.clearAllMocks()
  })

  it('detects Laravel from composer.json', async () => {
    mockReadFile.mockResolvedValue(
      JSON.stringify({ require: { 'laravel/framework': '^11.0' } }) as never
    )
    mockAccess.mockResolvedValue(undefined as never)

    const result = await detector.detect('/project')
    expect(result.framework).toBe('laravel')
    expect(result.version).toBe('11')
    expect(result.hasVendor).toBe(true)
  })

  it('detects Symfony from composer.json', async () => {
    mockReadFile.mockResolvedValue(
      JSON.stringify({ require: { 'symfony/framework-bundle': '^7.0' } }) as never
    )
    mockAccess.mockResolvedValue(undefined as never)

    const result = await detector.detect('/project')
    expect(result.framework).toBe('symfony')
    expect(result.version).toBe('7')
  })

  it('returns plain PHP when no framework detected', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'))
    mockAccess.mockRejectedValue(new Error('ENOENT'))

    const result = await detector.detect('/project')
    expect(result.framework).toBe('plain')
    expect(result.version).toBeNull()
    expect(result.hasVendor).toBe(false)
  })

  it('detects Laravel missing vendor directory', async () => {
    mockReadFile.mockResolvedValue(
      JSON.stringify({ require: { 'laravel/framework': '^10.0' } }) as never
    )
    mockAccess.mockRejectedValue(new Error('ENOENT'))

    const result = await detector.detect('/project')
    expect(result.framework).toBe('laravel')
    expect(result.hasVendor).toBe(false)
    expect(result.bootstrapPath).toBeNull()
  })
})
