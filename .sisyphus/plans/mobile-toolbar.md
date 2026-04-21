# 移动端快捷工具栏

## TL;DR

> **Quick Summary**: 为 ColonyNote 移动端编辑器添加底部浮动格式工具栏，让用户无需记忆 Markdown 语法即可快速应用粗体、斜体、标题、列表等常用格式。
> 
> **Deliverables**: 
> - 新建 `MobileToolbar.tsx` 组件（底部浮动工具栏）
> - 修改 `TipTapEditor.tsx`（集成 MobileToolbar）
> - 更新 `globals.css`（工具栏样式 + 安全区域适配）
> 
> **Estimated Effort**: Short
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: T1 (MobileToolbar) → T2 (集成 + 验证)

---

## Context

### Original Request
用户反馈移动端输入不够便捷，询问是否有快捷工具栏。

### Interview Summary
**Key Discussions**:
- 工具栏位置：选择底部浮动工具栏（推荐方案）
- 功能范围：常用格式即可
- 显示条件：仅移动端 + WYSIWYG 模式 + 有文件打开时

**Research Findings**:
- 编辑器使用 TipTap 3，提供 `editor.chain().focus().toggleXxx().run()` API
- 当前无任何格式工具栏，仅依赖键盘快捷键（移动端无键盘）
- `isMobile` 状态已在 App.tsx 中维护（`window.innerWidth < 768`）
- lucide-react 图标库已安装
- MilkdownEditor 存在但未使用（它有内置工具栏，但 TipTap 是当前活跃编辑器）

### Metis Review
**Identified Gaps** (addressed):
- **Editor 实例访问**: 工具栏需要访问 TipTap 的 `editor` 实例 → 采用方案 A：将工具栏放在 TipTapEditor 内部渲染
- **iPhone 安全区域**: 需处理 `safe-area-inset-bottom` → 在 CSS 中添加 `padding-bottom: env(safe-area-inset-bottom)`
- **虚拟键盘遮挡**: 键盘弹出时工具栏可能被遮挡 → 通过 `position: sticky` 而非 `fixed`，让工具栏跟随编辑器底部
- **按钮选中状态**: 使用 `editor.isActive()` 实现按钮高亮反馈
- **功能范围锁定**: 仅包含基础格式，排除 Link/Image/Table 等需要弹窗的复杂功能

---

## Work Objectives

### Core Objective
在移动端编辑器底部添加一个可横向滚动的格式工具栏，提供常用 Markdown 格式的快速操作。

### Concrete Deliverables
- `src/client/components/MobileToolbar.tsx` — 新工具栏组件
- `src/client/components/TipTapEditor.tsx` — 集成 MobileToolbar
- `src/client/globals.css` — 工具栏样式

### Definition of Done
- [ ] 移动端打开文件时，编辑器底部显示格式工具栏
- [ ] 桌面端不显示工具栏
- [ ] 源码模式下不显示工具栏
- [ ] 点击工具栏按钮能正确应用格式
- [ ] `npm run typecheck` 无类型错误

### Must Have
- 粗体、斜体、标题(H1/H2)、无序列表、有序列表、引用、代码块
- 按钮支持 `isActive` 高亮反馈（光标在对应格式内时按钮高亮）
- 横向可滚动，适配小屏幕
- iPhone 底部安全区域适配
- 深色模式适配

### Must NOT Have (Guardrails)
- 不添加 Link/Image/Table 等需要弹窗输入的功能
- 不添加桌面端工具栏
- 不引入新的 npm 依赖
- 不修改现有 header 布局
- 不创建工具栏配置系统（硬编码即可）
- 不添加撤销/重做按钮（移动端可用系统手势）

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (vitest)
- **Automated tests**: Tests-after（工具栏 UI 组件，测试收益低，以 QA 场景验证为主）
- **Framework**: vitest
- **Agent-Executed QA**: ALWAYS（通过 chrome-devtools MCP 进行浏览器自动化验证）

