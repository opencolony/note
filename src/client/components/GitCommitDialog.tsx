import { useState, useEffect, useRef } from 'react'
import { GitBranch, Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from './ui/dialog'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { ScrollArea } from './ui/scroll-area'

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
  const [pushing, setPushing] = useState(false)
  const [commitMessage, setCommitMessage] = useState(DEFAULT_COMMIT_MESSAGE)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const messageRef = useRef<HTMLTextAreaElement>(null)

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
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch git status')
    } finally {
      setLoading(false)
    }
  }

  const handleCommit = async (pushAfter = false) => {
    if (!commitMessage.trim()) return
    setCommitting(true)
    setPushing(false)
    setError(null)
    setSuccess(null)
    try {
      const url = rootPath
        ? `/api/files/git/commit?root=${encodeURIComponent(rootPath)}`
        : '/api/files/git/commit'
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: commitMessage.trim() }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
        return
      }

      setSuccess('提交成功')

      if (pushAfter) {
        setPushing(true)
        const pushUrl = rootPath
          ? `/api/files/git/push?root=${encodeURIComponent(rootPath)}`
          : '/api/files/git/push'
        const pushRes = await fetch(pushUrl, { method: 'POST' })
        const pushData = await pushRes.json()
        if (pushData.error) {
          setError(`提交成功，但推送失败：${pushData.error}`)
        } else {
          setSuccess('提交并推送成功')
        }
        setPushing(false)
      }

      setCommitMessage(DEFAULT_COMMIT_MESSAGE)
      await fetchStatus()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to commit')
    } finally {
      setCommitting(false)
    }
  }

  const getStatusLabel = (status: string): string => {
    const s = status.trim()
    if (s === 'A ' || s === 'AM') return '新增（已暂存）'
    if (s === '??') return '未跟踪'
    if (s === 'M ' || s === 'MM') return '已修改'
    if (s === ' D' || s === 'D ') return '已删除'
    if (s === 'R ' || s === 'RM') return '已重命名'
    if (s === 'C ') return '已复制'
    return s
  }

  const getStatusIcon = (status: string) => {
    const s = status.trim()
    if (s === 'A ' || s === 'AM' || s === '??') return <span className="size-1.5 rounded-full bg-green-500 shrink-0" />
    if (s === 'M ' || s === 'MM') return <span className="size-1.5 rounded-full bg-yellow-500 shrink-0" />
    if (s === ' D' || s === 'D ') return <span className="size-1.5 rounded-full bg-red-500 shrink-0" />
    return <span className="size-1.5 rounded-full bg-muted-foreground shrink-0" />
  }

  const handleClose = (newOpen: boolean) => {
    if (!newOpen) {
      setError(null)
      setSuccess(null)
    }
    onOpenChange(newOpen)
  }

  if (!status?.isGitRepo && !loading && status) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px]">
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

        {loading && (
          <div className="flex items-center justify-center py-8">
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
          <>
            {/* 变更列表 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">变更 ({status.files.length})</h3>
              </div>
              <ScrollArea className="h-48 border rounded-md">
                {status.files.length === 0 ? (
                  <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                    没有未提交的变更
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {status.files.map((file, i) => (
                      <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted/50">
                        {getStatusIcon(file.status)}
                        <span className="flex-1 truncate font-mono text-xs" title={file.path}>{file.path}</span>
                        <span className="text-[11px] text-muted-foreground shrink-0">{getStatusLabel(file.status)}</span>
                      </div>
                    ))}
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
                className="h-20 resize-none"
              />
            </div>

            {/* 最近提交 */}
            {status.recentCommits.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="size-3.5 text-muted-foreground" />
                  <h3 className="text-sm font-medium">最近提交</h3>
                </div>
                <ScrollArea className="h-32 border rounded-md">
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
          </>
        )}

        <DialogFooter className="sm:justify-end gap-2">
          <Button variant="outline" onClick={() => handleClose(false)}>
            取消
          </Button>
          <Button
            variant="outline"
            disabled={committing || pushing || (status?.files.length === 0)}
            onClick={() => handleCommit(false)}
          >
            {committing && !pushing ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
            提交
          </Button>
          <Button
            disabled={committing || pushing || (status?.files.length === 0)}
            onClick={() => handleCommit(true)}
          >
            {(committing || pushing) ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
            {pushing ? '推送中...' : committing ? '提交中...' : '提交并推送'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
