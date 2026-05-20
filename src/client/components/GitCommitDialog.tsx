import { useState, useEffect, useRef } from 'react'
import { GitBranch, Loader2, CheckCircle2, AlertCircle, Clock, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from './ui/dialog'
import { Sheet, SheetContent } from './ui/sheet'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { ScrollArea } from './ui/scroll-area'
import { cn } from '@/client/lib/utils'

interface GitFileStatus {
  path: string
  status: string
  staged: boolean
}

interface GitCommitEntry {
  hash: string
  author: string
  date: string
  message: string
}

interface GitStatusData {
  isGitRepo: boolean
  gitRoot?: string
  files: GitFileStatus[]
  recentCommits: GitCommitEntry[]
}

interface GitCommitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rootPath?: string
}

const DEFAULT_COMMIT_MESSAGE = 'chore: 更新文档内容'

export function GitCommitDialog({ open, onOpenChange, rootPath }: GitCommitDialogProps) {
  const [status, setStatus] = useState<GitStatusData | null>(null)
  const [loading, setLoading] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [commitMessage, setCommitMessage] = useState(DEFAULT_COMMIT_MESSAGE)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set())
  const messageRef = useRef<HTMLTextAreaElement>(null)
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 768
  })

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (!open) return
    fetchStatus()
  }, [open])

  useEffect(() => {
    if (open && status?.isGitRepo) {
      setTimeout(() => messageRef.current?.focus(), 100)
    }
  }, [open, status])

  const fetchStatus = async () => {
    setLoading(true)
    setError(null)
    try {
      const url = rootPath
        ? `/api/files/git/status?root=${encodeURIComponent(rootPath)}`
        : '/api/files/git/status'
      const res = await fetch(url)
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setStatus(data)
        setSelectedPaths(new Set(data.files.map((f: GitFileStatus) => f.path)))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch git status')
    } finally {
      setLoading(false)
    }
  }

  const handleCommit = async () => {
    if (!commitMessage.trim()) return
    if (selectedPaths.size === 0) return
    setCommitting(true)
    setError(null)
    setSuccess(null)
    try {
      const url = rootPath
        ? `/api/files/git/commit?root=${encodeURIComponent(rootPath)}`
        : '/api/files/git/commit'
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: commitMessage.trim(), files: Array.from(selectedPaths) }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
        return
      }

      const pushUrl = rootPath
        ? `/api/files/git/push?root=${encodeURIComponent(rootPath)}`
        : '/api/files/git/push'
      const pushRes = await fetch(pushUrl, { method: 'POST' })
      const pushData = await pushRes.json()
      if (pushData.error) {
        setSuccess('已提交，推送失败：' + pushData.error)
      } else {
        setSuccess('提交成功')
      }

      window.dispatchEvent(new CustomEvent('git-commit-success', { detail: { rootPath } }))

      setCommitMessage(DEFAULT_COMMIT_MESSAGE)
      await fetchStatus()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to commit')
    } finally {
      setCommitting(false)
    }
  }

  const getStatusLabel = (s: string): string => {
    const t = s.trim()
    if (t === 'A ' || t === 'AM') return '新增'
    if (t === '??') return '未跟踪'
    if (t === 'M ' || t === 'MM') return '已修改'
    if (t === ' D' || t === 'D ') return '已删除'
    if (t === 'R ' || t === 'RM') return '已重命名'
    if (t === 'C ') return '已复制'
    return t
  }

  const getStatusIcon = (s: string) => {
    const t = s.trim()
    if (t === 'A ' || t === 'AM' || t === '??') return <span className="size-1.5 rounded-full bg-green-500 shrink-0" />
    if (t === 'M ' || t === 'MM') return <span className="size-1.5 rounded-full bg-yellow-500 shrink-0" />
    if (t === ' D' || t === 'D ') return <span className="size-1.5 rounded-full bg-red-500 shrink-0" />
    return <span className="size-1.5 rounded-full bg-muted-foreground shrink-0" />
  }

  const handleClose = (newOpen: boolean) => {
    if (!newOpen) {
      setError(null)
      setSuccess(null)
      setSelectedPaths(new Set())
    }
    onOpenChange(newOpen)
  }

  if (!status?.isGitRepo && !loading && status) return null

  const content = (
    <>
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">加载 Git 状态...</span>
        </div>
      )}

      {error && !loading && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-green-500/10 text-green-600 dark:text-green-400 text-sm">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {!loading && status?.isGitRepo && (
        <div className="space-y-4">
          {/* 变更列表 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">变更 ({status.files.length})</h3>
              {status.files.length > 0 && (
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => {
                    if (selectedPaths.size === status.files.length) {
                      setSelectedPaths(new Set())
                    } else {
                      setSelectedPaths(new Set(status.files.map(f => f.path)))
                    }
                  }}
                >
                  {selectedPaths.size === status.files.length ? '取消全选' : '全选'}
                </button>
              )}
            </div>
            <ScrollArea className={cn('border rounded-md', isMobile ? 'h-40' : 'h-48')}>
              {status.files.length === 0 ? (
                <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                  没有未提交的变更
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {status.files.map((file, i) => {
                    const isSelected = selectedPaths.has(file.path)
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted/50 cursor-pointer select-none"
                        onClick={() => {
                          const next = new Set(selectedPaths)
                          if (next.has(file.path)) {
                            next.delete(file.path)
                          } else {
                            next.add(file.path)
                          }
                          setSelectedPaths(next)
                        }}
                      >
                        <div
                          className={cn(
                            'size-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                            isSelected
                              ? 'bg-primary border-primary text-primary-foreground'
                              : 'border-input bg-background'
                          )}
                        >
                          {isSelected && <Check className="size-3" />}
                        </div>
                        {getStatusIcon(file.status)}
                        <span className="flex-1 truncate font-mono text-xs" title={file.path}>{file.path}</span>
                        <span className="text-[11px] text-muted-foreground shrink-0">{getStatusLabel(file.status)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Commit 消息 */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">提交消息</label>
            <Textarea
              ref={messageRef}
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="输入提交消息..."
              className={cn('resize-none', isMobile ? 'h-16' : 'h-20')}
            />
          </div>

          {/* 最近提交 */}
          {status.recentCommits.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="size-3.5 text-muted-foreground" />
                <h3 className="text-sm font-medium">最近提交</h3>
              </div>
              <ScrollArea className={cn('border rounded-md', isMobile ? 'h-28' : 'h-32')}>
                <div className="p-2 space-y-1">
                  {status.recentCommits.map((entry) => (
                    <div key={entry.hash} className="px-2 py-1.5 rounded-md text-sm hover:bg-muted/50">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground shrink-0">{entry.hash.slice(0, 7)}</span>
                        <span className="flex-1 truncate">{entry.message}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {entry.author} · {entry.date}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      )}
    </>
  )

  const selectedCount = selectedPaths.size

  const buttons = (
    <div className="flex gap-2 pt-2">
      <Button variant="outline" className="flex-1" onClick={() => handleClose(false)}>
        取消
      </Button>
      <Button
        className="flex-1"
        disabled={committing || selectedCount === 0}
        onClick={() => handleCommit()}
      >
        {committing ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
        提交{selectedCount > 0 ? ` (${selectedCount})` : ''}
      </Button>
    </div>
  )

  return (
    <>
      {/* Desktop: Dialog */}
      <Dialog open={!isMobile && open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[520px] grid-cols-[minmax(0,1fr)]">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <GitBranch className="size-5 text-muted-foreground" />
              <DialogTitle>Git 提交</DialogTitle>
            </div>
            <DialogDescription>
              {status?.gitRoot && (
                <span className="truncate block font-mono text-xs" title={status.gitRoot}>
                  {status.gitRoot}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {content}

          {status && status.files.length > 0 && (
            <DialogFooter className="sm:justify-end gap-2">
              <Button variant="outline" onClick={() => handleClose(false)}>
                取消
              </Button>
              <Button
                disabled={committing || selectedCount === 0}
                onClick={() => handleCommit()}
              >
                {committing ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
                提交{selectedCount > 0 ? ` (${selectedCount})` : ''}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Mobile: Sheet */}
      <Sheet open={isMobile && open} onOpenChange={handleClose}>
        <SheetContent side="bottom" className="rounded-t-2xl h-[85vh] flex flex-col pb-8">
          <div className="flex items-center gap-2 mb-4 shrink-0">
            <GitBranch className="size-5 text-muted-foreground" />
            <span className="text-base font-semibold">Git 提交</span>
          </div>

          {status?.gitRoot && (
            <div className="text-xs text-muted-foreground font-mono truncate mb-4 shrink-0" title={status.gitRoot}>
              {status.gitRoot}
            </div>
          )}

          <div className="flex-1 overflow-y-auto space-y-4">
            {content}
          </div>

          {status && status.files.length > 0 && (
            <div className="shrink-0">
              {buttons}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