### QA Policy
每个任务包含 Agent-Executed QA 场景，使用 chrome-devtools MCP 进行验证：
- 移动端 viewport 模拟（375x812 iPhone 尺寸）
- 桌面端 viewport 验证（1280x720）
- 交互操作（点击按钮、验证格式应用）
- 截图保存到 `.sisyphus/evidence/`

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - 核心组件):
├── Task 1: MobileToolbar 组件 [visual-engineering]
└── Task 2: TipTapEditor 集成 + globals.css 样式 [visual-engineering]

Wave FINAL (After ALL tasks — 2 parallel reviews, then user okay):
├── Task F1: Plan compliance audit (oracle)
└── Task F2: Real manual QA via chrome-devtools (unspecified-high)

Critical Path: Task 1 → Task 2 → F1 + F2 → user okay
Max Concurrent: 2 (Wave 1)
```

### Dependency Matrix

- **1**: - → 2
- **2**: 1 → F1, F2
- **F1**: 2 → -
- **F2**: 2 → -

### Agent Dispatch Summary

- **Wave 1**: **2** - T1 → `visual-engineering`, T2 → `visual-engineering`
- **FINAL**: **2** - F1 → `oracle`, F2 → `unspecified-high`

---

## TODOs

- [x] 1. 创建 MobileToolbar 组件

  **What to do**:
  - 新建 `src/client/components/MobileToolbar.tsx`
  - 接收 `editor: Editor | null` 作为 prop（TipTap 的 editor 实例）
  - 实现以下格式按钮（使用 lucide-react 图标）：
    - **Bold** (`Bold` 图标) — `editor.chain().focus().toggleBold().run()`
    - **Italic** (`Italic` 图标) — `editor.chain().focus().toggleItalic().run()`
    - **Heading 1** (`Heading1` 图标) — `editor.chain().focus().toggleHeading({ level: 1 }).run()`
    - **Heading 2** (`Heading2` 图标) — `editor.chain().focus().toggleHeading({ level: 2 }).run()`
    - **Bullet List** (`List` 图标) — `editor.chain().focus().toggleBulletList().run()`
    - **Ordered List** (`ListOrdered` 图标) — `editor.chain().focus().toggleOrderedList().run()`
    - **Blockquote** (`Quote` 图标) — `editor.chain().focus().toggleBlockquote().run()`
    - **Code Block** (`Code` 图标) — `editor.chain().focus().toggleCodeBlock().run()`
  - 每个按钮使用 `editor.isActive('xxx')` 判断是否高亮（active 状态使用 `bg-primary/10` 或类似样式）
  - 按钮点击时检查 `editor` 是否可用，避免空引用
  - 容器使用 `overflow-x-auto` 实现横向滚动，`flex-nowrap` 保持单行
  - 使用 `shrink-0` 防止按钮被压缩
  - 每个按钮添加 `contentEditable={false}` 属性，防止 TipTap 将点击事件误认为编辑器交互

  **Must NOT do**:
  - 不添加 Link、Image、Table 按钮
  - 不添加 Undo/Redo 按钮
  - 不引入新依赖
  - 不做桌面端适配（组件本身无显示逻辑，由父组件控制显示）

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 需要实现 UI 组件，涉及 Tailwind CSS 样式和响应式布局
  - **Skills**: [`shadcn-ui`, `tailwindcss-mobile-first`]
    - `shadcn-ui`: 参考项目中 shadcn/ui 组件的样式模式（Button 风格）
    - `tailwindcss-mobile-first`: 移动端优先设计，确保触摸目标足够大（min 44px）
  - **Skills Evaluated but Omitted**:
    - `vercel-react-best-practices`: 组件简单，不涉及复杂性能优化

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 2
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/client/App.tsx:739-754` — 移动端 header 按钮样式模式（`size-11 min-h-11 min-w-11` 触摸目标）
  - `src/client/components/ui/button.tsx` — Button 组件的 variant 和 size 模式
  - `src/client/components/MermaidFullscreenDialog.tsx` — 工具栏按钮模式（contentEditable={false}）

  **API/Type References**:
  - TipTap `Editor` type from `@tiptap/react` — editor.isActive(), editor.chain()
  - TipTap StarterKit extensions: Bold, Italic, Heading, BulletList, OrderedList, Blockquote, CodeBlock

  **External References**:
  - TipTap API docs: `https://tiptap.dev/api/commands` — toggleBold, toggleItalic 等命令
  - TipTap isActive: `https://tiptap.dev/api/editor#isactive` — 检查当前节点/标记状态

  **WHY Each Reference Matters**:
  - `App.tsx:739-754` — 移动端按钮触摸目标尺寸规范（44px 最小），保持统一
  - TipTap commands API — 所有格式操作的核心 API
  - TipTap isActive — 实现按钮高亮反馈的关键

  **Acceptance Criteria**:
  - [ ] `src/client/components/MobileToolbar.tsx` 文件存在
  - [ ] 组件接收 `editor: Editor | null` prop
  - [ ] 包含 8 个格式按钮（Bold, Italic, H1, H2, BulletList, OrderedList, Blockquote, CodeBlock）
  - [ ] 按钮使用 lucide-react 图标
  - [ ] 按钮有 `isActive` 高亮样式
  - [ ] 容器支持横向滚动（overflow-x-auto）
  - [ ] `npm run typecheck` 无类型错误

  **QA Scenarios**:

  ```
  Scenario: 工具栏组件渲染正常
    Tool: chrome-devtools
    Preconditions: 启动 dev server (npm run dev)，打开 http://localhost:5787
    Steps:
      1. 设置 viewport 为 375x812 (iPhone 12/13)
      2. 选择一个 Markdown 文件打开
      3. 确认编辑器底部显示工具栏
      4. 截图保存
    Expected Result: 工具栏可见，包含 8 个图标按钮，可横向滚动
    Evidence: .sisyphus/evidence/task-1-toolbar-render.png
  ```

  **Commit**: YES
  - Message: `feat(editor): 添加移动端快捷工具栏组件`
  - Files: `src/client/components/MobileToolbar.tsx`
  - Pre-commit: `npm run typecheck`

