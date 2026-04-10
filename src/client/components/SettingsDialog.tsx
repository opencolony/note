import * as React from "react"
import { Settings, Moon, Sun, Monitor, Folder, Trash2, Plus, AlertCircle, RefreshCw } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "./ui/sheet"
import { Button } from "./ui/button"
import { Switch } from "./ui/switch"
import { PathInput } from "./PathInput"
import { cn } from "@/client/lib/utils"

type ThemeMode = 'light' | 'dark' | 'system'

interface RootConfig {
  path: string
  exclude?: string[]
  isCli?: boolean
}

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface SettingsState {
  showHiddenFiles: boolean
  allowedExtensions: string
  themeMode: ThemeMode
  ignore: {
    enableIgnoreFiles: boolean
    ignoreFileNames: string
    patterns: string
  }
}

interface RootsState {
  roots: RootConfig[]
  newRootPath: string
  loading: boolean
  error: string | null
}

interface FailedRoot {
  path: string
  error: string
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [settings, setSettings] = React.useState<SettingsState>({
    showHiddenFiles: false,
    allowedExtensions: '.md,.markdown,.mdown,.mkdn,.mkd,.mdwn,.mkdown,.ron',
    themeMode: 'system',
    ignore: {
      enableIgnoreFiles: true,
      ignoreFileNames: '.colonynoteignore, .gitignore',
      patterns: '',
    },
  })
  const [rootsState, setRootsState] = React.useState<RootsState>({
    roots: [],
    newRootPath: '',
    loading: false,
    error: null,
  })
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [failedRoots, setFailedRoots] = React.useState<FailedRoot[]>([])
  const [isMobile, setIsMobile] = React.useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 768
  })

  const getThemeMode = (): ThemeMode => {
    const stored = localStorage.getItem('colonynote-theme')
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored
    }
    return 'system'
  }

  const setThemeMode = (mode: ThemeMode) => {
    localStorage.setItem('colonynote-theme', mode)
    
    if (mode === 'system') {
      localStorage.removeItem('colonynote-theme')
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    } else if (mode === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    
    window.dispatchEvent(new CustomEvent('theme-change'))
  }

  const applyTheme = () => {
    const mode = getThemeMode()
    setSettings(prev => ({ ...prev, themeMode: mode }))
  }

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  React.useEffect(() => {
    applyTheme()
  }, [open])

  React.useEffect(() => {
    if (open) {
      fetch('/api/files/config')
        .then(res => res.json())
        .then(data => {
          setSettings({
            showHiddenFiles: data.showHiddenFiles ?? false,
            allowedExtensions: (data.allowedExtensions || []).join(','),
            themeMode: getThemeMode(),
            ignore: {
              enableIgnoreFiles: data.ignore?.enableIgnoreFiles ?? true,
              ignoreFileNames: (data.ignore?.ignoreFileNames || ['.colonynoteignore', '.gitignore']).join(', '),
              patterns: (data.ignore?.patterns || []).join('\n'),
            },
          })
          setError(null)
        })
        .catch(() => {
          setError('Failed to load settings')
        })

      fetch('/api/files/roots')
        .then(res => res.json())
        .then(data => {
          setRootsState(prev => ({
            ...prev,
            roots: data.roots || [],
            error: null,
          }))
        })
        .catch(() => {
          setRootsState(prev => ({
            ...prev,
            error: 'Failed to load roots',
          }))
        })

      // Fetch file groups to check for failed roots
      fetch('/api/files')
        .then(res => res.json())
        .then(data => {
          if (data.groups) {
            const failed = data.groups
              .filter((g: { error?: string }) => g.error)
              .map((g: { root: { path: string }; error: string }) => ({
                path: g.root.path,
                error: g.error,
              }))
            setFailedRoots(failed)
          }
        })
        .catch(() => {
          // Silently ignore - this is just for displaying failed roots
        })
    }
  }, [open])

  const handleSave = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const extensions = settings.allowedExtensions
        .split(',')
        .map(ext => ext.trim())
        .filter(ext => ext.startsWith('.'))

      const ignoreFileNames = settings.ignore.ignoreFileNames
        .split(',')
        .map(name => name.trim())
        .filter(Boolean)

      const patterns = settings.ignore.patterns
        .split('\n')
        .map(p => p.trim())
        .filter(Boolean)

      const res = await fetch('/api/files/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          showHiddenFiles: settings.showHiddenFiles,
          allowedExtensions: extensions,
          ignore: {
            enableIgnoreFiles: settings.ignore.enableIgnoreFiles,
            ignoreFileNames,
            patterns,
          },
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to save settings')
      }

      onOpenChange(false)
      window.dispatchEvent(new CustomEvent('config-changed'))
    } catch {
      setError('Failed to save settings')
    } finally {
      setLoading(false)
    }
  }, [settings, onOpenChange])

  const handleAddRoot = React.useCallback(async () => {
    if (!rootsState.newRootPath.trim()) return

    setRootsState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const res = await fetch('/api/files/roots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: rootsState.newRootPath }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add root')
      }

      setRootsState(prev => ({
        ...prev,
        roots: [...prev.roots, data.root],
        newRootPath: '',
        loading: false,
      }))
      window.dispatchEvent(new CustomEvent('config-changed'))
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to add root'
      setRootsState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }))
    }
  }, [rootsState.newRootPath])

  const handleRemoveRoot = React.useCallback(async (rootPath: string) => {
    setRootsState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const res = await fetch(`/api/files/roots?path=${encodeURIComponent(rootPath)}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to remove root')
      }

      setRootsState(prev => ({
        ...prev,
        roots: prev.roots.filter(r => r.path !== rootPath),
        loading: false,
      }))
      window.dispatchEvent(new CustomEvent('config-changed'))
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to remove root'
      setRootsState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }))
    }
  }, [])

  const handleRetryRoot = React.useCallback(async (rootPath: string) => {
    setRootsState(prev => ({ ...prev, loading: true, error: null }))
    try {
      // Re-fetch file groups to check if the root is now accessible
      const res = await fetch('/api/files')
      const data = await res.json()

      if (data.groups) {
        const failed = data.groups
          .filter((g: { error?: string }) => g.error)
          .map((g: { root: { path: string }; error: string }) => ({
            path: g.root.path,
            error: g.error,
          }))
        setFailedRoots(failed)

        // Check if the specific root is still failing
        const stillFailing = failed.find((f: FailedRoot) => f.path === rootPath)
        if (stillFailing) {
          setRootsState(prev => ({
            ...prev,
            loading: false,
            error: `Still inaccessible: ${stillFailing.error}`,
          }))
        } else {
          setRootsState(prev => ({ ...prev, loading: false }))
          window.dispatchEvent(new CustomEvent('config-changed'))
        }
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to retry'
      setRootsState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }))
    }
  }, [])

  const content = (
    <>
      <div className="grid gap-6 py-4">
        <div className="space-y-3">
          <div className="text-sm font-medium leading-none">
            主题
          </div>
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => {
                setThemeMode('light')
                setSettings(prev => ({ ...prev, themeMode: 'light' }))
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm transition-colors ${
                settings.themeMode === 'light'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <Sun className="size-4" />
              浅色
            </button>
            <button
              type="button"
              onClick={() => {
                setThemeMode('dark')
                setSettings(prev => ({ ...prev, themeMode: 'dark' }))
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm transition-colors ${
                settings.themeMode === 'dark'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <Moon className="size-4" />
              深色
            </button>
            <button
              type="button"
              onClick={() => {
                setThemeMode('system')
                setSettings(prev => ({ ...prev, themeMode: 'system' }))
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm transition-colors ${
                settings.themeMode === 'system'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <Monitor className="size-4" />
              跟随系统
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <label htmlFor="show-hidden" className="text-sm font-medium leading-none">
              显示隐藏文件
            </label>
            <p className="text-xs text-muted-foreground">
              显示以 . 开头的文件和文件夹
            </p>
          </div>
          <Switch
            id="show-hidden"
            checked={settings.showHiddenFiles}
            onCheckedChange={(checked) =>
              setSettings(prev => ({ ...prev, showHiddenFiles: checked }))
            }
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="extensions" className="text-sm font-medium leading-none">
            文件扩展名
          </label>
          <p className="text-xs text-muted-foreground">
            允许的文件扩展名，用逗号分隔
          </p>
          <textarea
            id="extensions"
            value={settings.allowedExtensions}
            onChange={(e) =>
              setSettings(prev => ({ ...prev, allowedExtensions: e.target.value }))
            }
            placeholder=".md,.markdown,.mdown,.mkdn,.mkd,.mdwn,.mkdown,.ron"
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="border-t border-border pt-4 space-y-4">
          <div className="text-sm font-medium">忽略设置</div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label htmlFor="enable-ignore" className="text-sm font-medium leading-none">
                启用忽略文件
              </label>
              <p className="text-xs text-muted-foreground">
                自动加载 .colonynoteignore 和 .gitignore
              </p>
            </div>
            <Switch
              id="enable-ignore"
              checked={settings.ignore.enableIgnoreFiles}
              onCheckedChange={(checked) =>
                setSettings(prev => ({ ...prev, ignore: { ...prev.ignore, enableIgnoreFiles: checked } }))
              }
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="ignore-names" className="text-sm font-medium leading-none">
              忽略文件名
            </label>
            <p className="text-xs text-muted-foreground">
              要查找的忽略文件名称，用逗号分隔
            </p>
            <input
              id="ignore-names"
              value={settings.ignore.ignoreFileNames}
              onChange={(e) =>
                setSettings(prev => ({ ...prev, ignore: { ...prev.ignore, ignoreFileNames: e.target.value } }))
              }
              placeholder=".colonynoteignore, .gitignore"
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="ignore-patterns" className="text-sm font-medium leading-none">
              全局忽略模式
            </label>
            <p className="text-xs text-muted-foreground">
              每行一个模式，支持 glob 语法（如 node_modules/, *.log）
            </p>
            <textarea
              id="ignore-patterns"
              value={settings.ignore.patterns}
              onChange={(e) =>
                setSettings(prev => ({ ...prev, ignore: { ...prev.ignore, patterns: e.target.value } }))
              }
              placeholder="node_modules/
dist/
*.log"
              rows={4}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>

        <div className="border-t border-border pt-4 space-y-4">
          <div className="text-sm font-medium">文档根目录管理</div>
          <p className="text-xs text-muted-foreground">
            添加或删除文档根目录。修改后页面将刷新。
          </p>

          {rootsState.roots.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">当前根目录</div>
              <div className="space-y-1">
                {rootsState.roots.map((root) => {
                  const failedRoot = failedRoots.find(f => f.path === root.path)
                  return (
                    <div
                      key={root.path}
                      className={cn(
                        "flex items-center justify-between gap-2 p-2 rounded-md border bg-background",
                        failedRoot ? "border-destructive/50 bg-destructive/5" : "border-border",
                        root.isCli && "border-primary/30 bg-primary/5"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {failedRoot ? (
                          <AlertCircle className="size-4 text-destructive shrink-0" />
                        ) : (
                          <Folder className={cn("size-4 shrink-0", root.isCli ? "text-primary" : "text-muted-foreground")} />
                        )}
                        <div className="flex flex-col min-w-0">
                          <span
                            className={cn(
                              "text-sm truncate max-w-[180px] md:max-w-[260px]",
                              failedRoot && "text-destructive"
                            )}
                            title={root.path}
                          >
                            {root.path}
                          </span>
                          {root.isCli && (
                            <span className="text-xs text-primary truncate max-w-[180px] md:max-w-[260px]">
                              CLI 启动参数
                            </span>
                          )}
                          {failedRoot && (
                            <span className="text-xs text-destructive truncate max-w-[180px] md:max-w-[260px]">
                              {failedRoot.error}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {failedRoot && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => handleRetryRoot(root.path)}
                            disabled={rootsState.loading}
                            title="重试"
                          >
                            <RefreshCw className={cn("size-4", rootsState.loading && "animate-spin")} />
                          </Button>
                        )}
                        {!root.isCli && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => handleRemoveRoot(root.path)}
                            disabled={rootsState.loading}
                            title="删除"
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">添加新根目录</div>
            <div className="flex gap-2">
              <PathInput
                value={rootsState.newRootPath}
                onChange={(value) =>
                  setRootsState(prev => ({ ...prev, newRootPath: value, error: null }))
                }
                placeholder="输入或搜索路径..."
                disabled={rootsState.loading}
                className="flex-1"
              />
              <Button
                onClick={handleAddRoot}
                disabled={rootsState.loading || !rootsState.newRootPath.trim()}
                size="icon"
                className="size-10"
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>

          {rootsState.error && (
            <div className="flex items-center gap-2 p-2 rounded-md border border-destructive/50 bg-destructive/10">
              <AlertCircle className="size-4 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{rootsState.error}</p>
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          取消
        </Button>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? '保存中...' : '保存'}
        </Button>
      </div>
    </>
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] flex flex-col">
          <SheetHeader className="flex-shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <Settings className="size-5" />
              设置
            </SheetTitle>
            <SheetDescription>
              配置编辑器显示选项。修改后页面将刷新。
            </SheetDescription>
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="size-5" />
            设置
          </DialogTitle>
          <DialogDescription>
            配置编辑器显示选项。修改后页面将刷新。
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  )
}
