# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Markdown 在线编辑器，支持服务端文件编辑、实时预览、Mermaid 图表和 LaTeX 公式。

可作为 CLI 工具全局安装：`npm install -g colonynote` → `colonynote -d /path/to/docs`

## Tmux 开发会话

**所有开发服务的启动、停止必须在名为 `note` 的 Tmux 会话中进行。**

- 启动服务前先检查 `tmux ls` 是否存在 `note` 会话，不存在则 `tmux new-session -d -s note`
- 在 `note` 会话中启动 `pnpm dev` / `pnpm dev:frontend` / `pnpm start` 等服务
- 停止服务时通过 `tmux send-keys -t note C-c` 发送中断信号，或通过 `tmux kill-session -t note` 关闭整个会话
- 查看服务日志使用 `tmux capture-pane -t note -p` 或直接 attach `tmux attach -t note`
- **禁止**在当前 Shell 直接运行开发服务命令，必须通过 Tmux 会话管理

## 构建命令

```bash
# 全栈开发（后端 + 前端热更新）- 前端 5787，后端 5788
pnpm dev

# 仅前端开发（Vite 开发服务器，端口 5787）
pnpm dev:frontend

# 仅后端开发（Hono 服务器，端口 5787）
pnpm dev:backend

# 生产构建（前端 Vite + 后端 TypeScript 编译）
pnpm build

# 运行生产服务器
pnpm start

# 预览生产构建
pnpm preview

# TypeScript 类型检查
pnpm typecheck

# 运行测试（watch 模式）
pnpm test

# 运行单个测试文件
pnpm vitest run src/path/to/file.test.ts
```

## 技术栈

- **后端**: Hono.js + @hono/node-server + ws (WebSocket)
- **前端**: React 18 + Vite + Tailwind CSS v4
- **编辑器**: TipTap 3 + tiptap-markdown (所见即所得 + 源码模式切换)
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **图标**: lucide-react
- **图表**: Mermaid
- **公式**: KaTeX
- **搜索**: FlexSearch (服务端 ripgrep) + IndexedDB 缓存
- **代码高亮**: lowlight
- **包管理**: pnpm

## 架构概览

### 目录结构

```
src/
├── client/           # 前端 React 应用
│   ├── App.tsx       # 主应用组件（布局、状态管理）
│   ├── main.tsx      # 入口
│   ├── components/   # UI 组件
│   │   ├── ui/       # shadcn/ui 基础组件
│   │   ├── TipTapEditor.tsx   # 主编辑器组件（基于 TipTap 3）
│   │   ├── MilkdownEditor.tsx  # 备用编辑器（基于 Milkdown，未启用）
│   │   ├── FileTree.tsx       # 文件树
│   │   └── ...       # 各种对话框/模态框
│   ├── hooks/        # React hooks
│   │   ├── useTabs.ts         # 多标签页管理（打开/关闭/保存/自动重载）
│   │   ├── useWebSocket.ts    # WebSocket 实时同步
│   │   └── useSearch.ts       # 搜索索引
│   └── lib/          # 工具库
│       ├── types.ts   # 类型定义
│       ├── tabTypes.ts # Tab 类型定义
│       ├── searchIntent.ts # 搜索意图解析（fuzzy/prefix/browse）
│       └── utils.ts   # 工具函数（cn 等）
├── server/           # 后端 Hono 服务
│   ├── index.ts      # 生产服务器入口（端口 5787）
│   ├── app.ts        # Hono 应用创建工厂函数（createApp）
│   ├── api.ts        # REST API 路由 + ConfigHolder 模式
│   ├── watcher.ts    # 文件变更监听（chokidar）+ WebSocket 广播
│   └── ignore.ts     # IgnoreMatcher 忽略规则引擎
├── config.ts         # 配置加载（全局 + 用户配置）
├── dev.ts            # 开发模式启动（前后端同时运行，后端端口 5788）
└── ...
bin/
└── colonynote.js     # CLI 工具入口（npm install -g colonynote）
```

### API 端点（`/api/files`）

- `GET /` — 获取文件树（按 dirs 分组）
- `GET /config` / `PATCH /config` — 读取/更新配置
- `GET /dirs` / `POST /dirs` / `DELETE /dirs` / `PATCH /dirs` — 目录 CRUD
- `GET /dirs/browse` / `GET /dirs/search` — 目录浏览/搜索（支持模糊匹配和前缀匹配）
- `GET /children` — 按需加载目录子节点
- `GET /content` — 批量读取文件内容
- `GET /search` — 全文搜索（服务端 ripgrep）
- `GET /*` — 读取单个文件或目录
- `POST /*` — 保存文件/创建文件
- `PUT /*` — 重命名/移动
- `DELETE /*` — 删除
- `POST /copy` — 复制文件

