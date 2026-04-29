import { memo, type ReactNode, useMemo } from 'react'
import { X } from 'lucide-react'
import { Button } from './ui/button'
import { cn } from '../lib/utils'
import type { DirConfig } from '../lib/types'

interface TabBarProps {
  tabOrder: string[]
  tabs: Map<string, { key: string; path: string; content: string; lastSavedContent: string; rootPath: string | null; status?: string }>
  activeTabKey: string | null
  onActivate: (key: string) => void
  onCloseRequest: (key: string) => void
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

  return (
    <div className="flex items-center bg-muted/20 border-b border-border shrink-0">
      {/* Scrollable tabs */}
      <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto overflow-y-hidden flex-1 tabbar-scroll-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
        {Array.from(grouped.entries()).map(([rootPath, keys], groupIdx) => {
          const colorIndex = rootPathToColorIndex.get(rootPath) ?? 0
          const projectColor = getProjectColor(colorIndex)

          return (
            <div key={rootPath ?? 'null'} className="flex items-center gap-1.5 shrink-0">
              {/* 组间彩色竖线分隔 */}
              {showGroups && groupIdx > 0 && (
                <div className="flex items-center self-stretch px-1 shrink-0">
                  <div className="w-[2px] h-5 rounded-full" style={{ backgroundColor: projectColor }} />
                </div>
              )}
              {/* 组名标签 */}
              {showGroups && (
                <span
                  className="px-2 py-1 text-[10px] font-medium text-muted-foreground bg-muted/40 rounded shrink-0 select-none"
                  style={{ color: projectColor }}
                >
                  {getDirName(rootPath, dirs)}
                </span>
              )}
              {/* 组内 tabs */}
              {keys.map(key => {
                const tab = tabs.get(key)
                if (!tab) return null
                const fileName = tab.path.split('/').pop() || tab.path
                const isActive = key === activeTabKey
                const isDirty = tab.content !== tab.lastSavedContent

                return (
                  <div
                    key={key}
                    className={cn(
                      'group flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer rounded-lg border min-w-[100px] max-w-[200px] shrink-0 select-none transition-all duration-150',
                      isActive
                        ? 'bg-background text-foreground border-border shadow-sm translate-y-[-1px]'
                        : 'bg-transparent text-muted-foreground border-transparent hover:bg-muted/50'
                    )}
                    onClick={() => onActivate(key)}
                  >
                    {/* 项目色圆点 — 多项目时显示 */}
                    {showGroups && (
                      <span
                        className="size-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: projectColor }}
                      />
                    )}
                    {isDirty && (
                      <span className="size-1.5 rounded-full bg-primary shrink-0" />
                    )}
                    <span className="truncate flex-1">{fileName}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'size-5 min-w-5 min-h-5 shrink-0 rounded-sm',
                        isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
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
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Right content (status + actions), pinned, not scrollable */}
      {rightContent && (
        <div className="flex items-center gap-2 px-3 h-9 shrink-0 text-xs text-muted-foreground">
          {rightContent}
        </div>
      )}
    </div>
  )
})
