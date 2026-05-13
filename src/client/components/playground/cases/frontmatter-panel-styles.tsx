import { useState, useCallback } from 'react'
import { Plus, X, Tag, Hash, ChevronRight, Trash2 } from 'lucide-react'
import { cn } from '@/client/lib/utils'
import type { PlaygroundCase } from '../types'

// 模拟数据
const initialFields = [
  { key: 'title', value: '我的笔记标题' },
  { key: 'date', value: '2025-05-13' },
  { key: 'tags', value: 'dev, markdown, note' },
  { key: 'author', value: 'yuexiaoliang' },
]

interface Field {
  key: string
  value: string
}

// 通用容器：模拟编辑器内的 frontmatter 区域
function PanelContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('w-full max-w-[480px] bg-background border border-border rounded-lg overflow-hidden', className)}>
      {children}
    </div>
  )
}

// 方案 A：精致标准表格 — 清晰表头 + hover 行高亮 + 精致边框
function StyleRefinedTable() {
  const [fields, setFields] = useState<Field[]>(initialFields)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const updateKey = useCallback((i: number, key: string) => {
    setFields(prev => prev.map((f, idx) => idx === i ? { ...f, key } : f))
  }, [])

  const updateValue = useCallback((i: number, value: string) => {
    setFields(prev => prev.map((f, idx) => idx === i ? { ...f, value } : f))
  }, [])

  const removeField = useCallback((i: number) => {
    setFields(prev => prev.filter((_, idx) => idx !== i))
  }, [])

  const addField = useCallback(() => {
    setFields(prev => [...prev, { key: '', value: '' }])
  }, [])

  return (
    <PanelContainer>
      {/* 标题区 */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/20">
        <div className="flex items-center gap-1.5">
          <Tag className="size-3.5 text-primary/70" />
          <span className="text-xs font-medium text-foreground">文档属性</span>
        </div>
        <span className="text-[10px] text-muted-foreground tabular-nums">{fields.length} 项</span>
      </div>

      {/* 表头 */}
      <div className="grid grid-cols-[100px_1fr_32px] gap-0">
        <div className="px-4 py-1.5 border-b border-border/60 bg-muted/10">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">属性</span>
        </div>
        <div className="px-4 py-1.5 border-b border-border/60 bg-muted/10">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">值</span>
        </div>
        <div className="px-2 py-1.5 border-b border-border/60 bg-muted/10" />

        {/* 字段行 */}
        {fields.map((field, i) => (
          <div
            key={i}
            className="contents"
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div className={cn(
              "px-4 py-2 border-b border-border/30 flex items-center transition-colors",
              hoveredIndex === i && "bg-muted/30"
            )}>
              <input
                className="w-full text-xs font-mono bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground/40"
                value={field.key}
                onChange={e => updateKey(i, e.target.value)}
                placeholder="key"
              />
            </div>
            <div className={cn(
              "px-4 py-2 border-b border-border/30 flex items-center transition-colors",
              hoveredIndex === i && "bg-muted/30"
            )}>
              <input
                className="w-full text-xs bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground/40"
                value={field.value}
                onChange={e => updateValue(i, e.target.value)}
                placeholder="value"
              />
            </div>
            <div className={cn(
              "px-2 py-2 border-b border-border/30 flex items-center justify-center transition-colors",
              hoveredIndex === i && "bg-muted/30"
            )}>
              <button
                onClick={() => removeField(i)}
                className={cn(
                  "flex items-center justify-center size-5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all",
                  hoveredIndex === i ? "opacity-100" : "opacity-0"
                )}
                title="删除"
              >
                <X className="size-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 添加按钮 */}
      <div className="px-4 py-2">
        <button
          onClick={addField}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
        >
          <Plus className="size-3" />
          添加字段
        </button>
      </div>
    </PanelContainer>
  )
}

// 方案 B：紧凑代码风 — 等宽字体 + 细边框 + 终端感
function StyleCompactCode() {
  const [fields, setFields] = useState<Field[]>(initialFields)

  const updateKey = useCallback((i: number, key: string) => {
    setFields(prev => prev.map((f, idx) => idx === i ? { ...f, key } : f))
  }, [])

  const updateValue = useCallback((i: number, value: string) => {
    setFields(prev => prev.map((f, idx) => idx === i ? { ...f, value } : f))
  }, [])

  const removeField = useCallback((i: number) => {
    setFields(prev => prev.filter((_, idx) => idx !== i))
  }, [])

  const addField = useCallback(() => {
    setFields(prev => [...prev, { key: '', value: '' }])
  }, [])

  return (
    <PanelContainer className="rounded-none border-0">
      {/* 标题区 */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/30 border-b border-border/40">
        <div className="flex items-center gap-1.5">
          <Hash className="size-3 text-muted-foreground/60" />
          <span className="text-[10px] font-mono font-medium text-muted-foreground uppercase">frontmatter</span>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground/50">{fields.length} fields</span>
      </div>

      {/* 字段区 */}
      <div className="divide-y divide-border/20">
        {fields.map((field, i) => (
          <div key={i} className="group flex items-center gap-0 px-3 py-1 hover:bg-muted/20 transition-colors">
            <input
              className="text-[11px] font-mono bg-transparent border-0 outline-none w-[90px] shrink-0 text-primary/80 placeholder:text-muted-foreground/30"
              value={field.key}
              onChange={e => updateKey(i, e.target.value)}
              placeholder="key"
            />
            <span className="text-muted-foreground/20 text-[11px] font-mono shrink-0 mx-1">:</span>
            <input
              className="text-[11px] font-mono bg-transparent border-0 outline-none flex-1 min-w-0 text-foreground placeholder:text-muted-foreground/30"
              value={field.value}
              onChange={e => updateValue(i, e.target.value)}
              placeholder="value"
            />
            <button
              onClick={() => removeField(i)}
              className="opacity-0 group-hover:opacity-100 flex items-center justify-center size-4 rounded text-muted-foreground/40 hover:text-destructive transition-all shrink-0"
              title="删除"
            >
              <X className="size-2.5" />
            </button>
          </div>
        ))}
      </div>

      {/* 添加按钮 */}
      <div className="px-3 py-1.5 border-t border-border/20">
        <button
          onClick={addField}
          className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          <Plus className="size-2.5" />
          add_field
        </button>
      </div>
    </PanelContainer>
  )
}

// 方案 C：左侧标签栏 — Key 在固定宽度背景栏中，像系统设置侧边栏
function StyleLabelSidebar() {
  const [fields, setFields] = useState<Field[]>(initialFields)

  const updateKey = useCallback((i: number, key: string) => {
    setFields(prev => prev.map((f, idx) => idx === i ? { ...f, key } : f))
  }, [])

  const updateValue = useCallback((i: number, value: string) => {
    setFields(prev => prev.map((f, idx) => idx === i ? { ...f, value } : f))
  }, [])

  const removeField = useCallback((i: number) => {
    setFields(prev => prev.filter((_, idx) => idx !== i))
  }, [])

  const addField = useCallback(() => {
    setFields(prev => [...prev, { key: '', value: '' }])
  }, [])

  return (
    <PanelContainer>
      {/* 标题区 */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <span className="text-xs font-medium text-foreground">属性</span>
        <span className="text-[10px] text-muted-foreground">{fields.length} 项</span>
      </div>

      {/* 字段区 */}
      <div className="divide-y divide-border/30">
        {fields.map((field, i) => (
          <div key={i} className="group flex items-stretch">
            {/* Key 栏 — 固定宽度带背景 */}
            <div className="w-[100px] shrink-0 px-3 py-2 bg-muted/20 border-r border-border/30 flex items-center">
              <input
                className="w-full text-[11px] font-medium bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground/40"
                value={field.key}
                onChange={e => updateKey(i, e.target.value)}
                placeholder="属性"
              />
            </div>
            {/* Value 栏 */}
            <div className="flex-1 min-w-0 px-3 py-2 flex items-center group-hover:bg-muted/10 transition-colors">
              <input
                className="w-full text-xs bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground/40"
                value={field.value}
                onChange={e => updateValue(i, e.target.value)}
                placeholder="输入值..."
              />
            </div>
            {/* 删除按钮 */}
            <div className="w-8 shrink-0 flex items-center justify-center group-hover:bg-muted/10 transition-colors">
              <button
                onClick={() => removeField(i)}
                className="opacity-0 group-hover:opacity-100 flex items-center justify-center size-5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                title="删除"
              >
                <X className="size-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 添加按钮 */}
      <div className="px-4 py-2 border-t border-border/30">
        <button
          onClick={addField}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
        >
          <Plus className="size-3" />
          添加属性
        </button>
      </div>
    </PanelContainer>
  )
}

// 方案 D：Key-Value 卡片行 — 每行是独立卡片，key 用小字 muted 色，value 突出显示
function StyleCardRows() {
  const [fields, setFields] = useState<Field[]>(initialFields)

  const updateKey = useCallback((i: number, key: string) => {
    setFields(prev => prev.map((f, idx) => idx === i ? { ...f, key } : f))
  }, [])

  const updateValue = useCallback((i: number, value: string) => {
    setFields(prev => prev.map((f, idx) => idx === i ? { ...f, value } : f))
  }, [])

  const removeField = useCallback((i: number) => {
    setFields(prev => prev.filter((_, idx) => idx !== i))
  }, [])

  const addField = useCallback(() => {
    setFields(prev => [...prev, { key: '', value: '' }])
  }, [])

  return (
    <PanelContainer className="border-0 shadow-sm">
      {/* 标题区 */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60">
        <div className="flex items-center gap-1.5">
          <Tag className="size-3.5 text-primary/60" />
          <span className="text-xs font-medium text-foreground">Metadata</span>
        </div>
        <button
          onClick={addField}
          className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-muted/50"
        >
          <Plus className="size-3" />
          添加
        </button>
      </div>

      {/* 字段区 */}
      <div className="px-3 py-2 space-y-1">
        {fields.map((field, i) => (
          <div
            key={i}
            className="group flex items-center gap-0 rounded-md border border-border/40 hover:border-border/80 bg-card hover:bg-accent/30 transition-all"
          >
            {/* Key */}
            <div className="w-[90px] shrink-0 px-3 py-1.5 border-r border-border/30">
              <input
                className="w-full text-[10px] font-medium uppercase tracking-wider bg-transparent border-0 outline-none text-muted-foreground placeholder:text-muted-foreground/30"
                value={field.key}
                onChange={e => updateKey(i, e.target.value)}
                placeholder="KEY"
              />
            </div>
            {/* Value */}
            <div className="flex-1 min-w-0 px-3 py-1.5">
              <input
                className="w-full text-xs bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground/40"
                value={field.value}
                onChange={e => updateValue(i, e.target.value)}
                placeholder="输入值"
              />
            </div>
            {/* 删除 */}
            <button
              onClick={() => removeField(i)}
              className="opacity-0 group-hover:opacity-100 mr-1.5 flex items-center justify-center size-5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all shrink-0"
              title="删除"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        ))}
      </div>
    </PanelContainer>
  )
}

export const frontmatterPanelStylesCase: PlaygroundCase = {
  id: 'frontmatter-panel-styles',
  name: 'Frontmatter 面板样式',
  description: '基于表格网格风格，重新设计文档 Frontmatter / Metadata 编辑面板的视觉风格',
  variants: [
    {
      name: '方案 A：精致标准表格',
      description: '清晰表头 + hover 行高亮 + 精致边框，像 Notion 属性表',
      component: <StyleRefinedTable />,
    },
    {
      name: '方案 B：紧凑代码风',
      description: '等宽字体 + 细边框 + 终端感，行高紧凑如代码编辑器',
      component: <StyleCompactCode />,
    },
    {
      name: '方案 C：左侧标签栏',
      description: 'Key 在固定宽度背景栏中，像系统设置侧边栏',
      component: <StyleLabelSidebar />,
    },
    {
      name: '方案 D：Key-Value 卡片行',
      description: '每行是独立圆角卡片，key 用小字 muted 色，value 突出',
      component: <StyleCardRows />,
    },
  ],
}
