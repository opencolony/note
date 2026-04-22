import { memo, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from './ui/button'
import { cn } from '../lib/utils'

interface TabBarProps {
  tabOrder: string[]
  tabs: Map<string, { path: string; content: string; lastSavedContent: string; rootPath: string | null; status?: string }>
  activeTabPath: string | null
  onActivate: (path: string, rootPath: string | null) => void
  onCloseRequest: (path: string) => void
  isMobile: boolean
  rightContent?: ReactNode
}

export const TabBar = memo(function TabBar({
  tabOrder,
  tabs,
  activeTabPath,
  onActivate,
  onCloseRequest,
  isMobile,
  rightContent,
}: TabBarProps) {
  if (tabOrder.length === 0) return null

  return (
    <div className="flex items-center bg-muted/20 border-b border-border shrink-0">
      {/* Scrollable tabs */}
      <div className="flex items-center gap-0 overflow-x-auto overflow-y-hidden flex-1" style={{ WebkitOverflowScrolling: 'touch' }}>
        {tabOrder.map(path => {
          const tab = tabs.get(path)
          if (!tab) return null
          const fileName = path.split('/').pop() || path
          const isActive = path === activeTabPath
          const isDirty = tab.content !== tab.lastSavedContent

          return (
            <div
              key={path}
              className={cn(
                'group flex items-center gap-1 h-9 px-3 text-xs cursor-pointer border-r border-border min-w-[100px] max-w-[200px] shrink-0 select-none transition-colors',
                isActive
                  ? 'bg-background text-foreground'
                  : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
              )}
              onClick={() => onActivate(path, tab.rootPath)}
            >
              {isDirty && (
                <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
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
                  onCloseRequest(path)
                }}
                title="关闭标签"
              >
                <X className="size-3" />
              </Button>
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
