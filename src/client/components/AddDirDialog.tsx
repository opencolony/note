import { useState, useEffect, useCallback, useRef, memo } from 'react'
import { Search, Folder, FolderOpen, X } from 'lucide-react'
import { Input } from './ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from './ui/sheet'
import { ScrollArea } from './ui/scroll-area'
import { cn } from '@/client/lib/utils'
import { parseSearchIntent } from '@/client/lib/searchIntent'

interface AddDirDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface SearchResultItem {
  path: string
  score: number
  indexes: number[]
}

const RECENT_DIRS_KEY = 'colonynote-recent-dirs'
const MAX_RECENT_DIRS = 5

let cachedHomeDir: string | null = null

function formatPathForDisplay(path: string): string {
  if (cachedHomeDir && path.startsWith(cachedHomeDir)) {
    return '~' + path.slice(cachedHomeDir.length)
  }
  return path
}

function resolveDisplayPath(displayPath: string): string {
  if (displayPath === '~') return cachedHomeDir || '/'
  if (displayPath.startsWith('~/') && cachedHomeDir) {
    return pathJoin(cachedHomeDir, displayPath.slice(2))
  }
  return displayPath
}

function pathJoin(a: string, b: string): string {
  if (!a) return b
  if (!b) return a
  const sep = a.includes('\\') ? '\\' : '/'
  const normalizedA = a.endsWith(sep) ? a.slice(0, -1) : a
  const normalizedB = b.startsWith(sep) ? b.slice(1) : b
  return normalizedA + sep + normalizedB
}