### CLI 入口

`bin/colonynote.js` — 全局 CLI 工具入口，支持 `-d`（指定目录）、`-p`（指定端口）、`-c`（指定配置文件）等参数

### 前后端通信

- **REST API**: `/api/files` 系列端点处理文件 CRUD、目录管理
- **WebSocket**: `/ws` 连接广播文件变更事件（`file:change`）和配置重载事件（`config:reload`），实现多端实时同步
- **URL 路由**: 使用 hash 格式 `#rootPath:filePath` 定位文件。Tab key 格式为 `rootPath::filePath`（多项目场景），用于区分同名文件
- **Vite 代理**（`vite.config.ts`）: 开发模式下前端端口 5787 代理 `/api` 和 `/ws` 到后端 5788；`hmr: false` 已禁用（开发模式由后端统一管理 WebSocket）

### 配置加载

- **全局配置**: `~/.colonynote/config.json`（生产环境）或 `~/.colonynote/config.dev.json`（开发环境）
- 开发环境通过 `loadConfig('development')` 加载 `config.dev.json`，生产环境通过 `loadConfig()` 加载 `config.json`
- 配置通过 `getConfigFilePath(env)` 获取配置文件绝对路径
- **配置热重载**: 使用 `fs.watch` 监听配置文件变更（500ms 防抖），重新加载后通过 WebSocket 广播 `config:reload` 消息，前端收到后触发 `config-changed` 自定义事件
- 敏感文件路径由 `DEFAULT_SENSITIVE_PATHS` 定义，禁止访问

### ConfigHolder 架构

为避免 `createFileRouter` 闭包捕获旧配置，使用 `ConfigHolder` 模式：

```typescript
// src/server/api.ts
export interface ConfigHolder {
  get config(): ColonynoteConfig
  get matcher(): IgnoreMatcher
  setConfig(config: ColonynoteConfig): void
  setMatcher(matcher: IgnoreMatcher): void
}

// 创建可变 holder，路由通过 getter 实时获取最新配置
const holder = createMutableConfigHolder(config, matcher)
const fileRouter = createFileRouter(holder, env)
```

### 忽略系统

- `IgnoreMatcher` 类（`src/server/ignore.ts`）管理忽略规则
- 支持全局配置模式（`config.ignore.patterns`）和 `.ignore` 文件（`.colonynoteignore`、`.gitignore`）
- `.ignore` 文件就近加载（从目标文件向上查找），后出现的规则优先级更高
- 支持否定规则（`!pattern`）和目录标记（`pattern/`）
- `matcher.updateGlobalPatterns()` 用于运行时更新全局规则

### Tabs 系统

多标签页由 `useTabs.ts` 统一管理，替代了早期的单文件 `useFile` 模式：

- **Tab key**: `rootPath::filePath`（多项目场景）或 `filePath`（单项目），用于区分不同目录下的同名文件
- **状态管理**: `tabsRef` 作为唯一数据源（`Map<string, OpenTab>`），`tick` state 仅用于触发 React 重渲染
- **保存流程**: `updateTabContent()` → 防抖定时器（默认 300ms）→ `doSave()` → POST 到 `/api/files` → 更新 `lastSavedContent`
- **Dirty 检测**: `content !== lastSavedContent`，关闭 dirty tab 时弹出确认对话框
- **外部变更同步**: `handleWsFileChange()` 收到 `file:change` 消息后，检查 `pendingSaveSessionsRef` 和 `SAVE_IGNORE_BUFFER_MS` (5s)，避免将自身保存误判为外部修改；若 tab 非 dirty 则自动重载内容
- **状态机**: `idle` → `saving` → `saved`/`error`，UI 根据状态显示保存中/已保存/失败提示

### 核心机制

- **自动保存**: `useTabs.updateTabContent()` 默认 300ms 防抖自动保存
- **外部修改检测**: `pendingSaveSessionsRef` + `SAVE_IGNORE_BUFFER_MS` (5s) 缓冲，避免将自己的保存误判为外部修改
- **文件树**: 按 `dirs` 分组显示，支持多根目录切换，展开状态按目录分别保存
- **服务端缓存**: `api.ts` 中的 `treeCache` 缓存文件树结果（3s TTL + configHash 校验），避免重复遍历目录
- **WebSocket 广播**: 每个 server 入口维护 `clients: Set<WebSocket>`，通过 `broadcastWsMessage` 发送消息

## 编码规范

### 组件

- 使用**函数组件 + React Hooks**，不使用类组件
- 组件文件名使用 PascalCase（如 `EditorToolbar.tsx`）
- Props 接口定义在组件文件内，命名为 `ComponentNameProps`
- 必选属性在前，可选属性（`?`）在后

