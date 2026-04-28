import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, ArrowLeft, FileText, Loader2 } from 'lucide-react'
import { cn } from '@/client/lib/utils'
import { Button } from './ui/button'
import { Input } from './ui/input'

interface SearchResult {
  path: string
  name: string
  rootPath: string
  rootName: string
  matchedLine?: string
}

interface DirConfig {
  path: string
  name?: string
}

interface FileGroup {
  root: DirConfig
}

interface SearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (path: string, rootPath?: string) => void
  activeRoot?: string | null
  groups?: FileGroup[]
}

function getDirName(dirPath: string, name?: string): string {
  if (name) return name
  const parts = dirPath.replace(/\\/g, '/').split('/').filter(Boolean)
  return parts.pop() || dirPath
}

export function SearchDialog({ open, onOpenChange, onSelect, activeRoot, groups }: SearchDialogProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isSearching, setIsSearching] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [selectedRoot, setSelectedRoot] = useState<string | 'all'>('all')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setIsMobile(window.innerWidth < 768)
  }, [])

  // 同步 activeRoot 到 selectedRoot，默认搜索当前项目
  useEffect(() => {
    if (open && activeRoot) {
      setSelectedRoot(activeRoot)
    } else if (open) {
      setSelectedRoot('all')
    }
  }, [open, activeRoot])

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
      setIsSearching(true)
      const url = new URL('/api/files/search', window.location.origin)
      url.searchParams.set('q', query)
      url.searchParams.set('limit', '50')
      if (selectedRoot !== 'all') {
        url.searchParams.set('root', selectedRoot)
      }

      fetch(url.toString())
        .then(res => res.json())
        .then(data => {
          setResults(data.results || [])
          setSelectedIndex(0)
        })
        .catch(console.error)
        .finally(() => setIsSearching(false))
    }, 200)

    return () => clearTimeout(debounceTimer)
  }, [query, selectedRoot])

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

      {/* 项目选择器 */}
      {groups && groups.length > 0 && (
        <div className="flex items-center gap-1 px-4 py-2 border-b border-border overflow-x-auto">
          <span className="text-xs text-muted-foreground shrink-0 mr-1">搜索范围:</span>
          <Button
            variant={selectedRoot === 'all' ? 'default' : 'ghost'}
            size="sm"
            className="text-xs h-7 shrink-0"
            onClick={() => setSelectedRoot('all')}
          >
            全部
          </Button>
          {groups.map((group) => (
            <Button
              key={group.root.path}
              variant={selectedRoot === group.root.path ? 'default' : 'ghost'}
              size="sm"
              className="text-xs h-7 shrink-0"
              onClick={() => setSelectedRoot(group.root.path)}
            >
              {getDirName(group.root.path, group.root.name)}
            </Button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {isSearching && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="size-5 mr-2 animate-spin" />
            <span className="text-sm">搜索中...</span>
          </div>
        )}

        {!isSearching && query && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Search className="size-10 mb-3 opacity-50" />
            <span className="text-sm">未找到相关结果</span>
          </div>
        )}

        {!isSearching && !query && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Search className="size-10 mb-3 opacity-50" />
            <span className="text-sm">输入关键词搜索文件名或内容</span>
          </div>
        )}

        {results.length > 0 && (
          <div className="py-2">
            {results.map((result, index) => (
              <button
                key={`${result.rootPath}:${result.path}`}
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
                    {result.rootName && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {result.rootName}
                      </span>
                    )}
                  </div>
                  {result.matchedLine && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {result.matchedLine}
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
