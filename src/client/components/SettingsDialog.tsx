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
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [settings, setSettings] = React.useState<SettingsState>({
    showHiddenFiles: false,
    allowedExtensions: '',
    themeMode: 'system',
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

      const res = await fetch('/api/files/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          showHiddenFiles: settings.showHiddenFiles,
          allowedExtensions: extensions,
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
