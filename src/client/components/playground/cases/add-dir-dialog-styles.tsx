import { useState } from 'react'
import {
  Search,
  Folder,
  FolderOpen,
  X,
  Clock,
  ArrowRight,
  Sparkles,
  Compass,
  Star,
} from 'lucide-react'
import { cn } from '@/client/lib/utils'
import type { PlaygroundCase } from '../types'

// 模拟数据
const mockRecentDirs = [
  '/home/yuexiaoliang/projects/brain',
  '/home/yuexiaoliang/projects/note',
]

const mockSearchResults = [
  '~/projects/docs/colonychat',
  '~/projects/note/workspace/dev/colonyco',
  '~/projects/docs/colonycode',
  '~/projects/docs/colonynote',
  '~/projects/docs/colonybrain',
]

const mockBrowseDirs = [
  '/home/yuexiaoliang/Documents',
  '/home/yuexiaoliang/Downloads',
  '/home/yuexiaoliang/projects',
  '/home/yuexiaoliang/workspace',
]

// 通用容器：模拟移动端 Sheet 的内容区域
function SheetContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'w-full max-w-[360px] mx-auto bg-background rounded-t-2xl border border-border shadow-lg overflow-hidden flex flex-col',
        className
      )}
    >
      {/* 拖拽指示条 */}
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
      </div>
      {/* 头部 */}
      <div className="px-5 pb-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">打开项目</h2>
          <button className="size-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <X className="size-4" />
          </button>
        </div>
      </div>
      {/* 内容 */}
      <div className="px-5 pb-6 pt-2 flex-1 overflow-hidden flex flex-col">
        {children}
      </div>
    </div>
  )
}

// 模拟输入框
function MockInput({
  value,
  placeholder,
  className,
}: {
  value: string
  placeholder?: string
  className?: string
}) {
  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
      <input
        type="text"
        value={value}
        readOnly
        placeholder={placeholder}
        className="flex h-11 w-full rounded-xl border border-input bg-background pl-9 pr-8 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {value && (
        <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded">
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}

