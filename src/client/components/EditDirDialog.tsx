import { useState, useEffect, useCallback, memo } from 'react'
import { Trash2 } from 'lucide-react'
import { Input } from './ui/input'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog'

interface EditDirDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dirPath: string | null
  isCli?: boolean
}

export const EditDirDialog = memo(function EditDirDialog({
  open,
  onOpenChange,
  dirPath,
  isCli,
}: EditDirDialogProps) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 768
  })
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (open && dirPath) {
      setDisplayName(dirPath.split('/').pop() || dirPath)
      setError(null)
      setIsSaving(false)
      setDeleteConfirmOpen(false)
      setIsDeleting(false)
    }
  }, [open, dirPath])

  const handleSave = useCallback(async () => {
    if (!dirPath) return

    setIsSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/files/dirs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: dirPath, name: displayName }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(`保存失败：${data.error || '未知错误'}`)
        return
      }

      onOpenChange(false)
      window.dispatchEvent(new CustomEvent('config-changed'))
    } catch (e) {
      setError('保存失败：网络错误')
    } finally {
      setIsSaving(false)
    }
  }, [dirPath, displayName, onOpenChange])

  const handleDelete = useCallback(async () => {
    if (!dirPath) return

    setIsDeleting(true)
    setError(null)

    try {
      const res = await fetch(`/api/files/dirs?path=${encodeURIComponent(dirPath)}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok) {
        setError(`删除失败：${data.error || '未知错误'}`)
        setDeleteConfirmOpen(false)
        return
      }

      setDeleteConfirmOpen(false)
      onOpenChange(false)
      window.dispatchEvent(new CustomEvent('config-changed'))
    } catch (e) {
      setError('删除失败：网络错误')
      setDeleteConfirmOpen(false)
    } finally {
      setIsDeleting(false)
    }
  }, [dirPath, onOpenChange])

  const content = (
    <>
      <div className="space-y-4 py-4">
        {dirPath && (
          <div className="space-y-1">
            <p className="text-sm font-medium">目录路径</p>
            <p className="text-sm text-muted-foreground break-all">{dirPath}</p>
          </div>
        )}
        <div className="space-y-2">
          <label className="text-sm font-medium">显示名称</label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={dirPath ? dirPath.split('/').pop() || dirPath : '输入显示名称'}
            disabled={isSaving}
          />
        </div>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        <div className="flex justify-between gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteConfirmOpen(true)}
            disabled={isSaving || isDeleting || isCli}
            title={isCli ? 'CLI启动的目录无法删除' : undefined}
          >
            <Trash2 className="size-4 mr-1" />
            删除目录
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定要移除目录吗？</AlertDialogTitle>
            <AlertDialogDescription>
              文件不会被删除，只是从列表中移除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? '删除中...' : '确认移除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl h-[85vh] flex flex-col">
          <SheetHeader className="flex-shrink-0">
            <SheetTitle>目录设置</SheetTitle>
            <SheetDescription>
              修改显示名称或删除目录
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
          <DialogTitle>目录设置</DialogTitle>
          <DialogDescription>
            修改显示名称或删除目录
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  )
})