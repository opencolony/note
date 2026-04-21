import { useState, useCallback, useRef } from 'react'
import FlexSearch from 'flexsearch'
import * as searchDB from '@/client/lib/searchDB'

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

function computeHash(content: string): string {
  return `${content.length}:${content.slice(0, 64)}|${content.slice(-64)}`
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

const FETCH_BATCH_SIZE = 50

async function fetchBatchContent(paths: string[]): Promise<{ path: string; name: string; content: string; hash: string }[]> {
  const res = await fetch('/api/files/search/content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paths }),
  })
  if (!res.ok) throw new Error('Failed to fetch file contents')
  const data = await res.json()
  return data.files || []
}

async function fetchBatchHashes(paths: string[]): Promise<{ path: string; hash: string }[]> {
  const res = await fetch('/api/files/search/hashes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paths }),
  })
  if (!res.ok) throw new Error('Failed to fetch file hashes')
  const data = await res.json()
  return data.files || []
}

export interface SearchResult {
  path: string
  name: string
  rootPath: string
  rootName: string
  matchedContent?: string
  source: 'name' | 'content'
}

export function useSearch() {
  const [isIndexing, setIsIndexing] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const indexRef = useRef<any>(null)
  const docsRef = useRef<Map<string, SearchDocument>>(new Map())
  const initPromiseRef = useRef<Promise<void> | null>(null)

  const ensureIndex = useCallback(() => {
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
    // Prevent concurrent builds
    if (initPromiseRef.current) {
      await initPromiseRef.current
      return
    }

    const p = (async () => {
      setIsIndexing(true)

      try {
        const index = ensureIndex()
        const fileInfos = collectFileNodes(files)

        if (fileInfos.length === 0) return

        const currentPaths = new Set(fileInfos.map(f => f.path))
        const cachedDocs = await searchDB.getAllDocs()
        const cacheMap = new Map(cachedDocs.map(d => [d.path, d]))

        // Remove cached docs that no longer exist in the tree
        for (const [cachedPath] of cacheMap) {
          if (!currentPaths.has(cachedPath)) {
            index.remove(cachedPath)
            docsRef.current.delete(cachedPath)
            await searchDB.deleteDoc(cachedPath)
          }
        }

        // Step 1: Fetch hashes for ALL files (lightweight, no content)
        const allPaths = fileInfos.map(f => f.path)
        const hashMap = new Map<string, string>()
        for (let i = 0; i < allPaths.length; i += FETCH_BATCH_SIZE) {
          const batch = allPaths.slice(i, i + FETCH_BATCH_SIZE)
          const hashes = await fetchBatchHashes(batch)
          for (const h of hashes) {
            hashMap.set(h.path, h.hash)
          }
        }

        // Step 2: Determine which files need content fetch
        const needFetch: string[] = []
        for (const fi of fileInfos) {
          const cached = cacheMap.get(fi.path)
          const serverHash = hashMap.get(fi.path)

          if (!cached || cached.hash !== serverHash) {
            // New file or content changed — need to fetch
            needFetch.push(fi.path)
          } else {
            // Hash matches — restore from cache, no network needed
            const doc: SearchDocument = {
              path: cached.path,
              name: cached.name,
              content: cached.content,
              rootPath: cached.rootPath,
              rootName: cached.rootName,
            }
            docsRef.current.set(fi.path, doc)
            index.add(doc)
          }
        }

        // Step 3: Fetch only changed/new files in batches
        for (let i = 0; i < needFetch.length; i += FETCH_BATCH_SIZE) {
          const batch = needFetch.slice(i, i + FETCH_BATCH_SIZE)
          const results = await fetchBatchContent(batch)

          for (const file of results) {
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

            await searchDB.putDoc({
              path: file.path,
              name: file.name,
              content: file.content.slice(0, 100000),
              hash: file.hash,
              rootPath: fileInfo?.rootPath || '',
              rootName: fileInfo?.rootName || '',
              updatedAt: Date.now(),
            })
          }
        }
      } catch (e) {
        console.error('Failed to build search index:', e)
      } finally {
        setIsIndexing(false)
        initPromiseRef.current = null
      }
    })()

    initPromiseRef.current = p
    await p
  }, [ensureIndex])

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

  const updateIndex = useCallback(async (path: string, name: string, content: string, rootPath?: string, rootName?: string) => {
    if (!indexRef.current) return

    const existing = docsRef.current.get(path)
    const currentRootPath = rootPath || existing?.rootPath || ''
    const currentRootName = rootName || existing?.rootName || ''

    // Update in FlexSearch
    if (docsRef.current.has(path)) {
      indexRef.current.remove(path)
    }

    const doc: SearchDocument = {
      path,
      name,
      content: content.slice(0, 100000),
      rootPath: currentRootPath,
      rootName: currentRootName,
    }

    docsRef.current.set(path, doc)
    indexRef.current.add(doc)

    // Update IndexedDB cache
    const hash = computeHash(content)
    await searchDB.putDoc({
      path,
      name,
      content: content.slice(0, 100000),
      hash,
      rootPath: currentRootPath,
      rootName: currentRootName,
      updatedAt: Date.now(),
    })
  }, [])

  const removeFromIndex = useCallback(async (path: string) => {
    if (!indexRef.current) return

    docsRef.current.delete(path)
    indexRef.current.remove(path)
    await searchDB.deleteDoc(path)
  }, [])

  return {
    buildIndex,
    search,
    updateIndex,
    removeFromIndex,
    isIndexing
  }
}