### Hooks

- 自定义 Hook 以 `use` 开头，camelCase 命名（如 `useTabs`）
- 使用 `useCallback` 缓存函数引用
- 使用 `useRef` 存储最新值，避免依赖循环
- Hook 文件放在 `src/client/hooks/` 目录

### API 调用

- API 逻辑封装在自定义 Hook 中（如 `useTabs`）
- RESTful 风格：
  - `GET` → 读取
  - `POST` → 创建/保存
  - `PUT` → 更新/重命名/移动
  - `DELETE` → 删除
- 带 root 参数的动态路径构建：
  ```typescript
  const url = dirPath
    ? `/api/files${filePath}?root=${encodeURIComponent(dirPath)}`
    : `/api/files${filePath}`
  ```

### WebSocket

- 全局单例模式（模块级全局变量）
- 支持自动重连（3 秒间隔）
- 消息类型：`file:change`（文件变更通知）、`config:reload`（配置重载通知）

### 响应式设计

- **移动端优先**：断点为 768px
- 移动端/桌面端判断：`window.innerWidth < 768`
- 使用 `isMobile` state + `useEffect` 监听 resize
- 条件渲染模式：
  ```tsx
  {isMobile && <MobileComponent />}
  {!isMobile && <DesktopComponent />}
  ```
- 或使用 `variant` prop 区分

### 样式

- 使用 Tailwind CSS v4
- 使用 `cn()` 工具函数合并类名（基于 clsx + tailwind-merge）
- 图标统一使用 `lucide-react`，尺寸用 `size-4`、`size-5`

### 类型管理

- 类型定义在 `src/client/lib/types.ts`
- 客户端类型需与服务器端（`src/config.ts`）保持同步
- 使用 JSDoc 注释说明

## Git 提交规范

格式：`<类型>(<范围>): <描述>`

**类型**:
- `feat`: 新功能
- `fix`: 修复 bug
- `refactor`: 重构（非功能变更）
- `style`: 样式调整
- `chore`: 杂项/构建/配置
- `ai`: AI 相关（如添加 skill）

**范围**（可选）: 如 `editor`、`server`、`search` 等

示例：
```
feat(editor): 添加移动端快捷工具栏
fix(editor): 移动端下拉菜单改为向上展开
refactor(editor): 标题按钮改为下拉菜单，节省工具栏空间
```

## 移动端优先原则 ⚠️

本项目是**移动端优先**的 Markdown 在线编辑器。所有功能开发、UI 设计必须：
1. 首先为移动端屏幕（< 768px）设计
2. 再逐步增强到桌面端
3. 移动端/桌面端判断使用 `window.innerWidth < 768`

**移动端特殊处理**:
- 侧边栏：桌面端固定可拖拽（200-600px），移动端 Sheet 抽屉
- 工具栏：桌面端顶部固定，移动端底部固定
- 对话框：桌面端 Dialog，移动端底部 Sheet（85vh）
- 触摸优化：按钮 active 态缩放、safe-area-inset 适配

## 关键设计决策

- 保存时记录会话 ID（`pendingSaveSessionsRef`），避免在网络延迟时将自身的保存误判为外部修改
- 文件树按 `dirs` 分组显示，支持多根目录切换，展开状态按目录分别保存
- 侧边栏宽度可拖拽调整（桌面端），宽度值持久化到 localStorage
- WebSocket 使用全局单例，多个组件共享连接
- 文件保存使用防抖（默认 300ms）
- TipTap editor 内部更新使用 `isInternalUpdateRef` 防止 `onUpdate` 循环触发
- Mermaid 渲染队列（`mermaidQueue.ts`）: 单例模式，LRU 缓存（最大 50 条），并发控制（最大 2 个），按 `theme::source` 键缓存渲染结果，避免频繁调用 `mermaid.render()`
- 搜索意图解析（`searchIntent.ts`）: 将用户输入解析为三种模式 — `fuzzy`（模糊搜索）、`prefix`（前缀匹配，如 `projects/col`）、`browse`（浏览目录，如 `projects/`）
- 开发模式 Vite `hmr: false`：前后端联调时 WebSocket 升级由后端统一管理，避免 Vite HMR 与后端 `/ws` 冲突

## 功能验收

完成功能或修复后：
- 运行 `npm run typecheck` 验证无类型错误
- **使用 chrome-devtools MCP 进行功能测试** - 通过浏览器自动化验证功能在移动端和桌面端正常工作，使用前先确定 **5787** 端口是否已启动，如果启动则直接测试，否则先使用 `pnpm dev` 启动。
- **分析变更是否需要更新 README 和 README.zh**，如需要则进行更新