import { useState, useCallback, useRef } from 'react'
import FlexSearch from 'flexsearch'

interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

interface SearchDocument {
  path: string
  name: string
  content: string
}

export interface SearchResult {
  path: string
  name: string
  matchedContent?: string
  source: 'name' | 'content'
}

function collectFilePaths(nodes: FileNode[]): string[] {
  const paths: string[] = []
  
  function traverse(node: FileNode) {
    if (node.type === 'file') {
      paths.push(node.path)
    }
    if (node.children) {
      node.children.forEach(traverse)
    }
  }
  
  nodes.forEach(traverse)
  return paths
}

export function useSearch() {
  const [isIndexing, setIsIndexing] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const indexRef = useRef<any>(null)
  const docsRef = useRef<Map<string, SearchDocument>>(new Map())

  const initIndex = useCallback(() => {
    if (!indexRef.current) {
      indexRef.current = new FlexSearch.Document({
        document: {
          id: 'path',
          index: ['name', 'content'],
          store: ['path', 'name', 'content']
        },
        tokenize: 'forward',
        resolution: 9
      })
    }
    return indexRef.current
  }, [])

  const buildIndex = useCallback(async (files: FileNode[]) => {
    setIsIndexing(true)
    
    try {
      const index = initIndex()
      docsRef.current.clear()
      
      const paths = collectFilePaths(files)
      if (paths.length === 0) {
        setIsIndexing(false)
        return
      }

      const pathsParam = paths.join(',')
      const res = await fetch(`/api/files/content?paths=${encodeURIComponent(pathsParam)}`)
      
      if (!res.ok) {
        throw new Error('Failed to fetch file contents')
      }

      const data = await res.json()
      
      for (const file of data.files) {
        const doc: SearchDocument = {
          path: file.path,
          name: file.name,
          content: file.content.slice(0, 100000)
        }
        docsRef.current.set(file.path, doc)
        index.add(doc)
      }
    } catch (e) {
      console.error('Failed to build search index:', e)
    } finally {
      setIsIndexing(false)
    }
  }, [initIndex])

  const search = useCallback((query: string): SearchResult[] => {
    if (!query.trim() || !indexRef.current) {
      return []
    }

    const index = indexRef.current
    const results: SearchResult[] = []
    const seen = new Set<string>()

    const nameResults = index.search(query, { field: 'name', limit: 5, enrich: true })
    for (const result of nameResults) {
      for (const item of result.result) {
        const doc = docsRef.current.get(String(item.id))
        if (doc && !seen.has(doc.path)) {
          seen.add(doc.path)
          results.push({
            path: doc.path,
            name: doc.name,
            source: 'name'
          })
        }
      }
    }

    const contentResults = index.search(query, { field: 'content', limit: 10, enrich: true })
    for (const result of contentResults) {
      for (const item of result.result) {
        const doc = docsRef.current.get(String(item.id))
        if (doc && !seen.has(doc.path)) {
          seen.add(doc.path)
          
          let matchedContent: string | undefined
          const lowerContent = doc.content.toLowerCase()
          const lowerQuery = query.toLowerCase()
          const idx = lowerContent.indexOf(lowerQuery)
          
          if (idx !== -1) {
            const start = Math.max(0, idx - 30)
            const end = Math.min(doc.content.length, idx + query.length + 30)
            matchedContent = (start > 0 ? '...' : '') + doc.content.slice(start, end) + (end < doc.content.length ? '...' : '')
          }
          
          results.push({
            path: doc.path,
            name: doc.name,
            matchedContent,
            source: 'content'
          })
        }
      }
    }

    return results
  }, [])

  const updateIndex = useCallback((path: string, name: string, content: string) => {
    if (!indexRef.current) return
    
    const doc: SearchDocument = {
      path,
      name,
      content: content.slice(0, 100000)
    }
    
    docsRef.current.set(path, doc)
    indexRef.current.update(doc)
  }, [])

  const removeFromIndex = useCallback((path: string) => {
    if (!indexRef.current) return
    
    docsRef.current.delete(path)
    indexRef.current.remove(path)
  }, [])

  return {
    buildIndex,
    search,
    updateIndex,
    removeFromIndex,
    isIndexing
  }
}