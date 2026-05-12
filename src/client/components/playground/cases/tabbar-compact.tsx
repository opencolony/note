import { useState } from 'react'
import { X, Pin } from 'lucide-react'
import { cn } from '@/client/lib/utils'
import type { PlaygroundCase } from '../types'

// 项目色板
const GROUP_COLORS = ['#2563eb', '#059669', '#d97706']

interface MockTab {
  id: string
  name: string
  active: boolean
  dirty: boolean
  pinned: boolean
  preview: boolean
  groupIndex: number
}

const mockTabs: MockTab[] = [
  { id: '1', name: 'LSP支持.md', active: false, dirty: false, pinned: false, preview: false, groupIndex: 0 },
  { id: '2', name: '项目介绍.md', active: true, dirty: true, pinned: false, preview: false, groupIndex: 0 },
  { id: '3', name: 'index.md', active: false, dirty: false, pinned: true, preview: false, groupIndex: 0 },
  { id: '4', name: 'index.md', active: false, dirty: false, pinned: false, preview: true, groupIndex: 1 },
  { id: '5', name: 'implementation-plan.md', active: false, dirty: true, pinned: false, preview: false, groupIndex: 1 },
]

const mockGroups = [
  { name: 'workspace', color: GROUP_COLORS[0] },
  { name: 'brain', color: GROUP_COLORS[1] },
]

/** 移动端模拟容器 */
function MobileViewport({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="bg-muted/40 px-3 py-1.5 text-[10px] text-muted-foreground font-mono border-b border-border">
        {label} — 375px 视口
      </div>
      <div className="w-[375px] max-w-full overflow-hidden">{children}</div>
    </div>
  )
}

/** 组分隔线 */
function GroupDivider({ color }: { color: string }) {
  return (
    <div className="flex items-center self-stretch px-0.5 shrink-0">
      <div className="w-[2px] h-4 rounded-full" style={{ backgroundColor: color }} />
    </div>
  )
}

/** 组名标签 */
function GroupLabel({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="px-1.5 py-0.5 text-[9px] font-medium bg-muted/40 rounded shrink-0 select-none"
      style={{ color }}
    >
      {name}
    </span>
  )
}

// ───────────────────────────────────────────────
// 方案 A：紧凑标准式
// 保持完整功能，全面缩小各元素尺寸
// ───────────────────────────────────────────────
function StyleCompact() {
  const [tabs, setTabs] = useState(mockTabs)
  const activeId = tabs.find(t => t.active)?.id

  return (
    <MobileViewport label="方案 A：紧凑标准式">
      <div className="flex items-center gap-1 px-2 py-1.5 bg-muted/20 overflow-x-auto">
        {mockGroups.map((group, gIdx) => (
          <div key={gIdx} className="flex items-center gap-1 shrink-0">
            {gIdx > 0 && <GroupDivider color={group.color} />}
            <GroupLabel name={group.name} color={group.color} />
            {tabs
              .filter(t => t.groupIndex === gIdx)
              .map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setTabs(tabs.map(t => ({ ...t, active: t.id === tab.id })))}
                  className={cn(
                    'group flex items-center gap-1 text-[10px] cursor-pointer rounded-md border shrink-0 select-none transition-all duration-150 leading-none',
                    'px-2 py-1 min-w-[60px] max-w-[120px]',
                    tab.active
                      ? 'bg-background text-foreground border-border shadow-sm'
                      : 'bg-transparent text-muted-foreground border-transparent hover:bg-muted/50'
                  )}
                >
                  {!tab.pinned && (
                    <span className="size-1 rounded-full shrink-0" style={{ backgroundColor: group.color }} />
                  )}
                  {tab.pinned && <Pin className="size-2.5 text-muted-foreground shrink-0 fill-muted-foreground" />}
                  {tab.dirty && !tab.pinned && <span className="size-1 rounded-full bg-primary shrink-0" />}
                  <span className={cn('truncate flex-1', tab.preview && 'italic opacity-80')}>
                    {tab.name}
                  </span>
                  {/* Pin/Unpin — 仅在 active 时显示 */}
                  {tab.active && (
                    <span className="shrink-0" onClick={(e) => { e.stopPropagation(); setTabs(tabs.map(t => t.id === tab.id ? { ...t, pinned: !t.pinned } : t)) }}>
                      <Pin className={cn('size-2.5 text-muted-foreground', tab.pinned && 'fill-muted-foreground')} />
                    </span>
                  )}
                  {/* 关闭 — 始终显示 */}
                  <span className="shrink-0">
                    <X className="size-2.5 text-muted-foreground" />
                  </span>
                </button>
              ))}
          </div>
        ))}
      </div>
    </MobileViewport>
  )
}

