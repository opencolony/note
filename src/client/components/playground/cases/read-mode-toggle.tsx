import type { PlaygroundCase } from '../types'
import { Pencil, Code, BookOpen } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../../lib/utils'

type EditorMode = 'wysiwyg' | 'source' | 'read'

// 模拟当前激活状态的样式
const mockActiveMode: EditorMode = 'wysiwyg'

// ========== 方案 A：分段控制器（Segmented Control）==========
// 特点：三个模式在一个圆角条中，当前项高亮，适合精确展示状态
function ToggleSegmented() {
  const [mode, setMode] = useState<EditorMode>(mockActiveMode)

  const modes: { key: EditorMode; label: string; icon: React.ReactNode }[] = [
    { key: 'wysiwyg', label: '编辑', icon: <Pencil className="size-3.5" /> },
    { key: 'source', label: '源码', icon: <Code className="size-3.5" /> },
    { key: 'read', label: '阅读', icon: <BookOpen className="size-3.5" /> },
  ]

  return (
    <div className="inline-flex items-center rounded-lg bg-muted p-0.5 border border-border">
      {modes.map((m) => (
        <button
          key={m.key}
          onClick={() => setMode(m.key)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150',
            mode === m.key
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {m.icon}
          <span className="hidden sm:inline">{m.label}</span>
        </button>
      ))}
    </div>
  )
}

// ========== 方案 B：图标按钮组（Icon Button Group）==========
// 特点：三个独立图标按钮，当前项有背景高亮，更紧凑
function ToggleIconGroup() {
  const [mode, setMode] = useState<EditorMode>(mockActiveMode)

  const modes: { key: EditorMode; label: string; icon: React.ReactNode }[] = [
    { key: 'wysiwyg', label: '编辑', icon: <Pencil className="size-4" /> },
    { key: 'source', label: '源码', icon: <Code className="size-4" /> },
    { key: 'read', label: '阅读', icon: <BookOpen className="size-4" /> },
  ]

  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg bg-muted/50 p-0.5 border border-border/50">
      {modes.map((m) => (
        <button
          key={m.key}
          onClick={() => setMode(m.key)}
          title={m.label}
          className={cn(
            'flex items-center justify-center size-8 rounded-md transition-all duration-150',
            mode === m.key
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          {m.icon}
        </button>
      ))}
    </div>
  )
}

// ========== 方案 C：编辑/阅读双态 + 源码次级按钮 ==========
// 特点：主按钮在阅读/编辑之间切换（最常用的场景），源码模式作为独立图标按钮
function ToggleDualState() {
  const [mode, setMode] = useState<EditorMode>(mockActiveMode)

  const isRead = mode === 'read'

  return (
    <div className="inline-flex items-center gap-1">
      {/* 主切换：编辑 ↔ 阅读 */}
      <button
        onClick={() => setMode(isRead ? 'wysiwyg' : 'read')}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 border',
          isRead
            ? 'bg-primary/10 text-primary border-primary/20'
            : 'bg-muted text-muted-foreground border-border hover:text-foreground'
        )}
      >
        {isRead ? <BookOpen className="size-3.5" /> : <Pencil className="size-3.5" />}
        <span>{isRead ? '阅读中' : '编辑中'}</span>
      </button>
      {/* 源码模式独立按钮 */}
      <button
        onClick={() => setMode('source')}
        title="源码模式"
        className={cn(
          'flex items-center justify-center size-8 rounded-lg transition-all duration-150 border',
          mode === 'source'
            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
            : 'bg-muted text-muted-foreground border-border hover:text-foreground'
        )}
      >
        <Code className="size-3.5" />
      </button>
    </div>
  )
}

// ========== 方案 D：循环切换按钮（Cycle Toggle）==========
// 特点：单个按钮，点击循环切换三种模式，显示当前模式图标和文字，最节省空间
function ToggleCycle() {
  const [mode, setMode] = useState<EditorMode>(mockActiveMode)

  const cycle = (current: EditorMode): EditorMode => {
    if (current === 'wysiwyg') return 'source'
    if (current === 'source') return 'read'
    return 'wysiwyg'
  }

  const config = {
    wysiwyg: { label: '编辑', icon: <Pencil className="size-3.5" /> },
    source: { label: '源码', icon: <Code className="size-3.5" /> },
    read: { label: '阅读', icon: <BookOpen className="size-3.5" /> },
  }

  const current = config[mode]

  return (
    <button
      onClick={() => setMode(cycle(mode))}
      title={`当前：${current.label}（点击切换）`}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground border border-border text-xs font-medium transition-all duration-150"
    >
      {current.icon}
      <span>{current.label}</span>
    </button>
  )
}

// 演示容器
function DemoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">{title}</h3>
      <div className="flex items-center justify-center py-8 bg-background/50 rounded-lg border border-dashed border-border">
        {children}
      </div>
    </div>
  )
}

export const readModeToggleCase: PlaygroundCase = {
  id: 'read-mode-toggle',
  name: '阅读模式切换控件',
  description: '编辑器三种模式（编辑/源码/阅读）的切换控件设计，需兼顾移动端空间限制和桌面端清晰度',
  variants: [
    {
      name: '方案 A：分段控制器',
      description: '三个模式在一个圆角条中，当前项白底高亮，文字+图标，状态最清晰直观',
      component: (
        <DemoCard title="桌面端 TabBar 右侧 / 移动端顶部">
          <ToggleSegmented />
        </DemoCard>
      ),
    },
    {
      name: '方案 B：图标按钮组',
      description: '纯图标按钮，当前项主色高亮，最紧凑适合空间有限的场景',
      component: (
        <DemoCard title="桌面端 TabBar 右侧 / 移动端顶部">
          <ToggleIconGroup />
        </DemoCard>
      ),
    },
    {
      name: '方案 C：双态主按钮 + 源码次级',
      description: '主按钮在阅读/编辑之间切换（最常用场景），源码作为独立按钮，主次分明',
      component: (
        <DemoCard title="桌面端 TabBar 右侧 / 移动端顶部">
          <ToggleDualState />
        </DemoCard>
      ),
    },
    {
      name: '方案 D：循环切换',
      description: '单个按钮循环切换三种模式，最节省空间，适合移动端顶部 header',
      component: (
        <DemoCard title="桌面端 TabBar 右侧 / 移动端顶部">
          <ToggleCycle />
        </DemoCard>
      ),
    },
  ],
}
