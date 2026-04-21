# PC端工具栏支持

## TL;DR

> **Quick Summary**: 将现有 MobileToolbar 扩展为全平台通用的 EditorToolbar，PC端显示在编辑器顶部，移动端保持底部浮动。
> 
> **Deliverables**: 
> - 重命名 `MobileToolbar.tsx` → `EditorToolbar.tsx`（通用组件）
> - 修改 `TipTapEditor.tsx`（移除 isMobile 限制，PC端也渲染工具栏）
> - 更新 `globals.css`（添加桌面端工具栏样式）
> 
> **Estimated Effort**: Quick
> **Parallel Execution**: NO - sequential
> **Critical Path**: T1 → T2 → T3 → T4

---

## Context

### Original Request
用户反馈"pc端也需要工具栏"

### Current State
- `MobileToolbar.tsx` 已实现 8 个格式按钮
- 仅在 `isMobile && mode === 'wysiwyg'` 时渲染
- PC端无任何格式工具栏

### Design Decision
- **PC端位置**: 编辑器顶部（与 EditorContent 同级，在上方）
- **移动端位置**: 编辑器底部（保持现有设计）
- **组件复用**: 将 MobileToolbar 重命名为 EditorToolbar，通过 props 控制布局方向

---

## Work Objectives

### Core Objective
PC端和移动端都能使用格式工具栏

### Concrete Deliverables
- `src/client/components/EditorToolbar.tsx` — 通用工具栏组件
- `src/client/components/TipTapEditor.tsx` — 全平台集成
- `src/client/globals.css` — 桌面端样式

### Definition of Done
- [ ] PC端打开文件时，编辑器顶部显示工具栏
- [ ] 移动端保持底部工具栏
- [ ] `npm run typecheck` 无类型错误

### Must Have
- PC端工具栏显示在编辑器顶部
- 移动端工具栏保持底部
- 按钮功能一致（8个格式按钮）
- isActive 高亮反馈

### Must NOT Have (Guardrails)
- 不新增按钮（保持现有 8 个）
- 不改变现有 header 布局
- 不引入新依赖

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (vitest)
- **Automated tests**: None（UI 组件，以 QA 验证为主）
- **Agent-Executed QA**: chrome-devtools MCP

---

## TODOs

- [x] 1. 重构 MobileToolbar 为 EditorToolbar

  **What to do**:
  - 重命名文件 `MobileToolbar.tsx` → `EditorToolbar.tsx`
  - 添加 `variant` prop: `'desktop' | 'mobile'`
  - 根据 variant 应用不同的 className：
    - `desktop`: `editor-toolbar editor-toolbar-desktop`
    - `mobile`: `editor-toolbar editor-toolbar-mobile`
  - 保持按钮逻辑不变

  **Acceptance Criteria**:
  - [ ] `src/client/components/EditorToolbar.tsx` 存在
  - [ ] `src/client/components/MobileToolbar.tsx` 已删除
  - [ ] 组件支持 `variant` prop
  - [ ] `npm run typecheck` 通过

  **Commit**: YES
  - Message: `refactor(editor): 重命名 MobileToolbar 为 EditorToolbar，支持 variant`

- [x] 2. 更新 TipTapEditor 集成

  **What to do**:
  - 更新 import: `MobileToolbar` → `EditorToolbar`
  - 移除 `isMobile &&` 条件，改为始终渲染（仅 wysiwyg 模式）
  - PC端渲染在 `<EditorContent>` 上方
  - 移动端渲染在 `<EditorContent>` 下方
  - 传递正确的 `variant` prop

  **Acceptance Criteria**:
  - [ ] PC端工具栏显示在编辑器顶部
  - [ ] 移动端工具栏显示在编辑器底部
  - [ ] 源码模式不显示工具栏
  - [ ] `npm run typecheck` 通过

  **Commit**: YES (groups with 1)
  - Message: `feat(editor): PC端集成 EditorToolbar`

- [x] 3. 更新 globals.css 样式

  **What to do**:
  - 重命名 `.mobile-toolbar` → `.editor-toolbar`
  - 添加 `.editor-toolbar-desktop` 样式（顶部固定，横向排列，无滚动）
  - 保留 `.editor-toolbar-mobile` 样式（底部固定，横向滚动）
  - 移除 PC端编辑器顶部 padding（工具栏在外部）

  **Acceptance Criteria**:
  - [ ] PC端工具栏样式正确（顶部、无滚动、间距合适）
  - [ ] 移动端工具栏样式不变
  - [ ] 深色模式适配

  **Commit**: YES (groups with 1)
  - Message: `style(editor): 添加桌面端工具栏样式`

- [x] 4. 类型检查 + 验证

  **Acceptance Criteria**:
  - [ ] `npm run typecheck` 通过
  - [ ] 无 lint 错误

---

## Commit Strategy

- **1**: `refactor(editor): 重命名 MobileToolbar 为 EditorToolbar，支持 variant` - EditorToolbar.tsx
- **2**: `feat(editor): PC端集成 EditorToolbar + 桌面端样式` - TipTapEditor.tsx, globals.css

---

## Success Criteria

### Verification Commands
```bash
npm run typecheck  # Expected: 0 errors
```

### Final Checklist
- [ ] PC端工具栏显示正常
- [ ] 移动端工具栏显示正常
- [ ] 所有格式按钮工作正常
- [ ] `npm run typecheck` 通过
