import { memo, type ReactNode, useMemo } from 'react'
import { X, Pin } from 'lucide-react'
import { Button } from './ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from './ui/context-menu'
import { cn } from '../lib/utils'
import type { DirConfig } from '../lib/types'

interface TabBarProps {
  tabOrder: string[]
  tabs: Map<string, { key: string; path: string; content: string; lastSavedContent: string; rootPath: string | null; status?: string; isPinned: boolean; isPreview: boolean }>
  activeTabKey: string | null
  onActivate: (key: string) => void
  onCloseRequest: (key: string) => void
  onTogglePin: (key: string) => void
  onCloseOtherTabs: (key: string) => void
  onCloseRightTabs: (key: string) => void
  onCloseLeftTabs: (key: string) => void
  onCloseAllTabs: () => void
  onCloseGroupTabs: (rootPath: string | null) => void
  onCloseOtherGroupTabs: (rootPath: string | null) => void
  isMobile: boolean
  rightContent?: ReactNode
  dirs?: DirConfig[]
}

function getDirName(rootPath: string | null, dirs?: DirConfig[]): string {
  if (!rootPath) return ''
  const dir = dirs?.find(d => d.path === rootPath)
  return dir?.name || rootPath.split('/').pop() || rootPath
}

/** 项目色板 */
const PROJECT_COLORS = [
  '#2563eb', // blue-600
  '#059669', // emerald-600
  '#d97706', // amber-600
  '#7c3aed', // violet-600
  '#e11d48', // rose-600
  '#0891b2', // cyan-600
]

function getProjectColor(index: number): string {
  return PROJECT_COLORS[index % PROJECT_COLORS.length]
}

