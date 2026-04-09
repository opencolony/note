import { memo, SetStateAction, useState, useRef, useEffect } from 'react'
import { ChevronRight, File, Folder, Trash2, FileText, MoreHorizontal } from 'lucide-react'
import { cn } from '@/client/lib/utils'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from './ui/sidebar'
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
import { FileItemMenu } from './FileItemMenu'

interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  rootPath: string
  children?: FileNode[]
}

interface FileTreeProps {
  files: FileNode[]
  activePath: string | null
  activeRoot: string | null
  currentDir: string
  expandedPaths: Set<string>
  setExpandedPaths: React.Dispatch<React.SetStateAction<Set<string>>>
  onSelect: (path: string, type: 'file' | 'directory', rootPath?: string) => void
  onDelete: (path: string) => void
  onRenameRequest: (item: { path: string; name: string; type: 'file' | 'directory' }) => void
  onMoveRequest: (item: { path: string; name: string; type: 'file' | 'directory' }) => void
  onCopyRequest?: (item: { path: string; name: string; type: 'file' | 'directory' }) => void
  onExpand?: (path: string) => void
  editingType?: 'file' | 'directory' | null
  onEditingChange?: (type: 'file' | 'directory' | null) => void
  onCreateSubmit?: (name: string, isDirectory: boolean) => void
  onCreateRequest?: (isDirectory: boolean, parentPath: string) => void
}

function TreeNode({ node, activePath, expandedPaths, setExpandedPaths, onSelect, onDelete, onRenameRequest, onMoveRequest, onCopyRequest, onExpand, editingType, onEditingChange, onCreateSubmit, onCreateRequest, currentDir, activeRoot }: {
  node: FileNode
  activePath: string | null
  expandedPaths: Set<string>
  setExpandedPaths: React.Dispatch<SetStateAction<Set<string>>>
  onSelect: (path: string, type: 'file' | 'directory', rootPath?: string) => void
  onDelete: (path: string) => void
  onRenameRequest: (item: { path: string; name: string; type: 'file' | 'directory' }) => void
  onMoveRequest: (item: { path: string; name: string; type: 'file' | 'directory' }) => void
  onCopyRequest?: (item: { path: string; name: string; type: 'file' | 'directory' }) => void
  onExpand?: (path: string) => void
  editingType?: 'file' | 'directory' | null
  onEditingChange?: (type: 'file' | 'directory' | null) => void
  onCreateSubmit?: (name: string, isDirectory: boolean) => void
  onCreateRequest?: (isDirectory: boolean, parentPath: string) => void
  currentDir: string
  activeRoot: string | null
}) {
  const [editName, setEditName] = useState('')
  const [menuItem, setMenuItem] = useState<{ path: string; name: string; type: 'file' | 'directory'; childrenCount?: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const isDirectory = node.type === 'directory'
  const isActive = node.path === activePath && node.rootPath === activeRoot
  const isExpanded = expandedPaths.has(node.path)
  const hasChildren = isDirectory && node.children && node.children.length > 0
  const childrenCount = node.children?.length || 0
  useEffect(() => {
    if (editingType && node.path === currentDir) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
    }
  }, [editingType, currentDir])

  const handleEditSubmit = () => {
    if (editName.trim() && onCreateSubmit) {
      onCreateSubmit(editName.trim(), editingType === 'directory')
      setEditName('')
      onEditingChange?.(null)
    }
  }

  const handleEditBlur = () => {
    if (editName.trim() && onCreateSubmit) {
      handleEditSubmit()
    } else {
      setEditName('')
      onEditingChange?.(null)
    }
  }

  if (!isDirectory) {
    return (
      <SidebarMenuItem className="sidebar-menu-item">
        <SidebarMenuButton
          isActive={isActive}
          className="data-[active=true]:bg-sidebar-accent pr-8"
          onClick={() => onSelect(node.path, 'file', activeRoot || undefined)}
        >
          <File className="size-4 shrink-0" />
          <span className="flex-1 whitespace-nowrap">{node.name}</span>
        </SidebarMenuButton>
        <button
            data-sidebar="menu-action"
            onClick={(e) => {
              e.stopPropagation()
              setMenuItem({ path: node.path, name: node.name, type: 'file' })
            }}
            className="sidebar-menu-item-action absolute right-1 top-1/2 -translate-y-1/2 size-6 flex items-center justify-center rounded-md hover:bg-accent z-10"
          >
            <MoreHorizontal className="size-3.5" />
          </button>

         <FileItemMenu
          item={menuItem}
          currentDir={currentDir}
          onRenameRequest={onRenameRequest}
          onMoveRequest={onMoveRequest}
          onCopyRequest={onCopyRequest}
          onDelete={onDelete}
          onCreateRequest={onCreateRequest}
        />
      </SidebarMenuItem>
    )
  }

  return (
    <SidebarMenuItem className="sidebar-menu-item">
      <Collapsible
        className="group/collapsible"
        open={isExpanded}
        onOpenChange={(open) => {
          if (open && onExpand) {
            onExpand(node.path)
          }
          setExpandedPaths((prev) => {
            const next = new Set(prev)
            if (open) {
              next.add(node.path)
            } else {
              next.delete(node.path)
            }
            return next
          })
        }}
      >
        <div className="flex items-center relative">
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              isActive={isActive}
              className="data-[active=true]:bg-transparent flex-1 pr-8"
            >
              <ChevronRight className={cn("size-4 shrink-0 transition-transform", isExpanded && "rotate-90")} />
              <Folder className="size-4 shrink-0" />
              <span className="flex-1 whitespace-nowrap">{node.name}</span>
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <button
              data-sidebar="menu-action"
              onClick={() => setMenuItem({ path: node.path, name: node.name, type: 'directory', childrenCount })}
              className="sidebar-menu-item-action absolute right-1 top-1/2 -translate-y-1/2 size-6 flex items-center justify-center rounded-md hover:bg-accent z-10"
            >
              <MoreHorizontal className="size-3.5" />
            </button>
        </div>

        <FileItemMenu
          item={menuItem}
          currentDir={currentDir}
          onRenameRequest={onRenameRequest}
          onMoveRequest={onMoveRequest}
          onCopyRequest={onCopyRequest}
          onDelete={onDelete}
          onCreateRequest={onCreateRequest}
        />

        <CollapsibleContent>
          <SidebarMenuSub>
            {node.children?.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                activePath={activePath}
                expandedPaths={expandedPaths}
                setExpandedPaths={setExpandedPaths}
                onSelect={onSelect}
                onDelete={onDelete}
                onRenameRequest={onRenameRequest}
                onMoveRequest={onMoveRequest}
                onCopyRequest={onCopyRequest}
                onExpand={onExpand}
                editingType={editingType}
                onEditingChange={onEditingChange}
                onCreateSubmit={onCreateSubmit}
                onCreateRequest={onCreateRequest}
                currentDir={currentDir}
                activeRoot={activeRoot}
              />
            ))}
            {editingType && node.path === currentDir && (
              <SidebarMenuItem className="px-2">
                <div className="flex items-center gap-2 py-1.5">
                  {editingType === 'directory' ? (
                    <Folder className="size-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <Input
                    ref={inputRef}
                    id={`create-input-${node.path}`}
                    placeholder={editingType === 'directory' ? '文件夹名称' : '文件名称'}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleEditSubmit()
                      } else if (e.key === 'Escape') {
                        setEditName('')
                        onEditingChange?.(null)
                      }
                    }}
                    onBlur={handleEditBlur}
                    className="h-7 text-sm"
                    autoFocus
                  />
                </div>
              </SidebarMenuItem>
            )}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  )
}

