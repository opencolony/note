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

  const formContent = (
    <div className="space-y-4">
      {/* 路径徽章 */}
      {dirPath && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/40">
          <div className="size-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-xs text-muted-foreground truncate">{dirPath}</span>
        </div>
      )}

      {/* 主表单区 */}
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-foreground mb-1.5 block">
            显示名称
          </label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={dirPath ? dirPath.split('/').pop() || dirPath : '输入显示名称'}
            disabled={isSaving}
          />
          <p className="text-xs text-muted-foreground/60 mt-1.5">
            此名称将显示在目录切换器中
          </p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* 危险操作区 */}
      <div className="rounded-xl border border-destructive/15 bg-destructive/[0.03] p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-foreground mb-0.5">从列表中移除</p>
            <p className="text-xs text-muted-foreground/70">文件不会被删除</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteConfirmOpen(true)}
            disabled={isSaving || isDeleting || isCli}
            title={isCli ? 'CLI启动的目录无法删除' : undefined}
            className="shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive text-xs"
          >
            <Trash2 className="size-3.5 mr-1" />
            移除
          </Button>
        </div>
      </div>

      {/* 底部操作 */}
      <div className="flex gap-2 pt-1">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => onOpenChange(false)}
          disabled={isSaving}
        >
          取消
        </Button>
        <Button
          className="flex-1"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? '保存中...' : '保存'}
        </Button>
      </div>
    </div>
  )

  const alertDialog = (
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
          <div className="flex-1 overflow-y-auto py-4">
            {formContent}
          </div>
          {alertDialog}
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
        <div className="py-2">
          {formContent}
        </div>
        {alertDialog}
      </DialogContent>
    </Dialog>
  )
})