export const AddDirDialog = memo(function AddDirDialog({
  open,
  onOpenChange,
}: AddDirDialogProps) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 768
  })
  const [inputValue, setInputValue] = useState('')
  const [browseDirs, setBrowseDirs] = useState<string[]>([])
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([])
  const [recentDirs, setRecentDirs] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSearchMode, setIsSearchMode] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<number | null>(null)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (!open) return
    try {
      const saved = localStorage.getItem(RECENT_DIRS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as string[]
        setRecentDirs(Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT_DIRS) : [])
      } else {
        setRecentDirs([])
      }
    } catch {
      setRecentDirs([])
    }
    setInputValue('')
    setBrowseDirs([])
    setSearchResults([])
    setError(null)
    setIsAdding(false)
    setIsSearchMode(false)
  }, [open])

  useEffect(() => {
    if (!open) return

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current)
    }

    debounceRef.current = window.setTimeout(async () => {
      const query = inputValue.trim()
      setIsLoading(true)

      try {
        if (!query) {
          setIsSearchMode(false)
          const res = await fetch('/api/files/dirs/browse?path=~')
          const data = await res.json()
          const dirs = data.dirs || []
          if (!cachedHomeDir && dirs.length > 0) {
            const first = dirs[0]
            const name = first.split(/[\\/]/).pop() || ''
            if (name) {
              cachedHomeDir = first.slice(0, first.length - name.length - 1)
            }
          }
          setBrowseDirs(dirs)
          setSearchResults([])
        } else {
          setIsSearchMode(true)

          const intent = parseSearchIntent(query)

          const url = new URL('/api/files/dirs/search', window.location.origin)
          url.searchParams.set('q', intent.query)
          if (intent.root) url.searchParams.set('root', intent.root)
          url.searchParams.set('mode', intent.mode)

          const res = await fetch(url.toString())
          const data = await res.json()
          const results = data.matches || []
          setSearchResults(results)
          setBrowseDirs([])
        }
      } catch {
        setBrowseDirs([])
        setSearchResults([])
      } finally {
        setIsLoading(false)
      }
    }, 150)

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current)
      }
    }
  }, [inputValue, open])

  const saveRecentDir = useCallback((dirPath: string) => {
    try {
      const saved = localStorage.getItem(RECENT_DIRS_KEY)
      let list: string[] = saved ? JSON.parse(saved) : []
      list = list.filter(d => d !== dirPath)
      list.unshift(dirPath)
      if (list.length > MAX_RECENT_DIRS) {
        list = list.slice(0, MAX_RECENT_DIRS)
      }
      localStorage.setItem(RECENT_DIRS_KEY, JSON.stringify(list))
    } catch {
    }
  }, [])

  const handleAddDir = useCallback(async (dirPath: string) => {
    const resolved = resolveDisplayPath(dirPath)
    if (!resolved.trim()) return

    setIsAdding(true)
    setError(null)

    try {
      const res = await fetch('/api/files/dirs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: resolved.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.conflictWith) {
          const reasonMap: Record<string, string> = {
            child: '此目录是已添加目录的子目录',
            parent: '此目录是已添加目录的父目录',
            duplicate: '此目录已经添加',
          }
          setError(`${reasonMap[data.reason] || '路径冲突'}：${data.conflictWith}`)
        } else if (data.error === 'Sensitive path not allowed') {
          setError('不允许添加敏感路径')
        } else if (data.error === 'Path does not exist') {
          setError('路径不存在')
        } else if (data.error === 'Path must be a directory') {
          setError('路径必须是目录')
        } else {
          setError(`添加目录失败：${data.error || '未知错误'}`)
        }
        return
      }

      saveRecentDir(dirPath)
      onOpenChange(false)
      window.dispatchEvent(new CustomEvent('config-changed'))
    } catch {
      setError('添加目录失败：网络错误')
    } finally {
      setIsAdding(false)
    }
  }, [onOpenChange, saveRecentDir])

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value)
    setError(null)
  }, [])

  const handleClearInput = useCallback(() => {
    setInputValue('')
    setError(null)
    inputRef.current?.focus()
  }, [])

  const browseDirItems = browseDirs.map(d => ({
    fullPath: d,
    displayPath: formatPathForDisplay(d),
    name: d.split(/[\\/]/).pop() || d,
  }))

  const searchItems = searchResults.map(r => ({
    fullPath: r.path,
    displayPath: formatPathForDisplay(r.path),
    name: r.path.split(/[\\/]/).pop() || r.path,
  }))

  const recentDirItems = recentDirs.map(d => ({
    fullPath: d,
    displayPath: d,
    name: d.split(/[\\/]/).pop() || d,
  }))

  const content = (
    <>
      <div className="space-y-1 py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="输入路径或搜索目录..."
            disabled={isAdding}
            className={cn(
              "pl-9 pr-8",
              isMobile && "h-12 text-base"
            )}
          />
          {inputValue && (
            <button
              type="button"
              onClick={handleClearInput}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded"
              disabled={isAdding}
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {error && (
          <p className="text-sm text-destructive px-1">{error}</p>
        )}

        <ScrollArea className={cn(
          "border rounded-md bg-background",
          isMobile ? "h-[45vh]" : "h-[320px]"
        )}>
          <div className="p-2">
            {recentDirItems.length > 0 && (
              <div className="mb-4">
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  最近项目
                </div>
                <div className="space-y-0.5">
                  {recentDirItems.map((dir) => (
                    <button
                      key={dir.fullPath}
                      type="button"
                      onClick={() => handleAddDir(dir.fullPath)}
                      disabled={isAdding}
                      className="w-full flex items-center gap-2 px-2 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground text-left transition-colors disabled:opacity-50"
                    >
                      <FolderOpen className="size-4 shrink-0 text-primary" />
                      <span className="truncate">{dir.displayPath}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center justify-between">
                <span>{isSearchMode ? '搜索结果' : '打开项目'}</span>
                {isLoading && (
                  <span className="text-[10px] normal-case">加载中...</span>
                )}
              </div>

              {isSearchMode ? (
                searchItems.length === 0 && !isLoading ? (
                  <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                    未找到匹配的目录
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {searchItems.map((item) => (
                      <button
                        key={item.fullPath}
                        type="button"
                        onClick={() => handleAddDir(item.fullPath)}
                        disabled={isAdding}
                        className="w-full flex items-center gap-2 px-2 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground text-left transition-colors disabled:opacity-50"
                      >
                        <Folder className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{item.displayPath}</span>
                      </button>
                    ))}
                  </div>
                )
              ) : (
                browseDirItems.length === 0 && !isLoading ? (
                  <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                    该目录下没有子文件夹
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {browseDirItems.map((dir) => (
                      <button
                        key={dir.fullPath}
                        type="button"
                        onClick={() => handleAddDir(dir.fullPath)}
                        disabled={isAdding}
                        className="w-full flex items-center gap-2 px-2 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground text-left transition-colors disabled:opacity-50"
                      >
                        <Folder className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{dir.displayPath}</span>
                      </button>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
    </>
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl h-[85vh] flex flex-col">
          <SheetHeader className="flex-shrink-0">
            <SheetTitle>打开项目</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            {content}
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>打开项目</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  )
})
