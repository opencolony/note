import { useState } from 'react'
import {
  FolderOpen,
  FileText,
  Folder,
  Pencil,
  Plus,
  Sparkles,
  ArrowRight,
  Lightbulb,
  FilePlus,
  FolderPlus,
  Settings,
} from 'lucide-react'
import { cn } from '@/client/lib/utils'
import type { PlaygroundCase } from '../types'

// 通用容器：模拟侧边栏内的空状态区域
function EmptyStateContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center h-[320px] text-center border border-dashed border-border rounded-lg bg-muted/20',
        className
      )}
    >
      {children}
    </div>
  )
}

// 方案 A：柔和卡片式 — 圆角大卡片包裹，柔和阴影，按钮实心 primary
function StyleSoftCard() {
  const [hovered, setHovered] = useState<number | null>(null)

  const actions = [
    { icon: FilePlus, label: '新建文件' },
    { icon: FolderPlus, label: '新建文件夹' },
    { icon: Settings, label: '目录设置' },
  ]

  return (
    <EmptyStateContainer className="bg-gradient-to-b from-muted/30 to-background">
      <div className="relative mb-5">
        <div className="size-20 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shadow-sm">
          <FolderOpen className="size-10 text-primary/70" />
        </div>
        <div className="absolute -top-1 -right-1 size-6 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="size-3 text-primary/60" />
        </div>
      </div>
      <h3 className="text-sm font-medium text-foreground mb-1">「empty-dir」暂无文件</h3>
      <p className="text-xs text-muted-foreground mb-5 max-w-[200px]">
        这是一个全新的开始，创建你的第一个文件吧
      </p>
      <div className="flex gap-2">
        {actions.map((action, i) => (
          <button
            key={action.label}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200',
              hovered === i
                ? 'bg-primary text-primary-foreground shadow-sm scale-105'
                : 'bg-background text-muted-foreground border border-border hover:border-primary/30 hover:text-foreground'
            )}
          >
            <action.icon className="size-3.5" />
            {action.label}
          </button>
        ))}
      </div>
    </EmptyStateContainer>
  )
}

// 方案 B：插画引导式 — 虚线圆圈 + 图标，步骤提示
function StyleOnboarding() {
  return (
    <EmptyStateContainer>
      <div className="relative mb-6">
        <div className="size-24 rounded-full border-2 border-dashed border-primary/20 flex items-center justify-center">
          <div className="size-16 rounded-full bg-primary/5 flex items-center justify-center">
            <FolderOpen className="size-8 text-primary/50" />
          </div>
        </div>
        <div className="absolute -bottom-1 -right-2 size-8 rounded-full bg-background border border-border flex items-center justify-center shadow-sm">
          <Plus className="size-4 text-muted-foreground" />
        </div>
      </div>

      <h3 className="text-sm font-medium text-foreground mb-3">开始创建内容</h3>

      <div className="space-y-2 w-full max-w-[220px]">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-background border border-border/60">
          <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-primary">1</span>
          </div>
          <span className="text-xs text-muted-foreground">创建 Markdown 文件</span>
        </div>
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-background border border-border/60">
          <div className="size-6 rounded-full bg-muted flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-muted-foreground">2</span>
          </div>
          <span className="text-xs text-muted-foreground">用 Markdown 记录想法</span>
        </div>
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-background border border-border/60">
          <div className="size-6 rounded-full bg-muted flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-muted-foreground">3</span>
          </div>
          <span className="text-xs text-muted-foreground">实时预览效果</span>
        </div>
      </div>
    </EmptyStateContainer>
  )
}

// 方案 C：极简留白式 — 大量留白，极细描边图标，文字更克制
function StyleMinimal() {
  return (
    <EmptyStateContainer className="bg-transparent border-none">
      <div className="mb-6">
        <FolderOpen className="size-8 text-muted-foreground/30 stroke-[1.5]" />
      </div>
      <p className="text-sm text-muted-foreground/60 mb-8 font-light tracking-wide">
        根目录「empty-dir」暂无文件
      </p>
      <div className="flex items-center gap-6">
        <button className="group flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-foreground transition-colors">
          <FileText className="size-3.5 stroke-[1.5]" />
          <span className="group-hover:underline underline-offset-4">新建文件</span>
        </button>
        <button className="group flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-foreground transition-colors">
          <Folder className="size-3.5 stroke-[1.5]" />
          <span className="group-hover:underline underline-offset-4">新建文件夹</span>
        </button>
      </div>
    </EmptyStateContainer>
  )
}

// 方案 D：Actionable 强调式 — 大图标 + 醒目标题 + 描述 + 大号主按钮
function StyleActionable() {
  const [activeAction, setActiveAction] = useState<'file' | 'folder' | null>('file')

  return (
    <EmptyStateContainer>
      <div className="mb-5 relative">
        <div
          className={cn(
            'size-16 rounded-xl flex items-center justify-center transition-colors duration-300',
            activeAction === 'file' ? 'bg-primary/10' : activeAction === 'folder' ? 'bg-orange-500/10' : 'bg-muted'
          )}
        >
          {activeAction === 'file' && <FileText className="size-8 text-primary" />}
          {activeAction === 'folder' && <Folder className="size-8 text-orange-500" />}
          {!activeAction && <FolderOpen className="size-8 text-muted-foreground/40" />}
        </div>
      </div>

      <h3 className="text-base font-semibold text-foreground mb-1.5">这个目录是空的</h3>
      <p className="text-xs text-muted-foreground mb-6 max-w-[220px]">
        「empty-dir」里还没有任何内容，选择下面的操作来开始吧
      </p>

      <div className="flex flex-col gap-2 w-full max-w-[200px]">
        <button
          onMouseEnter={() => setActiveAction('file')}
          className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm"
        >
          <span className="flex items-center gap-2">
            <FilePlus className="size-4" />
            新建 Markdown 文件
          </span>
          <ArrowRight className="size-3.5 opacity-70" />
        </button>
        <button
          onMouseEnter={() => setActiveAction('folder')}
          className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg bg-muted text-foreground text-xs font-medium hover:bg-muted/80 transition-colors"
        >
          <span className="flex items-center gap-2">
            <FolderPlus className="size-4" />
            新建文件夹
          </span>
        </button>
        <button className="text-[11px] text-muted-foreground hover:text-foreground transition-colors mt-1">
          或者，打开目录设置
        </button>
      </div>
    </EmptyStateContainer>
  )
}

