# PathInput 目录搜索模糊匹配优化

## TL;DR

> **Quick Summary**: 改进 SettingsDialog 中添加新工作目录时的 PathInput 搜索体验，将后端 minimatch glob 子串匹配替换为 fuzzysort 模糊匹配算法，支持跨路径段匹配、评分排序和前端高亮显示。
> 
> **Deliverables**:
> - 后端 `/api/files/dirs/search` 改用 fuzzysort 模糊匹配，返回带高亮索引的评分结果
> - 前端 PathInput 渲染匹配高亮，支持跨路径段模糊搜索
> - 搜索深度从 3 层提升到 5 层，结果数从 20 提升到 100
> 
> **Estimated Effort**: Short
> **Parallel Execution**: NO - 后端 → 前端 顺序依赖
> **Critical Path**: Task 1 (后端 fuzzysort) → Task 2 (前端高亮) → Task 3 (验证)

---

## Context

### Original Request
用户反馈"添加目录时的路径搜索功能有点拉跨"，特指 SettingsDialog 中 PathInput 组件的目录搜索体验。

### Interview Summary
**Key Discussions**:
- 当前后端使用 `minimatch` glob `*${term}*` 做简单子串匹配
- 输入 `docapi` 无法匹配 `Documents/api`（跨路径段）
- 最大搜索深度 3 层太浅，最多返回 20 条结果太少
- 前端无匹配高亮显示
- 用户选择"改进模糊搜索体验"方案

**Research Findings**:
- fuzzysort 是前端文件搜索最佳选择（~25K ops/s，5KB）
- Metis 建议 fuzzysort 放在**后端**而非前端，因为前端 fuzzysort 只能重排序 glob 已找到的结果，无法找到 glob 漏掉的结果
- 业界桌面应用多用系统文件选择器，Web 应用因无法调用系统选择器，路径输入+搜索是合理方案

### Metis Review
**Identified Gaps** (addressed):
- **关键架构决策**: fuzzysort 应放在后端而非前端 — 已采纳
- **onChange 行为**: 不应改动 PathInput 的 onChange 行为（每次击键触发）— 保持现状
- **Scope 边界**: 明确不碰 SearchDialog、useSearch、FlexSearch — 已加入 guardrails
- **空搜索行为**: 空输入不触发搜索、不显示下拉 — 已有此行为，保持不变

---

## Work Objectives

### Core Objective
将 PathInput 目录搜索从简单子串匹配升级为 fuzzysort 模糊匹配，支持跨路径段匹配、评分排序和匹配高亮。

### Concrete Deliverables
- `src/server/api.ts` — `/api/files/dirs/search` 端点改用 fuzzysort，返回 `{ path, score, highlights }[]`
- `src/client/components/PathInput.tsx` — 渲染匹配高亮，处理新的响应格式

### Definition of Done
- [ ] `curl "/api/files/dirs/search?q=docapi"` 返回跨路径段匹配结果（如 `Documents/api`）
- [ ] 前端输入搜索词后，下拉结果中匹配字符有高亮样式
- [ ] `npm run typecheck` 通过
- [ ] chrome-devtools 验证移动端和桌面端功能正常

### Must Have
- fuzzysort 模糊匹配替代 minimatch glob
- 匹配字符高亮显示
- 结果按评分排序
- 搜索深度 ≥ 5 层
- 结果数 ≥ 100 条

### Must NOT Have (Guardrails)
- **不碰** SearchDialog、useSearch、FlexSearch 内容搜索
- **不添加**文件搜索结果（仅目录）
- **不改动** PathInput 的 onChange 行为
- **不引入**新 UI 组件模式（保持 Command/cdk 模式）
- **不添加**最近使用目录、历史记录等功能
- **不改动** API 的向后兼容性（可选 query params 可以加，不能删改现有 params）

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: None — 项目未配置测试框架
- **Framework**: none
- **Agent-Executed QA**: 使用 chrome-devtools 进行功能验证 + curl 验证 API

### QA Policy
- **API**: 使用 Bash (curl) 发送请求，断言状态码 + 响应字段
- **Frontend/UI**: 使用 chrome-devtools — 输入搜索词，断言下拉结果和高亮渲染

---

## Execution Strategy

### Sequential Execution Waves

```
Wave 1 (Backend — fuzzysort 集成):
├── Task 1: 安装 fuzzysort + 改造后端搜索 API [deep]
└── Task 2: 前端 PathInput 匹配高亮渲染 [quick]

Wave 2 (Verification):
└── Task 3: typecheck + chrome-devtools 功能验证 [quick]

Critical Path: Task 1 → Task 2 → Task 3
```