export const TabBar = memo(function TabBar({
  tabOrder,
  tabs,
  activeTabKey,
  onActivate,
  onCloseRequest,
  onTogglePin,
  onCloseOtherTabs,
  onCloseRightTabs,
  onCloseLeftTabs,
  onCloseAllTabs,
  onCloseGroupTabs,
  onCloseOtherGroupTabs,
  isMobile,
  rightContent,
  dirs,
}: TabBarProps) {
  if (tabOrder.length === 0) return null

  // 按 rootPath 分组
  const grouped = useMemo(() => {
    const map = new Map<string | null, string[]>()
    for (const key of tabOrder) {
      const tab = tabs.get(key)
      if (!tab) continue
      const root = tab.rootPath
      if (!map.has(root)) map.set(root, [])
      map.get(root)!.push(key)
    }
    return map
  }, [tabOrder, tabs])

  const showGroups = grouped.size > 1

  // rootPath -> 颜色索引
  const rootPathToColorIndex = useMemo(() => {
    const map = new Map<string | null, number>()
    let i = 0
    for (const [root] of grouped.entries()) {
      map.set(root, i++)
    }
    return map
  }, [grouped])

  // Tabs 渲染内容（移动端和桌面端共用）
  const tabsContent = Array.from(grouped.entries()).map(([rootPath, keys], groupIdx) => {
    const colorIndex = rootPathToColorIndex.get(rootPath) ?? 0
    const projectColor = getProjectColor(colorIndex)

    return (
      <div key={rootPath ?? 'null'} className="flex items-center gap-1.5 shrink-0">
        {/* 组间彩色竖线分隔 */}
        {showGroups && groupIdx > 0 && (
          <div className={cn('flex items-center self-stretch shrink-0', isMobile ? 'px-0.5' : 'px-1')}>
            <div className={cn('rounded-full', isMobile ? 'w-[1.5px] h-4' : 'w-[2px] h-5')} style={{ backgroundColor: projectColor }} />
          </div>
        )}
        {/* 组名标签 */}
        {showGroups && (
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <span
                className="px-2 py-1 text-[10px] font-medium text-muted-foreground bg-muted/40 rounded shrink-0 select-none cursor-pointer"
                style={{ color: projectColor }}
              >
                {getDirName(rootPath, dirs)}
              </span>
            </ContextMenuTrigger>
            <ContextMenuContent onOpenAutoFocus={(e) => e.preventDefault()}>
              <ContextMenuItem onClick={() => onCloseGroupTabs(rootPath)}>
                关闭分组
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onCloseOtherGroupTabs(rootPath)}>
                关闭分组其他
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        )}
        {/* 组内 tabs */}
        {keys.map(key => {
          const tab = tabs.get(key)
          if (!tab) return null
          const fileName = tab.path.split('/').pop() || tab.path
          const isActive = key === activeTabKey
          const isDirty = tab.content !== tab.lastSavedContent
          const isPinned = tab.isPinned
          const isPreview = tab.isPreview

          return (
            <ContextMenu key={key}>
              <ContextMenuTrigger asChild>
                <div
                  className={cn(
                    'group flex items-center gap-1.5 text-xs cursor-pointer rounded-lg border shrink-0 select-none transition-all duration-150',
                    isMobile
                      ? 'px-1.5 py-[3px] gap-0.5 min-w-[52px] max-w-[100px] text-[10px]'
                      : 'px-3 py-1.5 gap-1.5 min-w-[100px] max-w-[200px]',
                    isActive
                      ? 'bg-background text-foreground border-border shadow-sm translate-y-[-1px]'
                      : 'bg-transparent text-muted-foreground border-transparent hover:bg-muted/50'
                  )}
                  onClick={() => onActivate(key)}
                  onDoubleClick={() => onTogglePin(key)}
                >
                  {/* 项目色圆点 — 多项目时显示（非 pinned） */}
                  {showGroups && !isPinned && (
                    <span
                      className={cn('rounded-full shrink-0', isMobile ? 'size-1' : 'size-1.5')}
                      style={{ backgroundColor: projectColor }}
                    />
                  )}
                  {/* Pinned 图标 */}
                  {isPinned && (
                    <Pin className={cn('text-muted-foreground shrink-0 fill-muted-foreground', isMobile ? 'size-2.5' : 'size-3')} />
                  )}
                  {/* Dirty 圆点 */}
                  {isDirty && !isPinned && (
                    <span className={cn('rounded-full bg-primary shrink-0', isMobile ? 'size-1' : 'size-1.5')} />
                  )}
                  {/* 文件名 — preview 用斜体 */}
                  <span className={cn('truncate flex-1', isPreview && 'italic opacity-80')}>
                    {fileName}
                  </span>
                  {/* Pin/Unpin 按钮 — 桌面端 hover 显示，移动端仅在 active tab 显示 */}
                  {(!isPinned && (!isMobile || isActive)) && (isMobile ? (
                    <button
                      className={cn(
                        'shrink-0 flex items-center justify-center rounded-sm opacity-100',
                        isActive ? 'hover:bg-muted' : 'hover:bg-muted/50'
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        onTogglePin(key)
                      }}
                      title="固定标签"
                    >
                      <Pin className="size-2.5" />
                    </button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'shrink-0 rounded-sm size-5 min-w-5 min-h-5 opacity-0 group-hover:opacity-100',
                        isActive ? 'hover:bg-muted' : 'hover:bg-muted/50'
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        onTogglePin(key)
                      }}
                      title="固定标签"
                    >
                      <Pin className="size-3" />
                    </Button>
                  ))}
                  {/* Unpin 按钮 — pinned tab 显示，移动端仅在 active tab 显示 */}
                  {(isPinned && (!isMobile || isActive)) && (isMobile ? (
                    <button
                      className={cn(
                        'shrink-0 flex items-center justify-center rounded-sm opacity-100',
                        isActive ? 'hover:bg-muted' : 'hover:bg-muted/50'
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        onTogglePin(key)
                      }}
                      title="取消固定"
                    >
                      <Pin className="size-2.5 fill-muted-foreground" />
                    </button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'shrink-0 rounded-sm size-5 min-w-5 min-h-5 opacity-0 group-hover:opacity-100',
                        isActive ? 'hover:bg-muted' : 'hover:bg-muted/50'
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        onTogglePin(key)
                      }}
                      title="取消固定"
                    >
                      <Pin className="size-3 fill-muted-foreground" />
                    </Button>
                  ))}
                  {/* 关闭按钮 — 始终显示（移动端），hover 显示（桌面端） */}
                  {isMobile ? (
                    <button
                      className={cn(
                        'shrink-0 flex items-center justify-center rounded-sm opacity-100',
                        isActive ? 'hover:bg-muted' : 'hover:bg-muted/50'
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        onCloseRequest(key)
                      }}
                      title="关闭标签"
                    >
                      <X className="size-2.5" />
                    </button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'shrink-0 rounded-sm size-5 min-w-5 min-h-5 opacity-0 group-hover:opacity-100',
                        isActive ? 'hover:bg-muted' : 'hover:bg-muted/50'
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        onCloseRequest(key)
                      }}
                      title="关闭标签"
                    >
                      <X className="size-3" />
                    </Button>
                  )}
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent onOpenAutoFocus={(e) => e.preventDefault()}>
                <ContextMenuItem onClick={() => onCloseRequest(key)}>
                  关闭标签
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onCloseOtherTabs(key)}>
                  关闭其他标签
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onCloseRightTabs(key)}>
                  关闭右侧标签
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onCloseLeftTabs(key)}>
                  关闭左侧标签
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => onTogglePin(key)}>
                  {isPinned ? '取消固定' : '固定标签'}
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => onCloseAllTabs()}>
                  关闭所有标签
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          )
        })}
      </div>
    )
  })

  return (
    <div className="flex items-center bg-muted/20 border-b border-border shrink-0">
      {/* Scrollable tabs — 移动端不使用外层 ContextMenu，避免嵌套触发冲突 */}
      {isMobile ? (
        <div
          className="flex items-center gap-0.5 px-1.5 py-1 overflow-x-auto overflow-y-hidden flex-1 tabbar-scroll-hide"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {tabsContent}
        </div>
      ) : (
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto overflow-y-hidden flex-1 tabbar-scroll-hide"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {tabsContent}
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent onOpenAutoFocus={(e) => e.preventDefault()}>
            <ContextMenuItem onClick={() => onCloseAllTabs()}>
              关闭所有标签
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      )}

      {/* Right content (status + actions), pinned, not scrollable */}
      {rightContent && (
        <div className="flex items-center gap-2 px-3 h-9 shrink-0 text-xs text-muted-foreground">
          {rightContent}
        </div>
      )}
    </div>
  )
})
