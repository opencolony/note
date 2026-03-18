import { memo, SetStateAction, useState } from 'react'
import { ChevronRight, File, Folder, Trash2 } from 'lucide-react'
import { cn } from '@/client/lib/utils'
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

interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

interface FileTreeProps {
  files: FileNode[]
  activePath: string | null
  currentDir: string
  expandedPaths: Set<string>
  setExpandedPaths: React.Dispatch<React.SetStateAction<Set<string>>>
  onSelect: (path: string, type: 'file' | 'directory') => void
  onDelete: (path: string) => void
}

function TreeNode({ node, activePath, expandedPaths, setExpandedPaths, onSelect, onDelete }: {
  node: FileNode
  activePath: string | null
  expandedPaths: Set<string>
  setExpandedPaths: React.Dispatch<SetStateAction<Set<string>>>
  onSelect: (path: string, type: 'file' | 'directory') => void
  onDelete: (path: string) => void
}) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const isDirectory = node.type === 'directory'
  const isActive = node.path === activePath
  const isExpanded = expandedPaths.has(node.path)
  const hasChildren = isDirectory && node.children && node.children.length > 0

  if (!isDirectory) {
    return (
      <SidebarMenuItem className="sidebar-menu-item">
        <SidebarMenuButton
          isActive={isActive}
          className="data-[active=true]:bg-transparent pr-8"
          onClick={() => onSelect(node.path, 'file')}
        >
          <File className="size-4 shrink-0" />
          <span className="flex-1 whitespace-nowrap">{node.name}</span>
        </SidebarMenuButton>
        <button
            data-sidebar="menu-action"
            onClick={(e) => {
              e.stopPropagation()
              setDeleteDialogOpen(true)
            }}
            className="sidebar-menu-item-delete absolute right-1 top-1/2 -translate-y-1/2 size-6 flex items-center justify-center rounded-md hover:bg-destructive/10 hover:text-destructive z-10"
          >
            <Trash2 className="size-3.5" />
          </button>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                确定要删除 {node.name} 吗？此操作无法撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(node.path)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarMenuItem>
    )
  }

  return (
    <SidebarMenuItem className="sidebar-menu-item">
      <Collapsible
        className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
        open={isExpanded}
        onOpenChange={(open) => {
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
        <div className="flex items-center">
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              isActive={isActive}
              className="data-[active=true]:bg-transparent flex-1 pr-8"
            >
              <ChevronRight className="size-4 shrink-0 transition-transform" />
              <Folder className="size-4 shrink-0" />
              <span className="flex-1 whitespace-nowrap">{node.name}</span>
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <button
              data-sidebar="menu-action"
              onClick={() => setDeleteDialogOpen(true)}
              className="sidebar-menu-item-delete size-6 flex items-center justify-center rounded-md hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </button>
        </div>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                {hasChildren ? (
                  <span className="text-destructive font-medium">
                    文件夹「{node.name}」包含 {node.children?.length} 个项目，删除后将全部删除且无法恢复。确定要继续吗？
                  </span>
                ) : (
                  `确定要删除 ${node.name} 吗？此操作无法撤销。`
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(node.path)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  )
}

const EMPTY_STATE = (
  <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm text-center p-6">
    <Folder className="size-12 mb-4 opacity-50" />
    <div>暂无文件</div>
  </div>
)

export const FileTree = memo(function FileTree({ files, activePath, currentDir, expandedPaths, setExpandedPaths, onSelect, onDelete }: FileTreeProps) {
  if (files.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto">
        {EMPTY_STATE}
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-auto">
      <div className="min-w-max">
        <SidebarGroup>
          <SidebarGroupLabel>Files</SidebarGroupLabel>
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
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </div>
    </div>
  )
})