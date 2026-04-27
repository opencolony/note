import { useState, useEffect } from 'react'
import { ChevronRight, Folder, FolderOpen, File, FileText, X } from 'lucide-react'
import { cn } from '@/client/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from './ui/dialog'
import { Button } from './ui/button'
import { ScrollArea } from './ui/scroll-area'

interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

interface FileGroup {
  root: { path: string; exclude?: string[] }
  files: FileNode[]
  error?: string
}

interface CopyFileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: { path: string; name: string; type: 'file' | 'directory' } | null
  groups: FileGroup[]
  onCopy: (sourcePath: string, targetPath: string, sourceRoot: string, targetRoot: string) => void
}

interface TreeNodeSelectProps {
  node: FileNode
  selectedPath: string | null
  onSelect: (path: string) => void
  expandedPaths: Set<string>
  onToggleExpand: (path: string) => void
  currentItemPath: string
  rootPath: string
}

function TreeNodeSelect({
  node,
  selectedPath,
  onSelect,
  expandedPaths,
  onToggleExpand,
  currentItemPath,
  rootPath,
}: TreeNodeSelectProps) {
  if (node.type !== 'directory') return null

  const isExpanded = expandedPaths.has(node.path)
  const isSelected = selectedPath === node.path
  const isCurrentItem = node.path === currentItemPath || currentItemPath.startsWith(node.path + '/')
  const hasChildren = node.children && node.children.length > 0

  return (
    <div className="select-none">
      <div
        className={cn(
          'flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer hover:bg-accent',
          isSelected && 'bg-accent',
          isCurrentItem && 'opacity-50 pointer-events-none'
        )}
        onClick={() => !isCurrentItem && onSelect(node.path)}
      >
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (hasChildren && !isCurrentItem) {
              onToggleExpand(node.path)
            }
          }}
          className={cn(
            'size-5 flex items-center justify-center rounded hover:bg-accent',
            (!hasChildren || isCurrentItem) && 'invisible'
          )}
        >
          <ChevronRight className={cn('size-3.5 transition-transform', isExpanded && 'rotate-90')} />
        </button>
        {isExpanded ? (
          <FolderOpen className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <Folder className="size-4 shrink-0 text-muted-foreground" />
        )}
        <span className="text-sm truncate flex-1">{node.name}</span>
        {isSelected && (
          <span className="text-xs text-muted-foreground">复制到这里</span>
        )}
      </div>
      {isExpanded && hasChildren && (
        <div className="ml-4">
          {node.children!.map((child) => (
            <TreeNodeSelect
              key={child.path}
              node={child}
              selectedPath={selectedPath}
              onSelect={onSelect}
              expandedPaths={expandedPaths}
              onToggleExpand={onToggleExpand}
              currentItemPath={currentItemPath}
              rootPath={rootPath}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function CopyFileModal({
  open,
  onOpenChange,
  item,
  groups,
  onCopy,
}: CopyFileModalProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>('')
  const [selectedRoot, setSelectedRoot] = useState<string | null>(null)
  const [sourceRoot, setSourceRoot] = useState<string | null>(null)
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (item && open) {
      const parentPath = item.path.substring(0, item.path.lastIndexOf('/'))
      setSelectedPath(parentPath || '/')
      // item.path is a relative path (e.g., "/readme.md"), find which group contains this file
      // Need to recursively search through nested children since files is a tree structure
      const findFileInTree = (files: FileNode[], targetPath: string): boolean => {
        return files.some(f => {
          if (f.path === targetPath) return true
          if (f.children && f.children.length > 0) {
            return findFileInTree(f.children, targetPath)
          }
          return false
        })
      }
      const itemGroup = groups.find(g => findFileInTree(g.files, item.path))
      const itemRootPath = itemGroup?.root.path || groups[0]?.root.path || null
      setSelectedRoot(itemRootPath)
      setSourceRoot(itemRootPath)
    }
  }, [item, open, groups])

  const handleToggleExpand = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  const handleCopy = () => {
    if (item && selectedPath !== null && selectedRoot !== null && sourceRoot !== null) {
      const fileName = item.path.split('/').pop() || ''
      const targetPath = selectedPath === '/'
        ? `/${fileName}`
        : `${selectedPath}/${fileName}`
      onCopy(item.path, targetPath, sourceRoot, selectedRoot)
      onOpenChange(false)
    }
  }

  if (!item) return null

  const activeGroup = groups.find(g => g.root.path === selectedRoot)
  const files = activeGroup?.files || []

  const displayPath = selectedPath
    ? selectedPath === '/'
      ? '目录'
      : selectedPath.split('/').filter(Boolean).join(' / ')
    : ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>复制到</DialogTitle>
          <DialogDescription>
            选择要将「{item.name}」复制到的目标位置
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
          <FileText className="size-4 shrink-0" />
          <span className="truncate">{item.name}</span>
        </div>
        
        {groups.length > 1 && (
          <div className="mb-3">
            <label className="text-xs text-muted-foreground mb-1.5 block">目标目录</label>
            <select
              value={selectedRoot || ''}
              onChange={(e) => {
                setSelectedRoot(e.target.value)
                setSelectedPath('/')
                setExpandedPaths(new Set())
              }}
              className="w-full px-3 py-2 text-sm border rounded-md bg-background"
            >
              {groups.map((group) => (
                <option key={group.root.path} value={group.root.path}>
                  {group.root.path.split('/').pop() || group.root.path}
                </option>
              ))}
            </select>
          </div>
        )}

        <ScrollArea className="flex-1 max-h-[300px] border rounded-md p-2">
          <div className="space-y-0.5">
            <div
              className={cn(
                'flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer hover:bg-accent',
                selectedPath === '/' && 'bg-accent'
              )}
              onClick={() => setSelectedPath('/')}
            >
              <Folder className="size-4 shrink-0 text-muted-foreground" />
              <span className="text-sm">目录</span>
              {selectedPath === '/' && (
                <span className="text-xs text-muted-foreground ml-auto">复制到这里</span>
              )}
            </div>
            {files.map((node) => (
              <TreeNodeSelect
                key={node.path}
                node={node}
                selectedPath={selectedPath}
                onSelect={setSelectedPath}
                expandedPaths={expandedPaths}
                onToggleExpand={handleToggleExpand}
                currentItemPath={item.path}
                rootPath={selectedRoot || ''}
              />
            ))}
          </div>
        </ScrollArea>
        <div className="text-xs text-muted-foreground py-2">
          目标位置: <span className="font-medium text-foreground">{displayPath}</span>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleCopy} disabled={selectedPath === null}>
            复制
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
