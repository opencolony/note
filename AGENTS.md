# ⚠️ 移动端优先项目 - 所有功能设计的第一考虑 ⚠️

**本项目是移动端优先（Mobile-First）的 Markdown 在线编辑器。**

任何功能开发、UI 设计、组件实现都必须遵循以下原则：
1. **首先为移动端屏幕设计** - 移动端体验是核心
2. **再逐步增强到桌面端** - 桌面端是移动端的增强，而非基础
3. **所有断点逻辑必须使用 `window.innerWidth < 768`** 判断移动端

---

# ColonyDoc Agent Guidelines

## 项目概述

ColonyDoc 是一款**移动端优先**的 Markdown 在线编辑器，支持实时预览、LaTeX 公式和 Mermaid 图表。前端使用 React + Vite + Tailwind CSS v4，后端使用 Hono.js + WebSocket。

## 构建命令

```bash
# 全栈开发（后端 + 前端热更新）
npm run dev

# 仅前端开发（Vite 开发服务器，端口 5787）
npm run dev:frontend

# 仅后端开发（Hono 服务器，端口 5788）
npm run dev:backend

# 生产构建（前端 + 后端 TypeScript 编译）
npm run build

# 预览生产构建
npm run preview

# 运行生产服务器
npm run start

# TypeScript 类型检查（严格模式）
npm run typecheck
```

**注意：** 项目未配置测试框架或 linting。提交前务必运行 `npm run typecheck`。

## 代码风格指南

### TypeScript
- **严格模式已启用** - 禁止隐式 any，严格 null 检查
- 所有函数参数和返回值使用显式类型
- 为组件 props 定义接口
- 简单类型别名用 `type`，复杂对象形状用 `interface`

### React 模式
- 使用 `memo()` 处理频繁重渲染的纯组件
- 使用 `useCallback()` 处理作为 props 传递的事件处理函数
- 使用 `useRef()` 处理跨渲染持久化但不触发重渲染的值
- `useEffect` 必须指定依赖数组
- 页面组件使用默认导出，UI 组件使用命名导出

### 导入规范
```tsx
// React hooks
import { useState, useCallback, useEffect, useRef, memo } from 'react'

// Icons
import { IconName } from 'lucide-react'

// UI 组件
import { Button } from './components/ui/button'

// 工具函数
import { cn } from './lib/utils'

// Path aliases
import { cn } from '@/client/lib/utils'
```

### 样式规范
- 仅使用 Tailwind CSS 类
- 使用 `cn()` 工具函数（clsx + tailwind-merge）处理条件类名
- 基于 shadcn/ui 组件构建（Button、Sheet、Dialog 等）
- 使用 `class-variance-authority` (CVA) 定义组件变体
- **移动端类名在前**：先写移动端样式，再逐步增强到桌面端

### 组件结构
```tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/client/lib/utils"

const componentVariants = cva("base-classes", {
  variants: {
    variant: { default: "...", outline: "..." },
    size: { default: "...", sm: "..." },
  },
  defaultVariants: { variant: "default", size: "default" },
})

export interface ComponentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof componentVariants> {}

const Component = memo(function Component({
  className,
  variant,
  size,
  ...props
}: ComponentProps) {
  return (
    <div className={cn(componentVariants({ variant, size, className }))} {...props} />
  )
})

export { Component, componentVariants }
```

### 错误处理
- 异步操作必须包装在 try/catch 中
- 错误日志使用描述性消息：`console.error('Failed to fetch files:', e)`
- 在 UI 中显式处理加载和错误状态

### 命名约定
| 类型 | 约定 | 示例 |
|------|------|------|
| 组件 | PascalCase | `FileTree`, `TipTapEditor` |
| Hooks | camelCase + use 前缀 | `useFile`, `useWebSocket` |
| 文件 | kebab-case | `utils.ts`, `api-helpers.ts` |
| CSS 类 | kebab-case | `text-muted-foreground` |
| 接口 | PascalCase + 描述性名称 | `FileNode`, `SidebarContentProps` |

## 移动端优先设计（重要）

本项目**移动端优先**。所有 UI 必须先为移动端屏幕设计，再增强到桌面端。

### 断点
- 移动端：`window.innerWidth < 768`
- 桌面端：`window.innerWidth >= 768`

### 移动端模式
- 使用 `isMobile` 状态条件渲染移动端/桌面端 UI
- 移动端：基于 Drawer 的侧边栏导航（Sheet 组件）
- 桌面端：固定侧边栏
- 触摸友好的点击目标（最小 44px）
- 移动端 Header 包含汉堡菜单、搜索和编辑器模式切换

### 移动端条件渲染示例
```tsx
const [isMobile, setIsMobile] = useState(() => {
  if (typeof window === 'undefined') return false
  return window.innerWidth < 768
})

useEffect(() => {
  const checkMobile = () => setIsMobile(window.innerWidth < 768)
  checkMobile()
  window.addEventListener('resize', checkMobile)
  return () => window.removeEventListener('resize', checkMobile)
}, [])
```

## 完成工作

完成功能或修复后：
1. 运行 `npm run typecheck` 验证无类型错误
2. 询问用户工作是否完成且可接受
3. 用户确认后，提交更改并推送到远程
4. 用户请求修改时，进行相应修改
5. **分析变更是否需要更新 README 和 README.zh**，如需要则进行更新

## 项目结构

```
src/
├── client/              # React 前端
│   ├── components/     # UI 组件
│   │   ├── ui/         # shadcn/ui 基础组件
│   │   └── *.tsx       # 功能组件
│   ├── hooks/          # 自定义 React hooks
│   ├── lib/            # 工具函数（cn、api 客户端）
│   └── pages/          # 页面组件
├── server/             # Hono.js 后端
│   ├── api.ts          # 文件路由 API
│   ├── app.ts          # Hono 应用配置
│   ├── index.ts        # 服务器入口
│   └── watcher.ts      # 文件系统监视器
└── dev.ts              # 开发服务器启动器
```

## 路径别名

`@/*` 别名映射到 `src/*`：
- `@/client/*` → `src/client/*`
- `@/server/*` → `src/server/*`（仅后端使用）

## 关键依赖

- **UI**: React 18, Tailwind CSS v4, shadcn/ui (Radix UI), lucide-react
- **编辑器**: TipTap 3, Milkdown, Mermaid, KaTeX
- **后端**: Hono, @hono/node-server, ws (WebSocket)
- **开发**: TypeScript 5, Vite 6, tsx

## 可用技能

`.agents/skills/` 目录包含专业指导：
- `vercel-react-best-practices/` - React 性能优化
- `shadcn-ui/` - shadcn/ui 组件模式
- `tailwind-design-system/` - Tailwind CSS v4 设计令牌
