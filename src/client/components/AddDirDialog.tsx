import { useState, useEffect, useCallback, memo } from 'react'
import { Plus } from 'lucide-react'
import { PathInput } from './PathInput'
import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from './ui/sheet'

interface AddDirDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const AddDirDialog = memo(function AddDirDialog({
  open,
  onOpenChange,
}: AddDirDialogProps) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 768
  })
  const [searchPath, setSearchPath] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (!open) {
      setSearchPath('')
      setError(null)
      setIsAdding(false)
    }
  }, [open])

  const handleAddDir = useCallback(async () => {
    if (!searchPath.trim()) return

    setIsAdding(true)
    setError(null)

    try {
      const res = await fetch('/api/files/dirs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: searchPath.trim() }),
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

      onOpenChange(false)
      window.dispatchEvent(new CustomEvent('config-changed'))
    } catch (e) {
      setError('添加目录失败：网络错误')
    } finally {
      setIsAdding(false)
    }
  }, [searchPath, onOpenChange])

  const handlePathSelect = useCallback((path: string) => {
    setSearchPath(path)
    setError(null)
  }, [])

  const content = (
    <>
      <div className="space-y-4 py-4">
        <PathInput
          value={searchPath}
          onChange={handlePathSelect}
          placeholder="搜索目录路径..."
          disabled={isAdding}
        />
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isAdding}
          >
            取消
          </Button>
          <Button
            onClick={handleAddDir}
            disabled={!searchPath.trim() || isAdding}
          >
            {isAdding ? '添加中...' : (
              <>
                <Plus className="size-4 mr-1" />
                添加
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] flex flex-col">
          <SheetHeader className="flex-shrink-0">
            <SheetTitle>添加目录</SheetTitle>
            <SheetDescription>
              搜索并选择要添加的目录
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
          <DialogTitle>添加目录</DialogTitle>
          <DialogDescription>
            搜索并选择要添加的目录
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  )
})