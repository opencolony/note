import * as React from "react"
import { Settings, Moon, Sun, Monitor } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog"
import { Button } from "./ui/button"
import { Switch } from "./ui/switch"

type ThemeMode = 'light' | 'dark' | 'system'

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

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [settings, setSettings] = React.useState<SettingsState>({
    showHiddenFiles: false,
    allowedExtensions: '',
    themeMode: 'system',
    ignore: {
      enableIgnoreFiles: true,
      ignoreFileNames: '.colonynoteignore, .gitignore',
      patterns: '',
    },
  })
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

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
      </DialogContent>
    </Dialog>
  )
}
