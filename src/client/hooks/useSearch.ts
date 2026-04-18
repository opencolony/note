import { useState, useCallback, useRef } from 'react'
import FlexSearch from 'flexsearch'

interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  rootPath?: string
  children?: FileNode[]
}

interface SearchDocument {
  path: string
  name: string
  content: string
  rootPath: string
  rootName: string
}

export interface SearchResult {
  path: string
  name: string
  rootPath: string
  rootName: string
  matchedContent?: string
  source: 'name' | 'content'
}

function collectFileNodes(nodes: FileNode[]): { path: string; rootPath: string; rootName: string }[] {
  const result: { path: string; rootPath: string; rootName: string }[] = []
  
  function traverse(node: FileNode, rootPath: string, rootName: string) {
    if (node.type === 'file') {
      result.push({ path: node.path, rootPath: node.rootPath || rootPath, rootName })
    }
    if (node.children) {
      node.children.forEach(child => traverse(child, node.rootPath || rootPath, rootName))
    }
  }
  
  nodes.forEach(node => {
    const rPath = node.rootPath || ''
    const rName = rPath.split('/').pop() || rPath
    traverse(node, rPath, rName)
  })
  
  return result
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
      
      const fileInfos = collectFileNodes(files)
      if (fileInfos.length === 0) {
        setIsIndexing(false)
        return
      }

      const pathsParam = fileInfos.map(f => f.path).join(',')
      const res = await fetch(`/api/files/content?paths=${encodeURIComponent(pathsParam)}`)
      
      if (!res.ok) {
        throw new Error('Failed to fetch file contents')
      }

      const data = await res.json()
      
      for (const file of data.files) {
        const fileInfo = fileInfos.find(f => f.path === file.path)
        const doc: SearchDocument = {
          path: file.path,
          name: file.name,
          content: file.content.slice(0, 100000),
          rootPath: fileInfo?.rootPath || '',
          rootName: fileInfo?.rootName || '',
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
            rootPath: doc.rootPath,
            rootName: doc.rootName,
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
            rootPath: doc.rootPath,
            rootName: doc.rootName,
            matchedContent,
            source: 'content'
          })
        }
      }
    }

    return results
  }, [])

  const updateIndex = useCallback((path: string, name: string, content: string, rootPath?: string, rootName?: string) => {
    if (!indexRef.current) return
    
    const existing = docsRef.current.get(path)
    const doc: SearchDocument = {
      path,
      name,
      content: content.slice(0, 100000),
      rootPath: rootPath || existing?.rootPath || '',
      rootName: rootName || existing?.rootName || '',
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