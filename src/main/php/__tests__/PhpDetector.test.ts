import { describe, it, expect } from 'vitest'
import { PhpDetector } from '../PhpDetector'

describe('PhpDetector', () => {
  it('returns an array (may be empty if PHP is not installed)', async () => {
    const detector = new PhpDetector()
    const results = await detector.detect()
    expect(Array.isArray(results)).toBe(true)
  })

  it('returns entries with path and version fields', async () => {
    const detector = new PhpDetector()
    const results = await detector.detect()

    for (const php of results) {
      expect(php.path).toBeTypeOf('string')
      expect(php.version).toBeTypeOf('string')
      expect(php.version).toMatch(/^\d+\.\d+\.\d+$/)
    }
  })
})