const EmptyState = ({ activeRoot }: { activeRoot: string | null }) => {
  const rootName = activeRoot?.split('/').pop() || '根目录'
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm text-center p-6">
      <Folder className="size-12 mb-4 opacity-50" />
      <div className="mb-2">根目录「{rootName}」暂无文件</div>
      <p className="text-xs">
        点击上方「新建文件」按钮创建第一个文件
      </p>
    </div>
  )
}

export const FileTree = memo(function FileTree({ files, activePath, activeRoot, currentDir, expandedPaths, setExpandedPaths, onSelect, onDelete, onRenameRequest, onMoveRequest, onCopyRequest, onExpand, editingType, onEditingChange, onCreateSubmit, onCreateRequest }: FileTreeProps) {
  const [editName, setEditName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingType && inputRef.current) {
      inputRef.current.focus()
    }
  }, [editingType])

  const handleEditSubmit = () => {
    if (editName.trim() && onCreateSubmit) {
      onCreateSubmit(editName.trim(), editingType === 'directory')
      setEditName('')
      if (onEditingChange) {
        onEditingChange(null)
      }
    }
  }

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditSubmit()
    } else if (e.key === 'Escape') {
      setEditName('')
      if (onEditingChange) {
        onEditingChange(null)
      }
    }
  }

  const handleEditBlur = () => {
    if (editName.trim() && onCreateSubmit) {
      handleEditSubmit()
    } else {
      setEditName('')
      if (onEditingChange) {
        onEditingChange(null)
      }
    }
  }

  const displayPath = currentDir ? currentDir.split('/').filter(Boolean).join(' / ') : '根目录'

  if (files.length === 0 && !editingType) {
    return (
      <div className="flex-1 overflow-y-auto">
        <EmptyState activeRoot={activeRoot} />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-auto">
      <div className="min-w-max">
        <SidebarGroup>
          <div className="flex items-center justify-between px-2">
            <SidebarGroupLabel>Files</SidebarGroupLabel>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => onCreateRequest?.(false, '')}
                title="新建文件"
              >
                <FileText className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => onCreateRequest?.(true, '')}
                title="新建文件夹"
              >
                <Folder className="size-4" />
              </Button>
            </div>
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {files.map((node) => (
                <TreeNode
                  key={node.path}
                  node={node}
                  activePath={activePath}
                  expandedPaths={expandedPaths}
                  setExpandedPaths={setExpandedPaths}
                  onSelect={onSelect}
                  onDelete={onDelete}
                  onRenameRequest={onRenameRequest}
                  onMoveRequest={onMoveRequest}
                  onCopyRequest={onCopyRequest}
                  onExpand={onExpand}
                  editingType={editingType}
                  onEditingChange={onEditingChange}
                  onCreateSubmit={onCreateSubmit}
                  onCreateRequest={onCreateRequest}
                  currentDir={currentDir}
                  activeRoot={activeRoot}
                />
              ))}
              {editingType && (currentDir === '' || currentDir === '/') && (
                <SidebarMenuItem className="sidebar-menu-item">
                  <div className="flex items-center gap-2 px-2 py-1.5 w-full">
                    {editingType === 'directory' ? (
                      <Folder className="size-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <Input
                      id="root-create-input"
                      placeholder={editingType === 'directory' ? '文件夹名称' : '文件名称'}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={handleEditKeyDown}
                      onBlur={handleEditBlur}
                      className="h-7 text-sm"
                      autoFocus
                    />
                  </div>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {editingType && (
          <div className="px-4 py-2 text-xs text-muted-foreground border-t">
            位置: {displayPath}
          </div>
        )}
      </div>
    </div>
  )
})