- [x] 2. 集成 MobileToolbar 到 TipTapEditor + 样式

  **What to do**:
  - 修改 `src/client/components/TipTapEditor.tsx`：
    - 导入 `MobileToolbar` 组件
    - 在 `TipTapEditor` 组件内部，在 `<EditorContent>` 下方渲染 `MobileToolbar`
    - 传递 `editor` 实例给 `MobileToolbar`
    - 仅在 `isMobile && mode === 'wysiwyg'` 时渲染工具栏
    - 在 TipTapEditor 内部添加 `isMobile` 检测（使用 `useState` + `useEffect` 监听 resize，与 App.tsx 模式一致）
  - 修改 `src/client/globals.css`：
    - 添加工具栏容器样式：固定在底部、背景色、边框、安全区域适配
    - 确保编辑器内容区域底部有足够 padding，避免内容被工具栏遮挡
    - 深色模式适配（工具栏背景色、按钮颜色）

  **Must NOT do**:
  - 不修改 App.tsx 的布局结构
  - 不改变现有 header 或保存状态显示
  - 不在源码模式下显示工具栏

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 需要集成 UI 组件并编写 CSS 样式
  - **Skills**: [`tailwindcss-mobile-first`]
    - `tailwindcss-mobile-first`: 移动端安全区域适配、触摸目标尺寸、响应式样式
  - **Skills Evaluated but Omitted**:
    - `shadcn-ui`: 此任务主要是集成和样式，不涉及新 shadcn 组件

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1
  - **Blocks**: F1, F2
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `src/client/components/TipTapEditor.tsx:360-365` — 当前编辑器渲染结构（EditorContent 包裹方式）
  - `src/client/App.tsx:281-286` — isMobile 检测模式（useState + useEffect + resize listener）
  - `src/client/globals.css` — 现有 TipTap 编辑器样式（.tiptap-editor 相关样式）
  - `src/client/globals.css:142-146` — 移动端媒体查询模式（@media (max-width: 767px)）

  **API/Type References**:
  - `src/client/components/TipTapEditor.tsx:34-42` — TipTapEditorProps 接口定义
  - TipTap `Editor` type — editor 实例类型

  **WHY Each Reference Matters**:
  - `TipTapEditor.tsx:360-365` — 需要在此结构下方添加工具栏
  - `App.tsx:281-286` — 复用相同的 isMobile 检测逻辑
  - `globals.css` 中的 .tiptap-editor 样式 — 确保工具栏样式与现有编辑器风格一致

  **Acceptance Criteria**:
  - [ ] `TipTapEditor.tsx` 中导入并渲染 `MobileToolbar`
  - [ ] 工具栏仅在 `isMobile && mode === 'wysiwyg'` 时显示
  - [ ] `globals.css` 中包含工具栏样式
  - [ ] 编辑器内容有底部 padding，不被工具栏遮挡
  - [ ] iPhone 安全区域适配（safe-area-inset-bottom）
  - [ ] `npm run typecheck` 无类型错误

  **QA Scenarios**:

  ```
  Scenario: 移动端 WYSIWYG 模式显示工具栏
    Tool: chrome-devtools
    Preconditions: 启动 dev server，打开 http://localhost:5787，选择文件
    Steps:
      1. 设置 viewport 为 375x812 (iPhone)
      2. 确认 mode 为 wysiwyg（默认）
      3. 截图保存工具栏
    Expected Result: 底部工具栏可见，8 个按钮可点击
    Evidence: .sisyphus/evidence/task-2-mobile-wysiwyg.png

  Scenario: 移动端源码模式隐藏工具栏
    Tool: chrome-devtools
    Preconditions: 同上，已打开文件
    Steps:
      1. 设置 viewport 为 375x812
      2. 点击 header 中的模式切换按钮切换到源码模式
      3. 截图保存
    Expected Result: 工具栏不可见，仅显示 textarea
    Evidence: .sisyphus/evidence/task-2-mobile-source.png

  Scenario: 桌面端不显示工具栏
    Tool: chrome-devtools
    Preconditions: 启动 dev server，打开 http://localhost:5787，选择文件
    Steps:
      1. 设置 viewport 为 1280x720 (桌面)
      2. 确认 WYSIWYG 模式
      3. 截图保存编辑器区域
    Expected Result: 底部无工具栏
    Evidence: .sisyphus/evidence/task-2-desktop-no-toolbar.png

  Scenario: 点击工具栏按钮应用格式
    Tool: chrome-devtools
    Preconditions: 移动端 viewport 375x812，打开文件，WYSIWYG 模式
    Steps:
      1. 在编辑器中输入或选中一些文字
      2. 点击 Bold 按钮
      3. 截图保存
    Expected Result: 选中文字变为粗体，Bold 按钮高亮
    Evidence: .sisyphus/evidence/task-2-bold-format.png

  Scenario: 工具栏按钮 isActive 高亮反馈
    Tool: chrome-devtools
    Preconditions: 移动端 viewport 375x812，打开文件，WYSIWYG 模式
    Steps:
      1. 点击 Bold 按钮使文字加粗
      2. 将光标移动到粗体文字内
      3. 截图保存工具栏
    Expected Result: Bold 按钮背景色高亮（active 状态）
    Evidence: .sisyphus/evidence/task-2-bold-active.png
  ```

  **Commit**: YES (groups with 1)
  - Message: `feat(editor): 集成移动端工具栏到 TipTapEditor`
  - Files: `src/client/components/TipTapEditor.tsx`, `src/client/globals.css`
  - Pre-commit: `npm run typecheck`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 2 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, check component). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Real Manual QA** — `unspecified-high` (+ `chrome-devtools` skill)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration. Test edge cases: empty state, rapid button clicks, dark mode. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

---

## Commit Strategy

- **1**: `feat(editor): 添加移动端快捷工具栏组件` - MobileToolbar.tsx, npm run typecheck
- **2**: `feat(editor): 集成移动端工具栏到 TipTapEditor` - TipTapEditor.tsx, globals.css, npm run typecheck

---

## Success Criteria

### Verification Commands
```bash
npm run typecheck  # Expected: 0 errors
npm run dev        # Expected: dev server starts on port 5787
```

### Final Checklist
- [ ] 所有 "Must Have" 功能已实现（8 个格式按钮、isActive 高亮、横向滚动、安全区域、深色模式）
- [ ] 所有 "Must NOT Have" 已排除（无 Link/Image/Table、无桌面端工具栏、无新依赖）
- [ ] `npm run typecheck` 通过
- [ ] chrome-devtools QA 场景全部通过
