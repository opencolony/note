import { useState } from 'react'
import {
  FolderOpen,
  Pencil,
  Trash2,
  X,
  Check,
  AlertTriangle,
  FolderEdit,
  Save,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/client/lib/utils'
import type { PlaygroundCase } from '../types'

// 模拟数据
const mockDirPath = '/home/yuexiaoliang/projects/note/workspace'
const mockDisplayName = 'workspace'

// 通用容器：模拟移动端 Sheet 的内容区域
function SheetContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'w-full max-w-[360px] mx-auto bg-background rounded-t-2xl border border-border shadow-lg overflow-hidden',
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
          <h2 className="text-lg font-semibold text-foreground">目录设置</h2>
          <button className="size-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <X className="size-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">修改显示名称或删除目录</p>
      </div>
      {/* 内容 */}
      <div className="px-5 pb-6 pt-3">
        {children}
      </div>
    </div>
  )
}

// 通用输入框（模拟 shadcn Input）
function MockInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className
      )}
    />
  )
}

// 方案 A：现代卡片分组式 — 信息分组为卡片区块，路径用标签样式压缩，按钮重新分组
function StyleCardGroup() {
  const [name, setName] = useState(mockDisplayName)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  return (
    <SheetContainer>
      <div className="space-y-4">
        {/* 路径信息卡片 */}
        <div className="rounded-xl bg-muted/40 border border-border/60 p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FolderOpen className="size-3.5 text-primary/70" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">目录路径</span>
          </div>
          <p className="text-xs text-foreground/70 break-all pl-9 leading-relaxed">
            {mockDirPath}
          </p>
        </div>

        {/* 名称编辑卡片 */}
        <div className="rounded-xl bg-muted/40 border border-border/60 p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Pencil className="size-3.5 text-primary/70" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">显示名称</span>
          </div>
          <div className="pl-9">
            <MockInput
              value={name}
              onChange={setName}
              placeholder="输入显示名称"
              className="h-9"
            />
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/15 transition-colors shrink-0"
          >
            <Trash2 className="size-3.5" />
            删除
          </button>
          <div className="flex-1 flex gap-2 justify-end">
            <button className="px-4 py-2.5 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
              取消
            </button>
            <button className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm">
              <span className="flex items-center gap-1.5">
                <Save className="size-3.5" />
                保存
              </span>
            </button>
          </div>
        </div>

        {/* 删除确认 */}
        {showDeleteConfirm && (
          <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-3.5 animate-in fade-in slide-in-from-top-1">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="size-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-destructive mb-1">确认移除目录？</p>
                <p className="text-[11px] text-destructive/70 mb-2.5">文件不会被删除，只是从列表中移除</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1.5 rounded-lg border border-border/60 text-[11px] text-muted-foreground hover:bg-muted/30 transition-colors"
                  >
                    取消
                  </button>
                  <button className="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-[11px] font-medium hover:bg-destructive/90 transition-colors">
                    确认移除
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </SheetContainer>
  )
}

// 方案 B：紧凑列表式 — 像 iOS 设置列表，信息项紧凑排列，减少纵向空间
function StyleCompactList() {
  const [name, setName] = useState(mockDisplayName)
  const [isEditing, setIsEditing] = useState(false)

  return (
    <SheetContainer>
      <div className="space-y-3">
        {/* 路径信息 — 只读行 */}
        <div className="rounded-lg bg-muted/30 overflow-hidden">
          <div className="px-3.5 py-3 border-b border-border/40">
            <p className="text-[11px] text-muted-foreground mb-0.5">目录路径</p>
            <p className="text-xs text-foreground break-all leading-relaxed">{mockDirPath}</p>
          </div>
          <div className="px-3.5 py-3">
            <p className="text-[11px] text-muted-foreground mb-1.5">显示名称</p>
            <MockInput value={name} onChange={setName} placeholder="输入显示名称" className="h-8 text-sm" />
          </div>
        </div>

        {/* 删除操作行 */}
        <button className="w-full flex items-center justify-between px-3.5 py-3 rounded-lg bg-destructive/5 text-destructive hover:bg-destructive/10 transition-colors">
          <span className="flex items-center gap-2 text-xs font-medium">
            <Trash2 className="size-3.5" />
            从列表中移除此目录
          </span>
          <ChevronRight className="size-3.5 opacity-50" />
        </button>

        {/* 操作按钮 */}
        <div className="flex gap-2 pt-2">
          <button className="flex-1 py-2.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
            取消
          </button>
          <button className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
            保存
          </button>
        </div>
      </div>
    </SheetContainer>
  )
}

// 方案 C：图标引导式 — 每个区域有图标标识，视觉引导更清晰
function StyleIconGuide() {
  const [name, setName] = useState(mockDisplayName)

  return (
    <SheetContainer>
      <div className="space-y-5">
        {/* 路径 */}
        <div className="flex items-start gap-3">
          <div className="size-9 rounded-xl bg-muted flex items-center justify-center shrink-0 mt-0.5">
            <FolderOpen className="size-4 text-muted-foreground/70" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-muted-foreground mb-1">目录路径</p>
            <p className="text-xs text-foreground break-all leading-relaxed bg-muted/30 rounded-lg px-3 py-2">
              {mockDirPath}
            </p>
          </div>
        </div>

        {/* 名称 */}
        <div className="flex items-start gap-3">
          <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <FolderEdit className="size-4 text-primary/70" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-muted-foreground mb-1">显示名称</p>
            <MockInput value={name} onChange={setName} placeholder="输入显示名称" className="h-9" />
          </div>
        </div>

        {/* 分割线 */}
        <div className="h-px bg-border/60" />

        {/* 操作区 */}
        <div className="space-y-2">
          <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm">
            <Check className="size-3.5" />
            保存修改
          </button>
          <div className="flex gap-2">
            <button className="flex-1 py-2.5 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
              取消
            </button>
            <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/15 transition-colors">
              <Trash2 className="size-3.5" />
              移除
            </button>
          </div>
        </div>
      </div>
    </SheetContainer>
  )
}

// 方案 D：深色质感式 — 深色卡片区分信息区，操作区用对比色突出
function StyleDarkCard() {
  const [name, setName] = useState(mockDisplayName)

  return (
    <SheetContainer className="bg-gradient-to-b from-background to-muted/20">
      <div className="space-y-4">
        {/* 信息区：深色卡片 */}
        <div className="rounded-2xl bg-gradient-to-br from-muted/80 to-muted/40 border border-border/80 p-4 space-y-3.5">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <FolderOpen className="size-3 text-muted-foreground/60" />
              <span className="text-[11px] text-muted-foreground/70 uppercase tracking-wider">路径</span>
            </div>
            <p className="text-xs text-foreground/80 break-all leading-relaxed font-mono bg-background/50 rounded-lg px-2.5 py-1.5">
              {mockDirPath}
            </p>
          </div>
          <div className="h-px bg-border/40" />
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Pencil className="size-3 text-primary/60" />
              <span className="text-[11px] text-muted-foreground/70 uppercase tracking-wider">名称</span>
            </div>
            <MockInput value={name} onChange={setName} placeholder="输入显示名称" className="h-9 bg-background/50" />
          </div>
        </div>

        {/* 操作区 */}
        <div className="flex gap-2.5">
          <button className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-sm hover:shadow-md active:scale-[0.98]">
            保存设置
          </button>
        </div>

        <div className="flex gap-2.5">
          <button className="flex-1 py-2.5 rounded-xl border border-border/80 text-xs font-medium text-muted-foreground hover:bg-muted/40 transition-colors">
            取消
          </button>
          <button className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-destructive/30 text-destructive text-xs font-medium hover:bg-destructive/10 transition-colors">
            <Trash2 className="size-3.5" />
            移除
          </button>
        </div>
      </div>
    </SheetContainer>
  )
}

// 方案 E：极简分割式 — 大量留白，细线分割，最简洁克制
function StyleMinimalSplit() {
  const [name, setName] = useState(mockDisplayName)

  return (
    <SheetContainer>
      <div className="space-y-0">
        {/* 路径 */}
        <div className="py-4">
          <p className="text-[11px] text-muted-foreground/60 mb-2 tracking-wide">目录路径</p>
          <p className="text-sm text-foreground/70 break-all leading-relaxed">{mockDirPath}</p>
        </div>

        <div className="h-px bg-border/40" />

        {/* 名称 */}
        <div className="py-4">
          <p className="text-[11px] text-muted-foreground/60 mb-2 tracking-wide">显示名称</p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-sm bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/40 p-0"
          />
        </div>

        <div className="h-px bg-border/40" />

        {/* 删除 */}
        <button className="w-full flex items-center gap-2 py-4 text-destructive/80 hover:text-destructive transition-colors">
          <Trash2 className="size-3.5" />
          <span className="text-xs">从列表中移除此目录</span>
        </button>

        <div className="h-px bg-border/40" />

        {/* 操作 */}
        <div className="flex gap-3 pt-5">
          <button className="flex-1 py-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            取消
          </button>
          <button className="flex-1 py-2.5 text-xs font-medium text-foreground hover:text-primary transition-colors">
            保存
          </button>
        </div>
      </div>
    </SheetContainer>
  )
}

// 方案 F：标签页式 — 将路径和名称分成两个视觉区块，像表单卡片
function StyleFormCard() {
  const [name, setName] = useState(mockDisplayName)

  return (
    <SheetContainer>
      <div className="space-y-4">
        {/* 顶部信息徽章 */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/40">
          <div className="size-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-[11px] text-muted-foreground truncate">{mockDirPath}</span>
        </div>

        {/* 主表单区 */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">显示名称</label>
            <MockInput
              value={name}
              onChange={setName}
              placeholder="输入显示名称"
              className="h-10"
            />
            <p className="text-[11px] text-muted-foreground/60 mt-1.5">
              此名称将显示在目录切换器中
            </p>
          </div>
        </div>

        {/* 危险操作区 */}
        <div className="rounded-xl border border-destructive/15 bg-destructive/[0.03] p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-foreground mb-0.5">从列表中移除</p>
              <p className="text-[11px] text-muted-foreground/70">文件不会被删除</p>
            </div>
            <button className="shrink-0 px-3 py-1.5 rounded-lg border border-destructive/30 text-destructive text-[11px] font-medium hover:bg-destructive/10 transition-colors">
              移除
            </button>
          </div>
        </div>

        {/* 底部操作 */}
        <div className="flex gap-2 pt-1">
          <button className="flex-1 py-2.5 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
            取消
          </button>
          <button className="flex-1 py-2.5 rounded-xl bg-foreground text-background text-xs font-medium hover:bg-foreground/90 transition-colors">
            保存
          </button>
        </div>
      </div>
    </SheetContainer>
  )
}

export const editDirDialogStylesCase: PlaygroundCase = {
  id: 'edit-dir-dialog-styles',
  name: '目录设置对话框样式设计',
  description: '重新设计目录设置（EditDirDialog）在移动端 Sheet 中的视觉风格',
  variants: [
    {
      name: '方案 A：现代卡片分组式',
      description: '信息分组为圆角卡片区块，路径用图标标签压缩，内联删除确认',
      component: <StyleCardGroup />,
    },
    {
      name: '方案 B：紧凑列表式',
      description: '类似 iOS 设置列表，信息项紧凑排列在同一卡片内，节省纵向空间',
      component: <StyleCompactList />,
    },
    {
      name: '方案 C：图标引导式',
      description: '每个区域左侧有圆角图标标识，视觉引导清晰，层次更分明',
      component: <StyleIconGuide />,
    },
    {
      name: '方案 D：深色质感式',
      description: '深色渐变卡片区分信息区，操作按钮有阴影和点击缩放反馈',
      component: <StyleDarkCard />,
    },
    {
      name: '方案 E：极简分割式',
      description: '大量留白，细线分割区域，文字链接替代按钮，最简洁克制',
      component: <StyleMinimalSplit />,
    },
    {
      name: '方案 F：标签表单式',
      description: '顶部路径徽章 + 主表单区 + 危险操作隔离卡片，信息层次清晰',
      component: <StyleFormCard />,
    },
  ],
}