// 方案 E：温暖场景式 — 多个小图标组合，温暖配色，营造工作场景
function StyleWarmScene() {
  return (
    <EmptyStateContainer className="bg-gradient-to-b from-amber-50/50 to-background dark:from-amber-950/10">
      <div className="relative w-28 h-20 mb-5">
        {/* 散落的图标，营造桌面场景 */}
        <div className="absolute top-0 left-2 size-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center rotate-[-8deg]">
          <FileText className="size-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="absolute top-1 right-4 size-7 rounded-md bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center rotate-[12deg]">
          <Pencil className="size-3.5 text-orange-600 dark:text-orange-400" />
        </div>
        <div className="absolute bottom-0 left-8 size-10 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
          <FolderOpen className="size-5 text-yellow-600 dark:text-yellow-400" />
        </div>
        <div className="absolute bottom-2 right-2 size-6 rounded-md bg-stone-100 dark:bg-stone-800 flex items-center justify-center rotate-[-6deg]">
          <Sparkles className="size-3 text-stone-500 dark:text-stone-400" />
        </div>
      </div>

      <h3 className="text-sm font-medium text-foreground mb-1">准备好记录了吗？</h3>
      <p className="text-xs text-muted-foreground mb-5">「empty-dir」正等待你的第一个想法</p>

      <div className="flex gap-2">
        <button className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-500 text-white text-xs font-medium hover:bg-amber-600 transition-colors shadow-sm">
          <Plus className="size-3.5" />
          新建文件
        </button>
        <button className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-background border border-border text-muted-foreground text-xs hover:text-foreground hover:border-amber-300 transition-colors">
          <Lightbulb className="size-3.5" />
          目录设置
        </button>
      </div>
    </EmptyStateContainer>
  )
}

// 方案 F：现代玻璃态 — 半透明毛玻璃卡片，图标带 glow 效果
function StyleGlass() {
  return (
    <EmptyStateContainer className="bg-gradient-to-br from-background via-muted/20 to-background relative overflow-hidden">
      {/* 背景光晕 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-32 rounded-full bg-primary/5 blur-2xl" />

      <div className="relative mb-5">
        <div className="size-20 rounded-2xl bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center shadow-lg">
          <FolderOpen className="size-10 text-primary/60" />
        </div>
        {/* 装饰性小点 */}
        <div className="absolute -top-2 -right-3 size-2 rounded-full bg-primary/40" />
        <div className="absolute -bottom-1 -left-2 size-1.5 rounded-full bg-primary/30" />
      </div>

      <h3 className="text-sm font-medium text-foreground mb-1 relative">目录为空</h3>
      <p className="text-xs text-muted-foreground mb-5 relative">「empty-dir」</p>

      <div className="flex gap-1.5 relative">
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-background/80 backdrop-blur-sm border border-border/60 text-xs text-foreground hover:border-primary/30 hover:bg-background transition-all shadow-sm">
          <FileText className="size-3.5 text-primary/70" />
          文件
        </button>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-background/80 backdrop-blur-sm border border-border/60 text-xs text-foreground hover:border-primary/30 hover:bg-background transition-all shadow-sm">
          <Folder className="size-3.5 text-primary/70" />
          文件夹
        </button>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-background/80 backdrop-blur-sm border border-border/60 text-xs text-foreground hover:border-primary/30 hover:bg-background transition-all shadow-sm">
          <Pencil className="size-3.5 text-primary/70" />
          设置
        </button>
      </div>
    </EmptyStateContainer>
  )
}

export const emptyStateStylesCase: PlaygroundCase = {
  id: 'empty-state-styles',
  name: '空状态样式设计',
  description: '重新设计文件树为空时的 EmptyState 视觉风格',
  variants: [
    {
      name: '方案 A：柔和卡片式',
      description: '渐变色大图标 + 圆角卡片容器，按钮有 hover 放大效果',
      component: <StyleSoftCard />,
    },
    {
      name: '方案 B：插画引导式',
      description: '虚线圆圈 + 图标，下方三步引导流程',
      component: <StyleOnboarding />,
    },
    {
      name: '方案 C：极简留白式',
      description: '大量留白，极细描边，文字链接替代按钮',
      component: <StyleMinimal />,
    },
    {
      name: '方案 D：Actionable 强调式',
      description: '醒目标题 + 大号主按钮，hover 时图标动态切换',
      component: <StyleActionable />,
    },
    {
      name: '方案 E：温暖场景式',
      description: '散落的图标营造桌面场景感，温暖琥珀色调',
      component: <StyleWarmScene />,
    },
    {
      name: '方案 F：现代玻璃态',
      description: '半透明毛玻璃卡片，背景光晕，装饰性小点',
      component: <StyleGlass />,
    },
  ],
}
