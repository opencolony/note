import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, ArrowLeft, FileText, Loader2 } from 'lucide-react'
import { useSearch, SearchResult } from '@/client/hooks/useSearch'
import { cn } from '@/client/lib/utils'
import { Button } from './ui/button'
import { Input } from './ui/input'

interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

interface SearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  files: FileNode[]
  onSelect: (path: string, rootPath?: string) => void
}

export function SearchDialog({ open, onOpenChange, files, onSelect }: SearchDialogProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { buildIndex, search, isIndexing } = useSearch()

  useEffect(() => {
    setIsMobile(window.innerWidth < 768)
  }, [])

  useEffect(() => {
    if (!open) return
    buildIndex(files)
  }, [open, files, buildIndex])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setQuery('')
      setResults([])
      setSelectedIndex(0)
    }
  }, [open])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setSelectedIndex(0)
      return
    }

    const debounceTimer = setTimeout(() => {
      const searchResults = search(query)
      setResults(searchResults)
      setSelectedIndex(0)
    }, 150)

    return () => clearTimeout(debounceTimer)
  }, [query, search])

  const handleSelect = useCallback((path: string, rootPath?: string) => {
    onSelect(path, rootPath)
    onOpenChange(false)
  }, [onSelect, onOpenChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault()
      const selected = results[selectedIndex]
      handleSelect(selected.path, selected.rootPath)
    } else if (e.key === 'Escape') {
      onOpenChange(false)
    }
  }, [results, selectedIndex, handleSelect, onOpenChange])

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false)
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <ArrowLeft className="size-5" />
          </Button>
        )}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="搜索文件或内容..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-9 pr-20"
          />
          {!query && (
            <span className="absolute right-10 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
              ⌘K
            </span>
          )}
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="size-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
          <X className="size-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isIndexing && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="size-5 mr-2 animate-spin" />
            <span className="text-sm">正在建立索引...</span>
          </div>
        )}

        {!isIndexing && query && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Search className="size-10 mb-3 opacity-50" />
            <span className="text-sm">未找到相关结果</span>
          </div>
        )}

        {!isIndexing && !query && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Search className="size-10 mb-3 opacity-50" />
            <span className="text-sm">输入关键词搜索文件名或内容</span>
          </div>
        )}

        {results.length > 0 && (
          <div className="py-2">
            {results.map((result, index) => (
              <button
                key={result.path}
                onClick={() => handleSelect(result.path, result.rootPath)}
                className={cn(
                  "w-full px-4 py-3 flex items-start gap-3 text-left hover:bg-accent transition-colors",
                  index === selectedIndex && "bg-accent"
                )}
              >
                <FileText className="size-5 mt-0.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{result.name}</span>
                    {result.source === 'name' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        文件名
                      </span>
                    )}
                    {result.rootName && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {result.rootName}
                      </span>
                    )}
                  </div>
                  {result.matchedContent && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {result.matchedContent}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {result.path}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground flex items-center justify-between">
          <span>{results.length} 个结果</span>
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-accent">↑↓</span>
            <span>选择</span>
            <span className="px-1.5 py-0.5 rounded bg-accent">Enter</span>
            <span>打开</span>
          </div>
        </div>
      )}
    </div>
  )
}