### Dependency Matrix

- **1**: - → 2
- **2**: 1 → 3
- **3**: 2 → -

### Agent Dispatch Summary

- **Wave 1**: **2** — T1 → `deep`, T2 → `quick` (T2 depends on T1's response format)
- **Wave 2**: **1** — T3 → `quick`

---

## TODOs

- [x] 1. 后端：安装 fuzzysort 并改造 `/api/files/dirs/search` API

  **What to do**:
  - 安装 fuzzysort: `pnpm add fuzzysort`（或 npm）
  - 修改 `src/server/api.ts` 中的 `/dirs/search` 端点（约第 240-293 行）
  - 替换 minimatch glob `*${term}*` 为 fuzzysort 模糊匹配
  - 将 `maxDepth` 从 3 改为 5，`maxResults` 从 20 改为 100
  - 遍历收集所有候选目录路径（不超过 maxDepth 和 maxResults）
  - 用 fuzzysort 对候选目录进行模糊匹配和评分排序
  - 返回格式改为: `{ matches: [{ path: string, score: number, indexes: number[] }] }`
    - `path`: 完整目录路径
    - `score`: fuzzysort 评分（越高越匹配）
    - `indexes`: 匹配字符在 path 中的索引数组（用于前端高亮）
  - 保持 `checkSensitivePath` 安全检查
  - 保持跳过隐藏目录（`.` 开头）

  **Must NOT do**:
  - 不改动 API 路由路径或 HTTP 方法
  - 不添加文件搜索结果（仅目录）
  - 不改动其他 API 端点
  - 不引入 IgnoreMatcher（不在本次范围）

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 需要理解后端 API 结构、fuzzysort API、文件系统遍历逻辑
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 1, Task 1)
  - **Blocks**: Task 2（前端依赖新的响应格式）
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/server/api.ts:240-293` — 当前 `/dirs/search` 端点实现，需要替换 minimatch 为 fuzzysort
  - `src/server/api.ts:1-30` — 后端 import 区域，添加 fuzzysort import

  **External References**:
  - fuzzysort npm: `https://www.npmjs.com/package/fuzzysort` — API: `fuzzysort.go(target, targetsArray, options)` 返回 `{ score, indexes }`
  - fuzzysort highlight: `fuzzysort.highlight(result, '<mark>', '</mark>')` — 用 HTML 标签包装匹配字符

  **WHY Each Reference Matters**:
  - `api.ts:240-293` — 这是需要修改的核心代码，包含当前的 traverse 函数和 minimatch 匹配逻辑
  - fuzzysort docs — 了解 `fuzzysort.go()` 的 API 签名和返回格式

  **Acceptance Criteria**:
  - [ ] `pnpm add fuzzysort` 成功安装
  - [ ] `curl "/api/files/dirs/search?q=docapi"` 返回包含跨路径段匹配的结果（如路径中 `Documents` 和 `api` 分别匹配 `doc` 和 `api`）
  - [ ] `curl "/api/files/dirs/search?q="` 返回空数组（空查询不触发搜索）
  - [ ] 返回结果按 score 降序排列
  - [ ] 每个结果包含 `path`、`score`、`indexes` 字段
  - [ ] `npm run typecheck` 通过

  **QA Scenarios**:

  ```
  Scenario: 跨路径段模糊匹配
    Tool: Bash (curl)
    Preconditions: 后端服务器运行中，存在类似 /home/user/Documents/api 的目录
    Steps:
      1. curl -s "/api/files/dirs/search?q=docapi" | jq '.matches[0]'
      2. 验证返回结果中存在 path 字段，且该路径的 "doc" 字符匹配一个路径段，"api" 匹配另一个路径段
    Expected Result: 返回结果包含跨段匹配的路径，score > 0
    Failure Indicators: 返回空数组，或只返回单段匹配结果
    Evidence: .sisyphus/evidence/task-1-cross-segment-match.json

  Scenario: 评分排序
    Tool: Bash (curl)
    Preconditions: 后端运行中，存在多个包含 "docs" 的目录
    Steps:
      1. curl -s "/api/files/dirs/search?q=docs" | jq '[.matches[].score]'
      2. 验证分数数组是降序排列
    Expected Result: 分数数组严格降序或相等
    Evidence: .sisyphus/evidence/task-1-score-order.json

  Scenario: 空查询
    Tool: Bash (curl)
    Preconditions: 后端运行中
    Steps:
      1. curl -s "/api/files/dirs/search?q="
    Expected Result: 返回 { "matches": [] }
    Evidence: .sisyphus/evidence/task-1-empty-query.json

  Scenario: 搜索深度和结果数
    Tool: Bash (curl)
    Preconditions: 后端运行中，存在深层目录结构
    Steps:
      1. curl -s "/api/files/dirs/search?q=" | jq '.matches | length'
      2. 验证最多返回 100 条结果
    Expected Result: 返回结果数 ≤ 100
    Evidence: .sisyphus/evidence/task-1-max-results.json
  ```

  **Evidence to Capture**:
  - [ ] 每个 QA 场景的 curl 输出保存为 JSON 文件

  **Commit**: YES
  - Message: `feat(server): replace minimatch with fuzzysort for directory search`
  - Files: `src/server/api.ts`, `package.json`, `pnpm-lock.yaml`
  - Pre-commit: `npm run typecheck`

