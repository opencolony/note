import { describe, it, expect } from 'vitest'
import { parseSearchIntent } from './searchIntent'

describe('parseSearchIntent', () => {
  it('should parse ~/ prefix as prefix mode', () => {
    expect(parseSearchIntent('~/do')).toEqual({ mode: 'prefix', root: '~', query: 'do' })
  })
  
  it('should parse / prefix as prefix mode', () => {
    expect(parseSearchIntent('/et')).toEqual({ mode: 'prefix', root: '/', query: 'et' })
  })
  
  it('should parse plain text as fuzzy mode', () => {
    expect(parseSearchIntent('projects')).toEqual({ mode: 'fuzzy', root: '', query: 'projects' })
  })
  
  it('should handle empty string', () => {
    expect(parseSearchIntent('')).toEqual({ mode: 'fuzzy', root: '~', query: '' })
  })
  
  it('should handle ~ alone', () => {
    expect(parseSearchIntent('~')).toEqual({ mode: 'fuzzy', root: '~', query: '' })
  })
  
  it('should handle / alone', () => {
    expect(parseSearchIntent('/')).toEqual({ mode: 'fuzzy', root: '/', query: '' })
  })
  
  it('should handle ~/ alone', () => {
    expect(parseSearchIntent('~/')).toEqual({ mode: 'fuzzy', root: '~', query: '' })
  })
  
  it('should handle whitespace', () => {
    expect(parseSearchIntent('  ~/docs  ')).toEqual({ mode: 'prefix', root: '~', query: 'docs' })
  })
})