// 方案 A：大卡片式 — 每个目录项都是独立的大圆角卡片，视觉冲击力强
function StyleBigCard() {
  const [hasInput] = useState(true)

  return (
    <SheetContainer>
      <MockInput value={hasInput ? 'colo' : ''} placeholder="输入路径或搜索目录..." />

      <div className="mt-3 flex-1 overflow-y-auto space-y-3">
        {/* 最近项目 */}
        <div>
          <div className="flex items-center gap-1.5 px-1 mb-2">
            <Clock className="size-3.5 text-muted-foreground/60" />
            <span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">最近项目</span>
          </div>
          <div className="space-y-2">
            {mockRecentDirs.map((dir) => (
              <button
                key={dir}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-muted/40 border border-border/40 hover:bg-muted/70 hover:border-border/60 active:scale-[0.98] transition-all text-left"
              >
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <FolderOpen className="size-5 text-primary/70" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{dir.split('/').pop()}</p>
                  <p className="text-[11px] text-muted-foreground/60 truncate">{dir}</p>
                </div>
                <ArrowRight className="size-4 text-muted-foreground/30" />
              </button>
            ))}
          </div>
        </div>

        {/* 搜索结果 */}
        <div>
          <div className="flex items-center gap-1.5 px-1 mb-2">
            <Sparkles className="size-3.5 text-muted-foreground/60" />
            <span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">搜索结果</span>
          </div>
          <div className="space-y-2">
            {mockSearchResults.slice(0, 4).map((dir) => (
              <button
                key={dir}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-muted/30 border border-border/30 hover:bg-muted/60 hover:border-border/50 active:scale-[0.98] transition-all text-left"
              >
                <div className="size-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Folder className="size-5 text-muted-foreground/50" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{dir}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </SheetContainer>
  )
}

// 方案 B：iOS 列表式 — 紧凑分组列表，圆角外框包裹，类似系统设置
function StyleIOSList() {
  return (
    <SheetContainer>
      <MockInput value="colo" placeholder="输入路径或搜索目录..." />

      <div className="mt-3 flex-1 overflow-y-auto space-y-4">
        {/* 最近项目 */}
        <div>
          <div className="px-3 mb-1.5">
            <span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">最近项目</span>
          </div>
          <div className="rounded-2xl bg-muted/30 overflow-hidden">
            {mockRecentDirs.map((dir, idx) => (
              <button
                key={dir}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/60 transition-colors',
                  idx !== mockRecentDirs.length - 1 && 'border-b border-border/30'
                )}
              >
                <FolderOpen className="size-4 shrink-0 text-primary/70" />
                <span className="text-sm text-foreground truncate flex-1">{dir}</span>
                <ArrowRight className="size-3.5 text-muted-foreground/30 shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* 搜索结果 */}
        <div>
          <div className="px-3 mb-1.5">
            <span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">搜索结果</span>
          </div>
          <div className="rounded-2xl bg-muted/30 overflow-hidden">
            {mockSearchResults.slice(0, 4).map((dir, idx) => (
              <button
                key={dir}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/60 transition-colors',
                  idx !== 3 && 'border-b border-border/30'
                )}
              >
                <Folder className="size-4 shrink-0 text-muted-foreground/50" />
                <span className="text-sm text-foreground truncate flex-1">{dir}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </SheetContainer>
  )
}

// 方案 C：彩色标签式 — 每个结果项左侧有彩色圆点/色块，增加视觉趣味
function StyleColorTag() {
  const colors = [
    'bg-amber-500/15 text-amber-600',
    'bg-emerald-500/15 text-emerald-600',
    'bg-sky-500/15 text-sky-600',
    'bg-violet-500/15 text-violet-600',
    'bg-rose-500/15 text-rose-600',
  ]

  return (
    <SheetContainer>
      <MockInput value="colo" placeholder="输入路径或搜索目录..." />

      <div className="mt-3 flex-1 overflow-y-auto space-y-4">
        {/* 最近项目 */}
        <div>
          <div className="flex items-center gap-2 px-1 mb-2.5">
            <Star className="size-3.5 text-amber-500" />
            <span className="text-xs font-semibold text-foreground">最近项目</span>
          </div>
          <div className="space-y-1">
            {mockRecentDirs.map((dir, idx) => (
              <button
                key={dir}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent transition-colors text-left group"
              >
                <div className={cn('size-9 rounded-lg flex items-center justify-center shrink-0', colors[idx % colors.length])}>
                  <FolderOpen className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{dir.split('/').pop()}</p>
                  <p className="text-[11px] text-muted-foreground/50 truncate">{dir}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 搜索结果 */}
        <div>
          <div className="flex items-center gap-2 px-1 mb-2.5">
            <Search className="size-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">搜索结果</span>
          </div>
          <div className="space-y-1">
            {mockSearchResults.slice(0, 4).map((dir, idx) => (
              <button
                key={dir}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent transition-colors text-left group"
              >
                <div className={cn('size-9 rounded-lg flex items-center justify-center shrink-0', colors[(idx + 2) % colors.length])}>
                  <Folder className="size-4" />
                </div>
                <span className="text-sm text-foreground truncate flex-1">{dir}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </SheetContainer>
  )
}

// 方案 D：沉浸式深色 — 搜索框突出，列表区域深色卡片背景，对比强烈
function StyleImmersive() {
  return (
    <SheetContainer className="bg-gradient-to-b from-background to-muted/30">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value="colo"
          readOnly
          placeholder="输入路径或搜索目录..."
          className="flex h-12 w-full rounded-2xl border border-border/60 bg-muted/50 pl-11 pr-10 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button className="absolute right-3 top-1/2 -translate-y-1/2 size-6 rounded-full bg-muted-foreground/10 flex items-center justify-center text-muted-foreground hover:text-foreground">
          <X className="size-3" />
        </button>
      </div>

      <div className="mt-4 flex-1 overflow-y-auto space-y-4">
        {/* 最近项目 */}
        <div>
          <span className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider px-1">最近项目</span>
          <div className="mt-2 rounded-2xl bg-gradient-to-br from-muted/70 to-muted/30 border border-border/50 p-1">
            {mockRecentDirs.map((dir) => (
              <button
                key={dir}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-background/60 active:scale-[0.98] transition-all text-left"
              >
                <div className="size-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <FolderOpen className="size-4 text-primary/80" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{dir.split('/').pop()}</p>
                  <p className="text-[11px] text-muted-foreground/50">{dir}</p>
                </div>
                <ArrowRight className="size-4 text-muted-foreground/20" />
              </button>
            ))}
          </div>
        </div>

        {/* 搜索结果 */}
        <div>
          <span className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider px-1">搜索结果</span>
          <div className="mt-2 rounded-2xl bg-gradient-to-br from-muted/70 to-muted/30 border border-border/50 p-1">
            {mockSearchResults.slice(0, 4).map((dir) => (
              <button
                key={dir}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-background/60 active:scale-[0.98] transition-all text-left"
              >
                <div className="size-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Folder className="size-4 text-muted-foreground/50" />
                </div>
                <span className="text-sm text-foreground truncate flex-1">{dir}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </SheetContainer>
  )
}

// 方案 E：极简线条式 — 大量留白，细线分隔，文字为主，最简洁
function StyleMinimalLine() {
  return (
    <SheetContainer>
      <div className="relative">
        <Search className="absolute left-0 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40 pointer-events-none" />
        <input
          type="text"
          value="colo"
          readOnly
          placeholder="搜索目录..."
          className="w-full bg-transparent border-none outline-none pl-6 pr-6 py-2 text-base text-foreground placeholder:text-muted-foreground/30"
        />
        <button className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground">
          <X className="size-3.5" />
        </button>
      </div>

      <div className="h-px bg-border/30 my-2" />

      <div className="flex-1 overflow-y-auto">
        {/* 最近项目 */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Clock className="size-3 text-muted-foreground/40" />
            <span className="text-[10px] text-muted-foreground/40 uppercase tracking-widest">最近</span>
          </div>
          <div className="space-y-0">
            {mockRecentDirs.map((dir) => (
              <button
                key={dir}
                className="w-full flex items-center gap-2 py-2.5 text-left hover:opacity-70 transition-opacity"
              >
                <FolderOpen className="size-3.5 text-muted-foreground/30 shrink-0" />
                <span className="text-sm text-foreground/80 truncate">{dir}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-border/20 mb-4" />

        {/* 搜索结果 */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Compass className="size-3 text-muted-foreground/40" />
            <span className="text-[10px] text-muted-foreground/40 uppercase tracking-widest">结果</span>
          </div>
          <div className="space-y-0">
            {mockSearchResults.slice(0, 4).map((dir) => (
              <button
                key={dir}
                className="w-full flex items-center gap-2 py-2.5 text-left hover:opacity-70 transition-opacity"
              >
                <Folder className="size-3.5 text-muted-foreground/30 shrink-0" />
                <span className="text-sm text-foreground/80 truncate">{dir}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </SheetContainer>
  )
}

// 方案 F：磁贴网格式 — 最近项目用大磁贴展示，搜索结果用列表
function StyleTileGrid() {
  return (
    <SheetContainer>
      <MockInput value="colo" placeholder="输入路径或搜索目录..." />

      <div className="mt-3 flex-1 overflow-y-auto space-y-4">
        {/* 最近项目 — 横向磁贴 */}
        <div>
          <div className="flex items-center gap-1.5 px-1 mb-2.5">
            <Clock className="size-3.5 text-muted-foreground/50" />
            <span className="text-xs font-semibold text-foreground">最近项目</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {mockRecentDirs.map((dir) => (
              <button
                key={dir}
                className="flex flex-col items-start gap-2 p-3.5 rounded-2xl bg-gradient-to-br from-primary/8 to-primary/3 border border-primary/10 hover:from-primary/15 hover:to-primary/8 active:scale-[0.97] transition-all text-left"
              >
                <FolderOpen className="size-6 text-primary/60" />
                <div className="min-w-0 w-full">
                  <p className="text-xs font-semibold text-foreground truncate">{dir.split('/').pop()}</p>
                  <p className="text-[10px] text-muted-foreground/50 truncate mt-0.5">{dir}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 搜索结果 — 纵向列表 */}
        <div>
          <div className="flex items-center gap-1.5 px-1 mb-2.5">
            <Search className="size-3.5 text-muted-foreground/50" />
            <span className="text-xs font-semibold text-foreground">搜索结果</span>
          </div>
          <div className="space-y-1">
            {mockSearchResults.slice(0, 4).map((dir) => (
              <button
                key={dir}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-muted/30 hover:bg-muted/60 active:scale-[0.98] transition-all text-left"
              >
                <Folder className="size-4 text-muted-foreground/40 shrink-0" />
                <span className="text-sm text-foreground truncate flex-1">{dir}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </SheetContainer>
  )
}

export const addDirDialogStylesCase: PlaygroundCase = {
  id: 'add-dir-dialog-styles',
  name: '打开项目对话框样式设计',
  description: '重新设计 AddDirDialog（打开项目/新增项目）在移动端 Sheet 中的视觉风格',
  variants: [
    {
      name: '方案 A：大卡片式',
      description: '每个目录项都是独立的大圆角卡片，带有图标区块和副标题，视觉冲击力强',
      component: <StyleBigCard />,
    },
    {
      name: '方案 B：iOS 列表式',
      description: '紧凑分组列表，圆角外框包裹每组内容，类似 iOS 系统设置风格',
      component: <StyleIOSList />,
    },
    {
      name: '方案 C：彩色标签式',
      description: '每个结果项左侧有彩色圆角色块，不同类别用不同颜色区分，活泼现代',
      component: <StyleColorTag />,
    },
    {
      name: '方案 D：沉浸式深色',
      description: '搜索框和列表区域用深色渐变卡片背景包裹，对比强烈，层次分明',
      component: <StyleImmersive />,
    },
    {
      name: '方案 E：极简线条式',
      description: '大量留白，细线分隔区域，文字链接为主，最简洁克制的风格',
      component: <StyleMinimalLine />,
    },
    {
      name: '方案 F：磁贴网格式',
      description: '最近项目用双列磁贴展示，搜索结果用列表，空间利用率高',
      component: <StyleTileGrid />,
    },
  ],
}