- [x] 2. 前端：PathInput 匹配高亮渲染

  **What to do**:
  - 修改 `src/client/components/PathInput.tsx`
  - 适配新的后端响应格式：`{ matches: [{ path, score, indexes }] }`
  - 使用 fuzzysort.highlight 或自定义高亮组件渲染匹配字符
  - 高亮样式：使用 `<mark>` 标签或条件样式（`text-foreground font-semibold`）
  - 保持现有键盘导航（↑↓ Enter Esc）不变
  - 保持现有防抖（150ms）不变
  - 保持现有移动端适配（`isMobile` 判断）不变
  - 搜索结果列表项显示：高亮匹配字符 + 完整路径（截断）

  **Must NOT do**:
  - 不改动 onChange 行为（每次击键触发）
  - 不引入新 UI 组件（保持 Command/cdk 模式）
  - 不添加最近使用目录功能
  - 不改动 SearchDialog 或 useSearch

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 单文件修改，主要是响应格式适配和高亮渲染
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 1, Task 2)
  - **Blocks**: Task 3
  - **Blocked By**: Task 1（依赖后端新的响应格式）

  **References**:

  **Pattern References**:
  - `src/client/components/PathInput.tsx` — 当前完整实现，需要修改 results 处理和渲染逻辑
  - `src/client/components/ui/command.tsx` — Command 组件实现，确认 CommandItem 的渲染方式

  **External References**:
  - fuzzysort highlight: `fuzzysort.highlight(result, '<mark>', '</mark>')` — 生成带高亮标签的 HTML 字符串

  **WHY Each Reference Matters**:
  - `PathInput.tsx:177-194` — 当前结果渲染逻辑，需要将纯文本路径改为带高亮的渲染
  - `command.tsx` — 确认 CommandItem 是否支持 HTML 内容（可能需要用 `dangerouslySetInnerHTML`）

  **Acceptance Criteria**:
  - [ ] 输入搜索词后，下拉结果中匹配字符有高亮样式
  - [ ] 高亮样式在移动端（375px 宽度）正常显示，不溢出
  - [ ] 键盘导航（↑↓ Enter）正常工作
  - [ ] 空查询时不显示下拉
  - [ ] `npm run typecheck` 通过

  **QA Scenarios**:

  ```
  Scenario: 匹配高亮渲染
    Tool: chrome-devtools
    Preconditions: 后端运行中，打开 SettingsDialog，定位到 PathInput
    Steps:
      1. 在 PathInput 中输入 "docs"
      2. 等待下拉结果出现
      3. 检查下拉结果中是否包含高亮元素（<mark> 或带高亮样式的 <span>）
      4. 截图保存
    Expected Result: 下拉结果中匹配 "docs" 的字符有高亮样式
    Evidence: .sisyphus/evidence/task-2-highlight-render.png

  Scenario: 键盘导航
    Tool: chrome-devtools
    Preconditions: PathInput 已输入搜索词，下拉结果可见
    Steps:
      1. 按 ArrowDown 2 次
      2. 验证第 3 个结果被选中（bg-accent 样式）
      3. 按 Enter
      4. 验证输入框值等于选中结果的路径
    Expected Result: 键盘导航正常，Enter 后选择对应路径
    Evidence: .sisyphus/evidence/task-2-keyboard-nav.png

  Scenario: 移动端渲染
    Tool: chrome-devtools (emulate)
    Preconditions: 模拟 375x812 移动设备
    Steps:
      1. 在 PathInput 中输入 "docs"
      2. 验证下拉结果在视口内显示
      3. 验证高亮文本不溢出容器
      4. 截图保存
    Expected Result: 下拉结果正常显示，高亮文本截断正确
    Evidence: .sisyphus/evidence/task-2-mobile-render.png

  Scenario: 空查询不显示下拉
    Tool: chrome-devtools
    Preconditions: PathInput 有搜索词，下拉结果可见
    Steps:
      1. 清空输入框
      2. 等待 200ms
      3. 验证下拉结果已隐藏
    Expected Result: 下拉结果隐藏
    Evidence: .sisyphus/evidence/task-2-empty-query.png
  ```

  **Evidence to Capture**:
  - [ ] 每个 QA 场景的截图保存为 PNG 文件

  **Commit**: YES
  - Message: `feat(client): add match highlighting to PathInput search results`
  - Files: `src/client/components/PathInput.tsx`
  - Pre-commit: `npm run typecheck`

