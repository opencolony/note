# 增强项目搜索功能

## TL;DR

> **Quick Summary**: 增强"添加项目"对话框的搜索功能，支持更智能的路径意图识别。`~/do` 匹配 home 目录下以 do 开头的目录，`/et` 匹配根目录下以 et 开头的目录，普通输入保持现有模糊匹配。
> 
> **Deliverables**:
> - 新增搜索意图解析工具 `parseSearchIntent()`
> - 增强后端 `/api/files/dirs/search` 支持 prefix 匹配模式
> - 更新 `AddDirDialog` 发送匹配模式参数
> - 修复 `HighlightedPath` 高亮显示
> - 添加 Vitest 测试基础设施
> 
> **Estimated Effort**: Medium (6 个原子提交)
> **Parallel Execution**: NO - 顺序依赖
> **Critical Path**: 测试基础设施 → parseSearchIntent → 后端 prefix 搜索 → 前端集成 → 高亮修复

---

## Context

### Original Request
增强添加项目的搜索功能，支持三种场景：
1. `projects` → 全盘模糊匹配包含 "projects" 的目录
2. `~/do` → home 目录下以 "do" 开头的目录
3. `/et` → 根目录下以 "et" 开头的目录

### Interview Summary
**Key Discussions**:
- 用户场景实质是**智能意图检测**，不是字面 glob 解析
- `~/do` 应理解为在 home 目录下搜索以 "do" 为前缀的目录
- 普通输入如 "projects" 保持现有的 fuzzysort 模糊匹配

**Research Findings**:
- 当前搜索仅匹配目录名，使用 `fuzzysort` 库
- `minimatch` 已存在但仅用于敏感路径检查
- 无测试框架，需要添加 Vitest

### Metis Review
**Identified Gaps** (addressed):
- **Gap**: 无测试基础设施 → 添加 Vitest 设置任务
- **Gap**: `fuzzysort` 返回的 `indexes` 高亮需要适配 prefix 匹配 → 添加高亮修复任务
- **Gap**: 需明确 `PathInput` 不在本计划范围内 → 在 scope 中明确排除

---

## Work Objectives

### Core Objective
实现智能搜索意图识别，支持三种输入模式：
1. 无前缀纯文字 → 全盘 fuzzysort 模糊匹配
2. `~/` 前缀 → home 目录下的 prefix 匹配
3. `/` 前缀 → 根目录下的 prefix 匹配

### Concrete Deliverables
- `src/client/lib/searchIntent.ts` - 搜索意图解析工具函数（放在 client/lib，供前端使用）
- `src/client/lib/searchIntent.test.ts` - 对应的单元测试
- `src/server/api.ts` (lines 278-338) - 增强 `/dirs/search` 端点
- `src/client/components/AddDirDialog.tsx` - 集成意图解析和模式参数
- `src/client/components/PathInput.tsx` (lines 19-52) - 修复 `HighlightedPath` 组件的高亮显示

### Definition of Done
- [ ] 输入 `~/do` 返回 home 目录下以 do 开头的目录
- [ ] 输入 `/et` 返回根目录下以 et 开头的目录
- [ ] 输入 `projects` 保持现有 fuzzysort 模糊匹配
- [ ] 搜索结果正确高亮匹配部分
- [ ] 所有测试通过 `bun test`

### Must Have
- 支持 `~`, `/` 前缀检测
- 支持 prefix 和 fuzzy 两种匹配模式
- 向后兼容现有功能
- 完整的单元测试覆盖

### Must NOT Have (Guardrails)
- **不修改** `PathInput.tsx` 的搜索调用逻辑（本次排除，后续 PR）
- **不添加** `fast-glob` 依赖（使用现有工具）
- **不改变** MAX_DEPTH/MAX_RESULTS 限制
- **不支持** 完整 glob 语法（仅 prefix 匹配）

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: YES (TDD)
- **Framework**: Vitest
- **TDD Flow**: RED (编写失败测试) → GREEN (实现通过) → REFACTOR

### QA Policy
每个任务包含 Playwright/Tmux 验证场景，证据保存到 `.sisyphus/evidence/`。

---

## Execution Strategy

### Sequential Execution (No Parallelism)

此任务需顺序执行，前序任务是后序的基础：

```
Wave 1 (基础 - 必须先完成):
├── Task 1: 添加 Vitest 测试基础设施 [quick]
└── Task 2: 创建 parseSearchIntent 工具和测试 [quick]

Wave 2 (后端 - 依赖 Wave 1):
├── Task 3: 增强后端搜索支持 prefix 模式 [quick]
└── Task 4: 测试后端 prefix 搜索 [quick]

Wave 3 (前端集成 - 依赖 Wave 2):
├── Task 5: 更新 AddDirDialog 集成意图解析 [quick]
└── Task 6: 修复 HighlightedPath prefix 高亮 [quick]

Wave 4 (验证):
└── Task 7: 端到端验证和类型检查 [quick]
```

