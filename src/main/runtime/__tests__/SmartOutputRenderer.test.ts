import { describe, it, expect } from 'vitest'
import { parseOutput, hasStructuredOutput } from '../SmartOutputRenderer'

describe('SmartOutputRenderer', () => {
  describe('hasStructuredOutput', () => {
    it('detects structured output', () => {
      expect(hasStructuredOutput('__PHPLAY_OUTPUT__:{"type":"int","value":42}')).toBe(true)
    })

    it('returns false for plain text', () => {
      expect(hasStructuredOutput('hello world')).toBe(false)
    })
  })

  describe('parseOutput', () => {
    it('parses plain text as text chunk', () => {
      const result = parseOutput('hello world')
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({ kind: 'text', content: 'hello world' })
    })

    it('parses a single structured line', () => {
      const stdout = '__PHPLAY_OUTPUT__:{"type":"int","value":42}\n'
      const result = parseOutput(stdout)
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({ kind: 'structured', data: { type: 'int', value: 42 } })
    })

    it('parses null type', () => {
      const result = parseOutput('__PHPLAY_OUTPUT__:{"type":"null"}\n')
      expect(result[0]).toEqual({ kind: 'structured', data: { type: 'null' } })
    })

    it('parses bool type', () => {
      const result = parseOutput('__PHPLAY_OUTPUT__:{"type":"bool","value":true}\n')
      expect(result[0]).toEqual({ kind: 'structured', data: { type: 'bool', value: true } })
    })

    it('parses string type', () => {
      const result = parseOutput('__PHPLAY_OUTPUT__:{"type":"string","value":"hello"}\n')
      expect(result[0]).toEqual({ kind: 'structured', data: { type: 'string', value: 'hello' } })
    })

    it('parses array type', () => {
      const line = '__PHPLAY_OUTPUT__:{"type":"array","count":2,"items":[{"key":0,"value":{"type":"int","value":1}},{"key":1,"value":{"type":"int","value":2}}]}\n'
      const result = parseOutput(line)
      expect(result[0].kind).toBe('structured')
      const data = (result[0] as { kind: 'structured'; data: { type: string } }).data
      expect(data.type).toBe('array')
    })

    it('parses model type', () => {
      const line = '__PHPLAY_OUTPUT__:{"type":"model","class":"App\\\\Models\\\\User","attributes":{"id":{"type":"int","value":1}}}\n'
      const result = parseOutput(line)
      expect(result[0].kind).toBe('structured')
      const data = (result[0] as { kind: 'structured'; data: { type: string; class: string } }).data
      expect(data.type).toBe('model')
      expect(data.class).toBe('App\\Models\\User')
    })

    it('mixes text and structured chunks', () => {
      const stdout = 'Running...\n__PHPLAY_OUTPUT__:{"type":"int","value":42}\n'
      const result = parseOutput(stdout)
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ kind: 'text', content: 'Running...' })
      expect(result[1].kind).toBe('structured')
    })

    it('treats invalid JSON as text', () => {
      const result = parseOutput('__PHPLAY_OUTPUT__:not-json\n')
      expect(result[0].kind).toBe('text')
    })

    it('returns empty array for empty string', () => {
      expect(parseOutput('')).toHaveLength(0)
    })
  })
})