// ───────────────────────────────────────────────
// 方案 B：纯文本胶囊式
// 去掉所有图标按钮，只保留文件名和 dirty 指示，极致收窄
// ───────────────────────────────────────────────
function StyleTextOnly() {
  const [tabs, setTabs] = useState(mockTabs)

  return (
    <MobileViewport label="方案 B：纯文本胶囊式">
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-muted/20 overflow-x-auto">
        {mockGroups.map((group, gIdx) => (
          <div key={gIdx} className="flex items-center gap-0.5 shrink-0">
            {gIdx > 0 && <GroupDivider color={group.color} />}
            <GroupLabel name={group.name} color={group.color} />
            {tabs
              .filter(t => t.groupIndex === gIdx)
              .map(tab => {
                const isActive = tab.active
                return (
                  <button
                    key={tab.id}
                    onClick={() => setTabs(tabs.map(t => ({ ...t, active: t.id === tab.id })))}
                    className={cn(
                      'flex items-center gap-1 text-[10px] cursor-pointer rounded-full border shrink-0 select-none transition-all duration-150 leading-none',
                      'px-2 py-1 min-w-[48px] max-w-[100px]',
                      isActive
                        ? 'bg-background text-foreground border-border shadow-sm'
                        : 'bg-transparent text-muted-foreground border-transparent hover:bg-muted/50'
                    )}
                  >
                    {tab.dirty && !tab.pinned && (
                      <span className="size-[3px] rounded-full bg-primary shrink-0" />
                    )}
                    <span className={cn('truncate', tab.preview && 'italic opacity-80')}>
                      {tab.name}
                    </span>
                    {tab.pinned && (
                      <span className="text-[8px] text-muted-foreground shrink-0">●</span>
                    )}
                  </button>
                )
              })}
          </div>
        ))}
      </div>
    </MobileViewport>
  )
}

// ───────────────────────────────────────────────
// 方案 C：图标缩微式
// 保留全部功能按钮，但将所有元素压到最小尺寸
// ───────────────────────────────────────────────
function StyleMicro() {
  const [tabs, setTabs] = useState(mockTabs)

  return (
    <MobileViewport label="方案 C：图标缩微式">
      <div className="flex items-center gap-0.5 px-1.5 py-1 bg-muted/20 overflow-x-auto">
        {mockGroups.map((group, gIdx) => (
          <div key={gIdx} className="flex items-center gap-0.5 shrink-0">
            {gIdx > 0 && (
              <div className="flex items-center self-stretch px-0.5 shrink-0">
                <div className="w-[1.5px] h-3.5 rounded-full" style={{ backgroundColor: group.color }} />
              </div>
            )}
            <span
              className="px-1 py-0 text-[8px] font-medium bg-muted/40 rounded shrink-0 select-none leading-none"
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
                    'group flex items-center gap-0.5 text-[9px] cursor-pointer rounded border shrink-0 select-none transition-all duration-150 leading-none',
                    'px-1.5 py-[3px] min-w-[52px] max-w-[95px]',
                    tab.active
                      ? 'bg-background text-foreground border-border'
                      : 'bg-transparent text-muted-foreground border-transparent hover:bg-muted/50'
                  )}
                >
                  {!tab.pinned && (
                    <span className="size-[3px] rounded-full shrink-0" style={{ backgroundColor: group.color }} />
                  )}
                  {tab.pinned && <Pin className="size-2 text-muted-foreground shrink-0 fill-muted-foreground" />}
                  {tab.dirty && !tab.pinned && <span className="size-[3px] rounded-full bg-primary shrink-0" />}
                  <span className={cn('truncate flex-1', tab.preview && 'italic opacity-80')}>
                    {tab.name}
                  </span>
                  {/* Pin/Unpin — 仅在 active 时显示 */}
                  {tab.active && (
                    <span className="shrink-0" onClick={(e) => { e.stopPropagation(); setTabs(tabs.map(t => t.id === tab.id ? { ...t, pinned: !t.pinned } : t)) }}>
                      <Pin className={cn('size-2 text-muted-foreground', tab.pinned && 'fill-muted-foreground')} />
                    </span>
                  )}
                  {/* 关闭 — 始终显示 */}
                  <span className="shrink-0">
                    <X className="size-2 text-muted-foreground" />
                  </span>
                </button>
              ))}
          </div>
        ))}
      </div>
    </MobileViewport>
  )
}

