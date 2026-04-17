# Bug Fix: 外部修改提示 + 侧边栏文件高亮

## TL;DR

> **Quick Summary**: 修复 ColonyNote 中两个独立 bug：1) 外部文件修改不触发刷新提示；2) 侧边栏文件树中当前打开的文件不高亮。
> 
> **Deliverables**:
> - 修复 FileTree.tsx 中 `rootPath` 字段不匹配导致的高亮失效
> - 修复 App.tsx 中 WebSocket 消息路径格式不匹配导致的外部变更检测失效
> - 统一服务端/客户端文件路径格式
> 
> **Estimated Effort**: Short (~30 min)
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 (path normalization) → Task 2 (sidebar highlight fix) + Task 3 (WebSocket fix)

---

## Context

### Original Request
用户报告两个问题：
1. 正在查看某个文件时，其他人修改了这个文件，应该提示是否刷新，但现在没提示（"完全没提示"）
2. 打开文件后，侧边栏中对应的文件没有高亮显示（"始终不高亮"）

### Interview Summary
**Key Discussions**:
- Bug 1 确认是"完全没提示" — 外部变更从未触发刷新对话框
- Bug 2 确认是"始终不高亮" — 没有任何文件显示高亮状态

**Research Findings**:
- **Bug 2 根因**: API 返回的文件节点使用 `dirPath` 字段（api.ts:96,106），但 FileTree.tsx 的 FileNode 接口和 isActive 计算使用 `rootPath`（FileTree.tsx:32,77）。`node.rootPath` 始终为 `undefined`，导致 `undefined === activeRoot` 永远为 false。
- **Bug 1 根因**: 服务端 WebSocket 消息中 `path` 是 `filePath.replace(actualRootPath, '')`（index.ts:110），可能产生前导斜杠不一致的路径（如 `/subdir/file.md` vs `subdir/file.md`），与客户端 `useFile` 中的 `path` 格式不匹配，导致 line 370 的 `changedPath === path` 比较失败。

### Metis Review
**Identified Gaps** (addressed):
- **路径格式统一**: 需在服务端和客户端统一路径格式（始终带或不带前导斜杠）
- **测试策略**: 项目无测试框架，依赖 Agent-Executed QA Scenarios（Playwright 浏览器自动化）
- **Scope creep 防范**: 仅修复这两个 bug，不添加新功能（如自动重载、变更图标等）

---

## Work Objectives

### Core Objective
修复两个已确认的 bug，确保外部文件修改能正确提示刷新，侧边栏能正确高亮当前文件。

### Concrete Deliverables
- `src/server/api.ts` — 统一文件节点字段名（`dirPath` → `rootPath`）
- `src/server/index.ts` — 统一 WebSocket 消息路径格式
- `src/client/components/FileTree.tsx` — 修复 isActive 匹配逻辑
- `src/client/App.tsx` — 修复 WebSocket 消息处理中的路径比较

### Definition of Done
- [ ] `npm run typecheck` 通过，无类型错误
- [ ] Chrome DevTools 验证：打开文件后侧边栏对应文件高亮
- [ ] Chrome DevTools 验证：模拟外部文件修改后弹出刷新对话框

### Must Have
- 侧边栏高亮：点击文件后立即在侧边栏显示高亮状态
- 外部变更提示：其他进程修改当前文件时弹出 AlertDialog
- 移动端优先：所有修复在移动端和桌面端均正常工作

### Must NOT Have (Guardrails)
- 不添加新功能（如自动重载、文件变更图标、unsaved changes 警告等）
- 不引入新的依赖或库
- 不改变现有的 WebSocket 消息结构（仅修复路径格式）
- 不改变 API 响应结构（仅修复字段名一致性）

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: None
- **Framework**: none
- **Agent-Executed QA**: ALWAYS (mandatory for all tasks)

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Chrome DevTools MCP — Navigate, interact, assert DOM, screenshot
- **API/Backend**: Use Bash (curl) — Send requests, assert status + response fields

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - path normalization foundation):
├── Task 1: 统一服务端路径格式 [quick]
└── Task 2: 统一客户端 FileNode 字段名 [quick]

Wave 2 (After Wave 1 - bug-specific fixes, parallel):
├── Task 3: 修复侧边栏高亮逻辑 [quick]
└── Task 4: 修复外部变更检测逻辑 [quick]