- [x] 3. 验证：typecheck + chrome-devtools 端到端功能测试

  **What to do**:
  - 运行 `npm run typecheck` 确保无类型错误
  - 使用 chrome-devtools 进行端到端功能测试
  - 测试场景：
    1. 打开 SettingsDialog
    2. 在 PathInput 中输入搜索词
    3. 验证下拉结果出现且包含高亮
    4. 使用键盘导航选择结果
    5. 验证选择后输入框值更新
  - 移动端测试：模拟 375x812 设备，重复上述步骤

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 验证任务，运行命令 + 浏览器操作
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 2)
  - **Blocks**: None (final verification)
  - **Blocked By**: Task 1, Task 2

  **References**:
  - `npm run typecheck` — TypeScript 类型检查命令
  - `npm run dev` — 启动开发服务器

  **Acceptance Criteria**:
  - [ ] `npm run typecheck` 通过（0 errors）
  - [ ] chrome-devtools 端到端测试通过

  **QA Scenarios**:

  ```
  Scenario: 端到端目录搜索和选择
    Tool: chrome-devtools
    Preconditions: 开发服务器运行中（npm run dev）
    Steps:
      1. 导航到应用页面
      2. 打开 SettingsDialog（点击设置按钮）
      3. 找到 PathInput 输入框
      4. 输入一个存在的目录名片段（如 "doc"）
      5. 等待下拉结果出现
      6. 验证结果中包含高亮匹配的字符
      7. 按 ArrowDown 选择第一个结果
      8. 按 Enter 确认选择
      9. 验证输入框值等于选中路径
    Expected Result: 完整流程正常，路径选择成功
    Evidence: .sisyphus/evidence/task-3-e2e-flow.png
  ```

  **Evidence to Capture**:
  - [ ] typecheck 输出
  - [ ] 端到端测试截图

  **Commit**: NO（验证任务，无代码变更）

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Verify: fuzzysort replaces minimatch in backend, PathInput renders highlights, maxDepth=5, maxResults=100, no SearchDialog/useSearch changes, no file results added. Check evidence files exist.
  Output: `Must Have [5/5] | Must NOT Have [2/2] | Tasks [3/3] | Evidence [5/5] | VERDICT: APPROVE`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `npm run typecheck`. Review changed files for: `as any`, `@ts-ignore`, unused imports, console.log in prod. Check AI slop patterns.
  Output: `Build [PASS] | Typecheck [PASS] | Files [2 clean/0 issues] | VERDICT: APPROVE`

- [x] F3. **Real Manual QA** — `unspecified-high` (+ `chrome-devtools` skill)
  Execute ALL QA scenarios from ALL tasks. Test cross-task integration (backend fuzzy match + frontend highlight). Test edge cases: empty input, special chars, unicode paths.
  Output: `Scenarios [11/11 pass] | Integration [1/1] | Edge Cases [3/3] | VERDICT: APPROVE`

- [x] F4. **Scope Fidelity Check** — `deep`
  Verify: only `api.ts` and `PathInput.tsx` modified, no SearchDialog/useSearch changes, no new features added beyond spec.
  Output: `Tasks [3/3 compliant] | Contamination [CLEAN] | Unaccounted [CLEAN] | VERDICT: APPROVE`

---

## Commit Strategy

- **1**: `feat(server): replace minimatch with fuzzysort for directory search` — api.ts, package.json
- **2**: `feat(client): add match highlighting to PathInput search results` — PathInput.tsx

---

## Success Criteria

### Verification Commands
```bash
npm run typecheck  # Expected: 0 errors
curl "/api/files/dirs/search?q=docapi"  # Expected: returns cross-segment matches with scores
```

### Final Checklist
- [ ] fuzzysort 模糊匹配替代 minimatch
- [ ] 匹配字符高亮显示
- [ ] 结果按评分排序
- [ ] 搜索深度 ≥ 5 层
- [ ] 结果数 ≥ 100 条
- [ ] 未改动 SearchDialog/useSearch
- [ ] 未添加文件搜索结果
- [ ] typecheck 通过