// ───────────────────────────────────────────────
// 方案 D：iOS 分段式
// 同一组内 tabs 合并为一个分段控制器整体，组间用颜色区分
// ───────────────────────────────────────────────
function StyleSegmented() {
  const [tabs, setTabs] = useState(mockTabs)

  return (
    <MobileViewport label="方案 D：iOS 分段式">
      <div className="flex items-center gap-1.5 px-2 py-1.5 bg-muted/20 overflow-x-auto">
        {mockGroups.map((group, gIdx) => {
          const groupTabs = tabs.filter(t => t.groupIndex === gIdx)
          return (
            <div key={gIdx} className="flex items-center shrink-0">
              {gIdx > 0 && <GroupDivider color={group.color} />}
              <div className="flex items-center bg-muted/60 rounded-lg p-0.5">
                {groupTabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setTabs(tabs.map(t => ({ ...t, active: t.id === tab.id })))}
                    className={cn(
                      'relative flex items-center gap-1 text-[10px] cursor-pointer rounded-md shrink-0 select-none transition-all duration-150 leading-none',
                      'px-2 py-1 min-w-[50px] max-w-[110px]',
                      tab.active
                        ? 'bg-background text-foreground shadow-sm'
                        : 'bg-transparent text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {tab.dirty && !tab.pinned && (
                      <span
                        className="size-1 rounded-full shrink-0"
                        style={{ backgroundColor: tab.active ? 'hsl(var(--primary))' : group.color }}
                      />
                    )}
                    <span className={cn('truncate flex-1', tab.preview && 'italic opacity-80')}>
                      {tab.name}
                    </span>
                    {/* Pin/Unpin — 仅在 active 时显示 */}
                    {tab.active && (
                      <span className="shrink-0" onClick={(e) => { e.stopPropagation(); setTabs(tabs.map(t => t.id === tab.id ? { ...t, pinned: !t.pinned } : t)) }}>
                        <Pin className={cn('size-2 text-muted-foreground', tab.pinned && 'fill-muted-foreground')} />
                      </span>
                    )}
                    {/* 关闭 — 始终显示 */}
                    <span className="shrink-0">
                      <X className="size-2 text-muted-foreground" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </MobileViewport>
  )
}

export const tabbarCompactCase: PlaygroundCase = {
  id: 'tabbar-compact',
  name: 'TabBar 移动端紧凑化',
  description: '减小 TabBar 各元素尺寸，使移动端一屏能容纳更多标签（当前约 3 个）',
  variants: [
    {
      name: '方案 A：紧凑标准式',
      description: '全面缩小 padding、按钮和字体，保持完整功能按钮',
      component: <StyleCompact />,
    },
    {
      name: '方案 B：纯文本胶囊式',
      description: '去掉图标按钮，只保留文件名和 dirty 指示，最窄宽度',
      component: <StyleTextOnly />,
    },
    {
      name: '方案 C：图标缩微式',
      description: '保留全部功能，但把所有元素压到最小尺寸',
      component: <StyleMicro />,
    },
    {
      name: '方案 D：iOS 分段式',
      description: '同一组内 tabs 合并为分段控制器，减少视觉分割',
      component: <StyleSegmented />,
    },
  ],
}