Wave FINAL (After ALL tasks — 4 parallel reviews, then user okay):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay
```

### Dependency Matrix
- **1**: - → 2, 3, 4
- **2**: 1 → 3
- **3**: 1, 2 → -
- **4**: 1 → -

### Agent Dispatch Summary
- **Wave 1**: 2 tasks — T1 → `quick`, T2 → `quick`
- **Wave 2**: 2 tasks — T3 → `quick`, T4 → `quick`
- **FINAL**: 4 tasks — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. 统一服务端路径格式

  **What to do**:
  - 修改 `src/server/index.ts` line 110，确保 WebSocket 消息中的 `path` 始终带前导斜杠（与 API 返回格式一致）
    - 当前: `const relativePath = filePath.replace(actualRootPath, '')`
    - 修改为: `const relativePath = '/' + filePath.replace(actualRootPath, '').replace(/^\/+/, '')` 或确保路径格式与 walkDirectory 一致
  - 验证 `src/server/watcher.ts` 中回调函数的路径格式
  - 运行 `npm run typecheck` 确认无类型错误

  **Must NOT do**:
  - 不改变 WebSocket 消息的 type/event/rootPath 字段
  - 不改变 chokidar 的监听逻辑

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 单文件少量代码修改，逻辑简单明确
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `git-master`: 修改完成后需要 commit，但可在最终统一提交

  **Parallelization**:
  - **Can Run In Parallel**: NO (blocks Tasks 2, 3, 4)
  - **Parallel Group**: Wave 1 (with Task 2, but Task 2 depends on this)
  - **Blocks**: Task 2, Task 3, Task 4
  - **Blocked By**: None

  **References**:
  - `src/server/index.ts:108-116` — WebSocket 消息构建逻辑，需要修改 relativePath 计算
  - `src/server/api.ts:91-94` — walkDirectory 中的路径格式（`'/' + relativePath`），作为目标格式参考
  - `src/server/watcher.ts:38-64` — watcher 回调中的路径传递方式

  **Acceptance Criteria**:
  - [ ] `npm run typecheck` 通过
  - [ ] curl 测试 WebSocket 消息格式正确

  **QA Scenarios**:

  ```
  Scenario: 验证 WebSocket 消息路径格式
    Tool: Bash (curl + ws)
    Preconditions: 服务运行中，存在文件 /subdir/test.md
    Steps:
      1. 修改文件 /subdir/test.md 的内容（通过 shell echo）
      2. 捕获 WebSocket 消息（或通过日志验证）
      3. 验证消息中 path 字段为 "/subdir/test.md"（带前导斜杠）
    Expected Result: WebSocket 消息中 path 字段格式与 API 返回的文件 path 字段格式一致（都以 / 开头）
    Evidence: .sisyphus/evidence/task-1-ws-path-format.json
  ```

  **Commit**: NO (groups with Task 2)

- [x] 2. 统一客户端 FileNode 字段名

  **What to do**:
  - 修改 `src/server/api.ts` walkDirectory 函数，将返回节点的 `dirPath` 字段改为 `rootPath`
    - Line 96: `dirPath` → `rootPath`
    - Line 106: `dirPath` → `rootPath`
  - 搜索所有使用 `dirPath` 的地方并更新（grep 确认无遗漏）
  - 运行 `npm run typecheck` 确认无类型错误

  **Must NOT do**:
  - 不改变 FileNode 的其他字段（name, path, type, children）
  - 不改变 API 路由或响应结构

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 字段名替换，使用 lsp_rename 或全局替换即可
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 1 completing first to ensure path format is consistent)
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 3
  - **Blocked By**: Task 1

  **References**:
  - `src/server/api.ts:76-125` — walkDirectory 函数，需要修改返回节点的字段名
  - `src/client/components/FileTree.tsx:28-34` — FileNode 接口定义（已有 rootPath 字段）
  - `src/client/App.tsx:28-34` — App.tsx 中的 FileNode 接口定义

  **Acceptance Criteria**:
  - [ ] `npm run typecheck` 通过
  - [ ] 所有 `dirPath` 引用已替换为 `rootPath`

  **QA Scenarios**:

  ```
  Scenario: 验证 API 返回的文件节点包含 rootPath 字段
    Tool: Bash (curl)
    Preconditions: 服务运行中，根目录下有至少一个 .md 文件
    Steps:
      1. curl http://localhost:5787/api/files/
      2. 解析 JSON 响应，检查 files 数组中每个节点的字段
      3. 验证每个文件节点包含 rootPath 字段（而非 dirPath）
    Expected Result: API 响应中文件节点包含 rootPath 字段，值为根目录的完整路径
    Evidence: .sisyphus/evidence/task-2-api-rootpath-field.json
  ```

  **Commit**: YES (with Task 1)
  - Message: `fix(server): unify file node field name and path format`
  - Files: `src/server/api.ts`, `src/server/index.ts`
  - Pre-commit: `npm run typecheck`

- [x] 3. 修复侧边栏高亮逻辑

  **What to do**:
  - 确认 `src/client/components/FileTree.tsx` line 77 的 isActive 计算逻辑正确
    - 当前: `const isActive = node.path === activePath && node.rootPath === activeRoot`
    - 修复后: 由于 Task 2 已将 `dirPath` 改为 `rootPath`，此逻辑应自动生效
    - 但需验证 `activeRoot`（来自 App.tsx 的 `activeDir`）与 `node.rootPath` 的格式是否一致
  - 如果格式仍不一致，需要在 App.tsx 或 FileTree.tsx 中添加路径规范化
  - 运行 `npm run typecheck`

  **Must NOT do**:
  - 不改变 SidebarMenuButton 的样式类
  - 不改变 Collapsible 的展开/折叠逻辑

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 验证并可能微调一行比较逻辑
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 4, after Wave 1)
  - **Parallel Group**: Wave 2 (with Task 4)
  - **Blocks**: -
  - **Blocked By**: Task 1, Task 2

  **References**:
  - `src/client/components/FileTree.tsx:55-139` — TreeNode 组件，isActive 计算和高亮应用
  - `src/client/components/FileTree.tsx:77` — isActive 计算逻辑
  - `src/client/components/ui/sidebar.tsx:190-238` — SidebarMenuButton 的 isActive 样式
  - `src/client/App.tsx:740-741` — 移动端传递 activePath 和 activeRoot
  - `src/client/App.tsx:777-778` — 桌面端传递 activePath 和 activeRoot

  **Acceptance Criteria**:
  - [ ] `npm run typecheck` 通过
  - [ ] 打开文件后侧边栏对应文件显示高亮背景

  **QA Scenarios**:

  ```
  Scenario: 桌面端 - 打开文件后侧边栏高亮
    Tool: Chrome DevTools
    Preconditions: 服务运行在 localhost:5787，存在文件 /test.md
    Steps:
      1. 导航到 http://localhost:5787
      2. 等待页面加载完成
      3. 在侧边栏中点击 /test.md 文件
      4. 等待文件内容加载到编辑器
      5. 检查侧边栏中 /test.md 对应的 SidebarMenuButton 元素
      6. 验证该元素具有 data-active="true" 属性
      7. 截图保存
    Expected Result: 侧边栏中 /test.md 文件项显示高亮背景（bg-sidebar-accent），data-active="true"
    Evidence: .sisyphus/evidence/task-3-desktop-sidebar-highlight.png

  Scenario: 移动端 - 打开文件后侧边栏高亮
    Tool: Chrome DevTools
    Preconditions: 服务运行在 localhost:5787，存在文件 /test.md
    Steps:
      1. 设置视口为移动端 (375x812)
      2. 导航到 http://localhost:5787
      3. 点击汉堡菜单按钮打开侧边栏
      4. 在侧边栏中点击 /test.md 文件
      5. 重新打开侧边栏（点击汉堡菜单）
      6. 检查侧边栏中 /test.md 对应的 SidebarMenuButton 元素
      7. 验证该元素具有 data-active="true" 属性
      8. 截图保存
    Expected Result: 侧边栏中 /test.md 文件项显示高亮背景
    Evidence: .sisyphus/evidence/task-3-mobile-sidebar-highlight.png

  Scenario: 子目录文件 - 打开后侧边栏高亮
    Tool: Chrome DevTools
    Preconditions: 服务运行，存在文件 /subdir/nested.md
    Steps:
      1. 导航到 http://localhost:5787
      2. 在侧边栏中展开 /subdir 文件夹
      3. 点击 /subdir/nested.md 文件
      4. 验证侧边栏中 /subdir/nested.md 文件项具有 data-active="true"
      5. 截图保存
    Expected Result: 子目录中的文件打开后正确高亮
    Evidence: .sisyphus/evidence/task-3-nested-file-highlight.png
  ```

  **Commit**: YES (groups with Task 4)
  - Message: `fix(client): fix sidebar file highlight and external change detection`
  - Files: `src/client/components/FileTree.tsx`, `src/client/App.tsx`
  - Pre-commit: `npm run typecheck`

- [x] 4. 修复外部变更检测逻辑

  **What to do**:
  - 修改 `src/client/App.tsx` 中 WebSocket 消息处理逻辑（lines 342-391）
  - 确保 `changedPath` 与 `path` 的比较考虑路径格式一致性
    - 当前 line 370: `if (path && changedPath === path)`
    - 可能需要规范化路径比较（去除前导斜杠差异）
  - 验证 line 349 的 activeDir 过滤逻辑正确：`if (rootPath && activeDir && rootPath !== activeDir) return`
  - 确保 `pendingSaveSessionsRef` 和 `SAVE_IGNORE_BUFFER_MS` 逻辑不被破坏
  - 运行 `npm run typecheck`

  **Must NOT do**:
  - 不改变 AlertDialog 的 UI 或文案
  - 不改变 save session 跟踪逻辑
  - 不改变 fetchFiles() 调用

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 修改路径比较逻辑，可能只需添加路径规范化
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 3, after Wave 1)
  - **Parallel Group**: Wave 2 (with Task 3)
  - **Blocks**: -
  - **Blocked By**: Task 1

  **References**:
  - `src/client/App.tsx:342-391` — WebSocket 消息处理，外部变更检测核心逻辑
  - `src/client/App.tsx:192-198` — pendingSaveSessionsRef 和 SAVE_IGNORE_BUFFER_MS 定义
  - `src/client/hooks/useFile.ts:23-39` — load 函数，设置 path 状态
  - `src/server/index.ts:108-116` — WebSocket 消息构建（Task 1 已修改）

  **Acceptance Criteria**:
  - [ ] `npm run typecheck` 通过
  - [ ] 模拟外部文件修改后弹出刷新对话框

  **QA Scenarios**:

  ```
  Scenario: 外部修改当前文件 - 弹出刷新对话框
    Tool: Chrome DevTools + Bash
    Preconditions: 服务运行，已打开文件 /test.md，编辑器中有内容
    Steps:
      1. 在浏览器中打开 /test.md 文件
      2. 通过 shell 修改 /test.md 文件内容（echo "external change" >> /path/to/test.md）
      3. 等待 6 秒（超过 SAVE_IGNORE_BUFFER_MS 的 5 秒缓冲）
      4. 检查页面是否出现 AlertDialog
      5. 验证对话框标题为 "文件已更新"
      6. 截图保存
    Expected Result: 弹出 AlertDialog，标题为 "文件已更新"，描述为 "当前文件已被外部修改。是否刷新内容？"
    Evidence: .sisyphus/evidence/task-4-external-change-dialog.png

  Scenario: 自己保存文件 - 不弹出刷新对话框
    Tool: Chrome DevTools
    Preconditions: 服务运行，已打开文件 /test.md
    Steps:
      1. 在浏览器中打开 /test.md 文件
      2. 在编辑器中修改内容（通过 JS 注入或模拟输入）
      3. 等待自动保存完成（300ms debounce + API 响应）
      4. 等待 6 秒
      5. 检查页面是否出现 AlertDialog
    Expected Result: 不弹出任何对话框，文件正常保存
    Evidence: .sisyphus/evidence/task-4-self-save-no-dialog.png

  Scenario: 外部修改非当前文件 - 不弹出刷新对话框
    Tool: Chrome DevTools + Bash
    Preconditions: 服务运行，已打开文件 /test.md，存在另一文件 /other.md
    Steps:
      1. 在浏览器中打开 /test.md 文件
      2. 通过 shell 修改 /other.md 文件内容
      3. 等待 6 秒
      4. 检查页面是否出现 AlertDialog
    Expected Result: 不弹出刷新对话框（因为修改的不是当前打开的文件）
    Evidence: .sisyphus/evidence/task-4-other-file-no-dialog.png
  ```

  **Commit**: YES (groups with Task 3)
  - Message: `fix(client): fix sidebar file highlight and external change detection`
  - Files: `src/client/components/FileTree.tsx`, `src/client/App.tsx`
  - Pre-commit: `npm run typecheck`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + linter + `bun test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp).
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high` (+ `chrome-devtools` skill if UI)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (features working together, not isolation). Test edge cases: empty state, invalid input, rapid actions. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **1**: `fix(server): unify file node field name and path format` - src/server/api.ts, src/server/index.ts
- **2**: `fix(client): fix sidebar file highlight and external change detection` - src/client/components/FileTree.tsx, src/client/App.tsx

---

## Success Criteria

### Verification Commands
```bash
npm run typecheck  # Expected: 0 errors
```

### Final Checklist
- [ ] 侧边栏高亮：打开任意文件后，侧边栏中对应文件显示高亮
- [ ] 外部变更提示：外部修改当前文件后弹出刷新对话框
- [ ] 自己保存文件不触发刷新对话框
- [ ] 修改非当前文件不触发刷新对话框
- [ ] `npm run typecheck` 通过
- [ ] 无 AI slop 模式（过度注释、过度抽象、通用命名）