### Dependency Matrix
- **Task 2**: 依赖 Task 1
- **Task 3**: 依赖 Task 2
- **Task 4**: 依赖 Task 3
- **Task 5**: 依赖 Task 3
- **Task 6**: 依赖 Task 5
- **Task 7**: 依赖 Task 4, Task 6

---

## TODOs

### Wave 1: 基础设施

- [ ] 1. 添加 Vitest 测试基础设施

  **What to do**:
  - 安装 `vitest` 作为开发依赖
  - 创建 `vitest.config.ts` 配置文件
  - 添加 `test` script 到 `package.json`

  **Must NOT do**:
  - 不写任何测试代码（留给 Task 2）

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocks**: Task 2

  **Acceptance Criteria**:
  - [ ] `bun test` 命令可用
  - [ ] 可以运行空的测试文件不报错

  **QA Scenarios**:
  ```
  Scenario: Vitest 基础设施正常工作
    Tool: Bash
    Steps:
      1. echo "export default { test: { environment: 'node' } }" > vitest.config.ts
      2. bun add -D vitest
      3. package.json 添加 "test": "vitest"
      4. bun test --run
    Expected Result: 命令成功执行，无错误
    Evidence: .sisyphus/evidence/task-1-vitest-setup.log
  ```

  **Commit**: YES
  - Message: `chore: add vitest test infrastructure`
  - Files: `vitest.config.ts`, `package.json`, `package-lock.json`

---

- [ ] 2. 创建 parseSearchIntent 搜索意图解析工具

  **What to do**:
  - 创建 `src/client/lib/searchIntent.ts`:
    ```typescript
    export function parseSearchIntent(input: string): {
      mode: 'fuzzy' | 'prefix';
      root: string;  // '~' 或 '/' 或 ''
      query: string; // 实际搜索词
    }
    ```
  - 处理三种场景：
    - `projects` → `{ mode: 'fuzzy', root: '', query: 'projects' }` (全盘搜索)
    - `~/do` → `{ mode: 'prefix', root: '~', query: 'do' }`
    - `/et` → `{ mode: 'prefix', root: '/', query: 'et' }`
  - 创建 `src/client/lib/searchIntent.test.ts` 测试文件
  - 测试边界情况：`~`, `~/`, `/`, 空字符串

  **Must NOT do**:
  - 不实现实际的搜索逻辑，只做输入解析
  - 不修改其他文件

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocked By**: Task 1
  - **Blocks**: Task 3

  **Acceptance Criteria**:
  - [ ] `bun test src/lib/searchIntent.test.ts` → 所有测试通过
  - [ ] 覆盖所有三种场景和边界情况

  **QA Scenarios**:
  ```
  Scenario: parseSearchIntent 正确解析各种输入
    Tool: Bash
    Steps:
      1. bun test src/lib/searchIntent.test.ts --run
    Expected Result: 所有测试通过 (6+ 测试用例)
    Evidence: .sisyphus/evidence/task-2-unit-tests.log
  ```

  **Commit**: YES
  - Message: `feat: add search intent parser with tests`
  - Files: `src/lib/searchIntent.ts`, `src/lib/searchIntent.test.ts`

---

### Wave 2: 后端增强

- [ ] 3. 增强后端搜索支持 prefix 匹配模式

  **What to do**:
  - 修改 `src/server/api.ts` `/api/files/dirs/search` 端点
  - 新增 `mode` query 参数 (可选, 默认 'fuzzy')
  - 当 `mode === 'prefix'` 时:
    - 使用字符串 `startsWith` 而不是 fuzzysort
    - 只返回目录名以 query 开头的结果
  - 当 `mode === 'fuzzy'` 时保持现有 fuzzysort 行为
  - 修改返回格式以支持 prefix 匹配的 `indexes`

  **Must NOT do**:
  - 不删除现有的 fuzzysort 逻辑
  - 不改变现有的 MAX_DEPTH/MAX_RESULTS 限制

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocked By**: Task 2
  - **Blocks**: Task 4, Task 5

  **References**:
  - `src/server/api.ts:278-338` - 当前搜索端点实现
  - `src/server/api.ts:325` - fuzzysort 调用位置

  **Acceptance Criteria**:
  - [ ] `/api/files/dirs/search?q=do&root=~&mode=prefix` 返回 home 下以 do 开头的目录
  - [ ] `/api/files/dirs/search?q=projects&mode=fuzzy` 保持现有行为

  **QA Scenarios**:
  ```
  Scenario: prefix 模式正确过滤
    Tool: Bash (curl)
    Steps:
      1. pnpm dev:backend (启动后端)
      2. curl "http://localhost:5788/api/files/dirs/search?q=do&root=~&mode=prefix"
      3. 验证返回结果都是 "do" 开头
    Expected Result: 返回结果目录名以 "do" 开头
    Evidence: .sisyphus/evidence/task-3-prefix-api.json

  Scenario: fuzzy 模式保持向后兼容
    Tool: Bash (curl)
    Steps:
      1. curl "http://localhost:5788/api/files/dirs/search?q=doc"
      2. 验证返回结果包含 "Documents" 等高亮索引
    Expected Result: fuzzysort 行为不变
    Evidence: .sisyphus/evidence/task-3-fuzzy-api.json
  ```

  **Commit**: YES
  - Message: `feat: add prefix matching mode to search endpoint`
  - Files: `src/server/api.ts`

