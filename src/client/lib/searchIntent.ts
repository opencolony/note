export interface SearchIntent {
  mode: 'fuzzy' | 'prefix'
  root: string
  query: string
}

export function parseSearchIntent(input: string): SearchIntent {
  const trimmed = input.trim()
  
  if (!trimmed) {
    return { mode: 'fuzzy', root: '~', query: '' }
  }
  
  if (trimmed.startsWith('~/')) {
    const query = trimmed.slice(2)
    return query
      ? { mode: 'prefix', root: '~', query }
      : { mode: 'fuzzy', root: '~', query: '' }
  }
  
  if (trimmed === '~') {
    return { mode: 'fuzzy', root: '~', query: '' }
  }
  
  if (trimmed.startsWith('/')) {
    const query = trimmed.slice(1)
    return query
      ? { mode: 'prefix', root: '/', query }
      : { mode: 'fuzzy', root: '/', query: '' }
  }
  
  return { mode: 'fuzzy', root: '', query: trimmed }
}
