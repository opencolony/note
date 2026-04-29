import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/client/lib/utils'
import type { PlaygroundCase } from '../types'

// 项目色板
const GROUP_COLORS = ['#2563eb', '#059669', '#d97706']

// 带项目分组的模拟数据
interface MockTab {
  id: string
  name: string
  active: boolean
  groupIndex: number
}

interface MockGroup {
  name: string
  color: string
}

const mockGroups: MockGroup[] = [
  { name: 'workspace', color: GROUP_COLORS[0] },
  { name: 'brain', color: GROUP_COLORS[1] },
]

const mockTabsWithGroups: MockTab[] = [
  { id: '1', name: 'LSP支持.md', active: false, groupIndex: 0 },
  { id: '2', name: '项目介绍.md', active: true, groupIndex: 0 },
  { id: '3', name: 'index.md', active: false, groupIndex: 0 },
  { id: '4', name: 'index.md', active: false, groupIndex: 1 },
  { id: '5', name: 'implementation-plan.md', active: false, groupIndex: 1 },
]

// 按分组渲染标签（通用辅助组件）
function TabBarContainer({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className="w-full bg-background border border-border rounded-lg overflow-hidden">
      <div className={cn('flex items-center overflow-x-auto', className)}>
        {children}
      </div>
      <div className="px-4 py-5 text-sm text-muted-foreground border-t border-border">
        多项目分组展示，每个组有独立的彩色标识
      </div>
    </div>
  )
}

// 组分隔线
function GroupDivider({ color }: { color: string }) {
  return (
    <div className="flex items-center self-stretch px-1 shrink-0">
      <div className="w-[2px] h-5 rounded-full" style={{ backgroundColor: color }} />
    </div>
  )
}

// 方案 A：圆角卡片式
function StyleCard() {
  const [tabs, setTabs] = useState(mockTabsWithGroups)

  return (
    <TabBarContainer className="gap-1.5 px-3 py-2.5 bg-muted/20">
      {mockGroups.map((group, gIdx) => (
        <div key={gIdx} className="flex items-center gap-1.5 shrink-0">
          {gIdx > 0 && <GroupDivider color={group.color} />}
          {/* 组名标签 */}
          <span
            className="px-2 py-1 text-[10px] font-medium text-muted-foreground bg-muted/40 rounded shrink-0"
            style={{ color: group.color }}
          >
            {group.name}
          </span>
          {tabs
            .filter(t => t.groupIndex === gIdx)
            .map(tab => (
              <button
                key={tab.id}
                onClick={() => setTabs(tabs.map(t => ({ ...t, active: t.id === tab.id })))}
                className={cn(
                  'group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-150 border shrink-0',
                  tab.active
                    ? 'bg-background text-foreground border-border shadow-sm translate-y-[-1px]'
                    : 'bg-transparent text-muted-foreground border-transparent hover:bg-muted/50'
                )}
              >
                <span
                  className="size-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: group.color }}
                />
                <span className="truncate max-w-[100px]">{tab.name}</span>
                <span className={cn('opacity-0 group-hover:opacity-100 transition-opacity', tab.active && 'opacity-100')}>
                  <X className="size-3 text-muted-foreground" />
                </span>
              </button>
            ))}
        </div>
      ))}
    </TabBarContainer>
  )
}

export const tabbarStylesCase: PlaygroundCase = {
  id: 'tabbar-styles',
  name: 'TabBar 样式设计',
  description: '重新设计标签栏的视觉风格（含项目分组），点击标签可切换激活态',
  variants: [
    {
      name: '方案 A：圆角卡片式',
      description: '标签像浮起的卡片，每组有彩色竖线分隔，组名标签在左侧',
      component: <StyleCard />,
    },
  ],
}
