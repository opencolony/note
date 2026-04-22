import * as React from "react"
import { Settings } from "lucide-react"
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

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface SettingsState {
  showHiddenFiles: boolean
  allowedExtensions: string
  ignore: {
    patterns: string
  }
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [settings, setSettings] = React.useState<SettingsState>({
    showHiddenFiles: false,
    allowedExtensions: '.md,.markdown,.mdown,.mkdn,.mkd,.mdwn,.mkdown,.ron',
    ignore: {
      patterns: '',
    },
  })
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [isMobile, setIsMobile] = React.useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 768
  })

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  React.useEffect(() => {
    if (open) {
      fetch('/api/files/config')
        .then(res => res.json())
        .then(data => {
          setSettings({
            showHiddenFiles: data.showHiddenFiles ?? false,
            allowedExtensions: (data.allowedExtensions || []).join(','),
            ignore: {
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

  const content = (
    <>
      <div className="grid gap-6 py-4">
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
      <DialogContent className="sm:max-w-[600px]">
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