---

- [ ] 4. 测试后端 prefix 搜索

  **What to do**:
  - 创建 `src/server/search.test.ts` 测试文件
  - 测试 prefix 和 fuzzy 两种模式
  - 使用 mock 文件系统避免依赖真实环境

  **Must NOT do**:
  - 不测试整个 API 路由，只测试搜索逻辑函数

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocked By**: Task 3

  **Acceptance Criteria**:
  - [ ] `bun test src/server/search.test.ts` → 通过

  **QA Scenarios**:
  ```
  Scenario: 后端搜索单元测试
    Tool: Bash
    Steps:
      1. bun test src/server/search.test.ts --run
    Expected Result: 所有测试通过
    Evidence: .sisyphus/evidence/task-4-backend-tests.log
  ```

  **Commit**: YES (可与 Task 3 合并)
  - Message: `test: add backend search tests`
  - Files: `src/server/search.test.ts`

---

### Wave 3: 前端集成

- [ ] 5. 更新 AddDirDialog 集成意图解析

  **What to do**:
  - 修改 `src/client/components/AddDirDialog.tsx`
  - 引入 `parseSearchIntent` from `src/lib/searchIntent.ts`
  - 在搜索时调用 `parseSearchIntent(query)`
  - 根据返回的 `mode` 和 `root` 调用 API
  - 发送 `mode` 参数到后端

  **Must NOT do**:
  - 只修改 `HighlightedPath` 组件的高亮逻辑
  - 不修改 `PathInput` 的其他搜索调用逻辑
  - 不修改 UI 样式

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocked By**: Task 3
  - **Blocks**: Task 6

  **References**:
  - `src/client/components/AddDirDialog.tsx` - 搜索输入处理逻辑

  **Acceptance Criteria**:
  - [ ] 输入 `~/do` 调用 `/dirs/search?root=~&q=do&mode=prefix`
  - [ ] 输入 `projects` 调用 `/dirs/search?q=projects&mode=fuzzy`

  **QA Scenarios**:
  ```
  Scenario: AddDirDialog 发送正确的模式参数
    Tool: chrome-devtools
    Preconditions: 前端运行在 localhost:5787
    Steps:
      1. 打开添加项目对话框
      2. 输入 "~/do"
      3. 查看 Network 面板，验证请求包含 mode=prefix
      4. 输入 "projects"
      5. 查看 Network 面板，验证请求包含 mode=fuzzy 或不包含 mode
    Expected Result: 正确发送 mode 参数
    Evidence: .sisyphus/evidence/task-5-dialog-api.png
  ```

  **Commit**: YES
  - Message: `feat: integrate search intent in AddDirDialog`
  - Files: `src/client/components/AddDirDialog.tsx`

---

- [ ] 6. 修复 HighlightedPath prefix 匹配高亮

  **What to do**:
  - 修改 `src/client/components/HighlightedPath.tsx`
  - 支持 `indexes` 为 `null` 或自定义 prefix 匹配范围
  - 当 `mode === 'prefix'` 时手动计算高亮索引

  **Must NOT do**:
  - 不破坏现有的 fuzzysort 高亮

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocked By**: Task 5

  **References**:
  - `src/client/components/PathInput.tsx:19-52` - `HighlightedPath` 组件定义位置
  - 后端返回的 `indexes` 在 prefix 模式下可能为 null

  **Acceptance Criteria**:
  - [ ] prefix 搜索结果正确高亮匹配的前缀部分
  - [ ] fuzzy 搜索结果保持 fuzzysort 高亮

  **QA Scenarios**:
  ```
  Scenario: prefix 搜索结果正确高亮
    Tool: chrome-devtools
    Preconditions: 前端运行在 localhost:5787
    Steps:
      1. 打开添加项目对话框
      2. 输入 "~/do"
      3. 截图检查结果高亮显示
      4. 验证 "Documents" 显示为 "<mark>Do</mark>cuments"
    Expected Result: 匹配前缀被高亮
    Evidence: .sisyphus/evidence/task-6-highlight.png

  Scenario: fuzzy 搜索保持高亮
    Tool: chrome-devtools
    Steps:
      1. 输入 "doc"
      2. 验证 "Documents" 显示为 "<mark>Do</mark>c<mark>u</mark>ments" (fuzzysort 高亮)
    Expected Result: fuzzysort 高亮模式不变
    Evidence: .sisyphus/evidence/task-6-fuzzy-highlight.png
  ```

  **Commit**: YES
  - Message: `fix: highlight prefix matches in search results`
  - Files: `src/client/components/PathInput.tsx` (修改 `HighlightedPath` 组件)

