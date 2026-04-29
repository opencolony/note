# ColonyNote Agent Guidelines

## 项目概述

ColonyNote 是一款**移动端优先**的 Markdown 在线编辑器，支持实时预览、LaTeX 公式和 Mermaid 图表。前端使用 React + Vite + Tailwind CSS v4，后端使用 Hono.js + WebSocket。

## 构建命令

```bash
# 全栈开发（后端 + 前端热更新）- 默认端口：前端 5787，后端 5788
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


## 移动端优先项目 - 所有功能设计的第一考虑 ⚠️

**本项目是移动端优先（Mobile-First）的 Markdown 在线编辑器。**

任何功能开发、UI 设计、组件实现都必须遵循以下原则：
1. **首先为移动端屏幕设计** - 移动端体验是核心
2. **再逐步增强到桌面端** - 桌面端是移动端的增强，而非基础
3. **所有断点逻辑必须使用 `window.innerWidth < 768`** 判断移动端


## WebSocket 实时同步

- 后端通过 WebSocket 广播文件变更事件
- 前端使用 `useWebSocket` hook 监听变更
- 保存时记录会话 ID，避免误判自己的保存为外部修改

## 完成工作

参见规则文件 `.claude/rules/functional-acceptance.md`。
