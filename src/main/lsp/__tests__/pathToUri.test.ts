import { describe, it, expect } from 'vitest'
import { pathToUri } from '../IntelephenseLsp'

describe('pathToUri', () => {
  it('converts a simple unix path', () => {
    const uri = pathToUri('/home/user/project')
    expect(uri).toBe('file:///home/user/project')
  })

  it('encodes spaces in path', () => {
    const uri = pathToUri('/home/user/my project')
    expect(uri).toBe('file:///home/user/my%20project')
  })

  it('encodes unicode characters', () => {
    const uri = pathToUri('/projetos/meu-çã')
    expect(uri).toMatch(/^file:\/\/\/projetos\//)
    expect(uri).not.toContain('ç')
    expect(uri).not.toContain('ã')
  })

  it('encodes # in path', () => {
    const uri = pathToUri('/home/user/proj#1')
    expect(uri).toContain('%23')
  })

  it('encodes % in path', () => {
    const uri = pathToUri('/home/user/100%')
    expect(uri).toContain('%25')
  })

  it('always starts with file://', () => {
    const uri = pathToUri('/any/path')
    expect(uri.startsWith('file://')).toBe(true)
  })
})