---

### Wave 4: 验证

- [ ] 7. 端到端验证和类型检查

  **What to do**:
  - 运行 `npm run typecheck` 确保无类型错误
  - 使用 Chrome DevTools 测试三种场景：
    1. `~/do` → prefix 匹配 home 下 do 开头的目录
    2. `/et` → prefix 匹配根下 et 开头的目录
    3. `projects` → fuzzy 匹配
  - 验证移动端和桌面端显示正常

  **Must NOT do**:
  - 不添加新功能，只做验证

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocked By**: Task 4, Task 6

  **Acceptance Criteria**:
  - [ ] `npm run typecheck` 无错误
  - [ ] 三种场景测试通过
  - [ ] 移动端和桌面端 UI 正常

  **QA Scenarios**:
  ```
  Scenario: 类型检查通过
    Tool: Bash
    Steps:
      1. npm run typecheck
    Expected Result: 0 errors, 0 warnings
    Evidence: .sisyphus/evidence/task-7-typecheck.log

  Scenario: 场景 1 - 全盘文件名模糊搜索
    Tool: chrome-devtools
    Steps:
      1. 打开添加项目对话框
      2. 输入 "projects"
      3. 验证返回包含 projects 的目录
    Expected Result: 返回所有包含 projects 的目录
    Evidence: .sisyphus/evidence/task-7-scenario1.png

  Scenario: 场景 2 - 用户目录下的模糊缩写
    Tool: chrome-devtools
    Steps:
      1. 输入 "~/do"
      2. 验证返回 Documents, Downloads 等
    Expected Result: 返回 home 目录下 do 开头的目录
    Evidence: .sisyphus/evidence/task-7-scenario2.png

  Scenario: 场景 3 - 系统根目录下的模糊匹配
    Tool: chrome-devtools
    Steps:
      1. 输入 "/et"
      2. 验证返回 etc 目录及其子目录
    Expected Result: 返回根目录下 et 开头的目录
    Evidence: .sisyphus/evidence/task-7-scenario3.png

  Scenario: 移动端测试
    Tool: chrome-devtools (mobile emulation)
    Steps:
      1. 切换到 iPhone 12 Pro 设备模式
      2. 重复上述三种场景
    Expected Result: 移动端 UI 正常，功能正常
    Evidence: .sisyphus/evidence/task-7-mobile.png
  ```

  **Commit**: YES
  - Message: `chore: verify typecheck and end-to-end tests`

---

## Final Verification Wave

> **所有实现任务完成后执行**

- [ ] F1. **计划合规审计** — `oracle`
  验证所有交付物存在且符合规范。
  Output: `Must Have [4/4] | Must NOT Have [4/4] | Tasks [7/7] | VERDICT: APPROVE/REJECT`

- [ ] F2. **代码质量审查** — `unspecified-high`
  运行 `npm run typecheck` 和 `bun test`。
  Output: `TypeCheck [PASS/FAIL] | Tests [N/N pass] | VERDICT`

- [ ] F3. **真实手动 QA** — `unspecified-high` + `chrome-devtools` skill
  执行所有 7 个任务的 QA 场景，保存证据。
  Output: `Scenarios [7/7 pass] | VERDICT`

- [ ] F4. **范围保真检查** — `deep`
  对比计划规范和实际实现，检测范围蔓延。
  Output: `Tasks [7/7 compliant] | VERDICT`

---

## Commit Strategy

```
chore: add vitest test infrastructure
feat: add search intent parser with tests
feat: add prefix matching mode to search endpoint
test: add backend search tests
feat: integrate search intent in AddDirDialog
fix: highlight prefix matches in search results
chore: verify typecheck and end-to-end tests
```

---

## Success Criteria

### Verification Commands
```bash
# 类型检查
npm run typecheck

# 单元测试
bun test --run

# 端到端验证
# 使用 chrome-devtools 测试三种场景
```

### Final Checklist
- [ ] 输入 `~/do` 正确返回 home 目录下 do 开头的目录
- [ ] 输入 `/et` 正确返回根目录下 et 开头的目录
- [ ] 输入 `projects` 保持 fuzzysort 模糊匹配
- [ ] 所有测试结果高亮正确
- [ ] `npm run typecheck` 无错误
- [ ] `bun test` 所有测试通过
