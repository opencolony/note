# 目录管理 UX 改进

## TL;DR

> **Quick Summary**: 改善 ColonyNote 侧边栏的目录管理体验 — 在目录切换区域添加"添加目录"按钮和搜索选择弹窗，在文件操作按钮旁添加"编辑目录"按钮和编辑弹窗（显示名别名修改+删除），始终显示目录切换区域。
>
> **Deliverables**:
> - 后端 PATCH API 支持目录 name 字段（显示别名）
> - 始终显示目录切换区域（移除 groups.length > 1 条件）
> - 添加目录按钮 + AddDirDialog 弹窗（搜索选择）
> - 编辑目录按钮 + EditDirDialog 弹窗（显示名修改 + 删除）
> - 空目录状态 UI（引导添加）
> - 删除确认 AlertDialog
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: T1(后端) → T2(目录区始终显示+添加按钮) → T4(AddDirDialog) → T5(编辑按钮) → T6(EditDirDialog) → T7(边界情况) → F1-F4

---

## Context

### Original Request
用户希望改善侧边栏目录管理的用户体验：
1. 在侧边栏上方目录切换位置增加添加按钮，点击后弹出添加目录的弹窗
2. 在侧边栏创建文件、创建文件夹按钮后面增加编辑按钮，点击后可以对当前目录进行设置（名称、删除）

### Interview Summary
**Key Discussions**:
- 添加目录方式：搜索选择（复用 PathInput 组件）
- 编辑目录功能：显示名别名修改（持久化到配置） + 删除（AlertDialog确认）
- 排除规则(exclude)：跳过，不包含在编辑弹窗中（死功能）
- 重命名策略：修改显示名别名，不是修改实际文件夹路径
- 单目录场景：始终显示目录切换区域
- 删除后切换：自动切换到第一个剩余目录；全删→空状态引导
- 测试策略：不设置单元测试，Agent QA 场景验证

**Research Findings**:
- PathInput.tsx 已存在，实现了服务器端模糊搜索（Command/CommandInput 模式）
- 目录切换器仅 groups.length > 1 时显示（需移除条件）
- CreateFileModal 存在但未使用（不涉及本次改动）
- DirConfig 重复定义于 config.ts 和 SettingsDialog.tsx（需统一导入）
- PATCH API 只支持 exclude，不支持 name（需新增后端支持）
- SettingsDialog 已有目录管理功能（保持不变）

### Metis Review
**Identified Gaps** (addressed):
- exclude 是死功能 → 决定跳过 exclude 编辑
- PATCH 不支持 name → 新增后端支持
- 目录名碰撞 → EditDirDialog 显示完整路径
- PathInput 已存在 → 复用而非新建
- isCli 目录 → 允许编辑和删除
- 删除最后一个目录 → 空状态引导添加
- DirConfig 重复 → 统一导入位置

---

## Work Objectives

### Core Objective
改善 ColonyNote 侧边栏目录管理体验，让用户无需进入 SettingsDialog 即可在侧边栏快速添加、编辑（显示名）、删除目录。

### Concrete Deliverables
- `src/server/api.ts`: PATCH /api/files/dirs 支持 name 字段
- `src/config.ts`: DirConfig 新增 name? 字段
- `src/client/App.tsx`: 移除 groups.length > 1 条件，添加按钮，编辑按钮，状态管理
- `src/client/components/AddDirDialog.tsx`: 新弹窗组件
- `src/client/components/EditDirDialog.tsx`: 新弹窗组件
- `src/client/components/FileTree.tsx`: 增加编辑按钮

### Definition of Done
- [ ] 单目录场景下目录切换区域可见且包含添加按钮
- [ ] 点击添加按钮可打开搜索弹窗，搜索并选择目录
- [ ] 点击编辑按钮可打开编辑弹窗，修改显示名或删除目录
- [ ] 删除目录有二次确认，删除当前目录后自动切换
- [ ] 删除所有目录后显示空状态引导
- [ ] npm run typecheck → 0 errors

### Must Have
- 始终显示目录切换区域
- 搜索选择添加目录（复用 PathInput）
- 显示名别名修改（持久化）
- 删除确认（AlertDialog）
- 空目录状态引导
- 移动端 Sheet + 桌面端 Dialog 双模式

### Must NOT Have (Guardrails)
- ❌ 不让 exclude 字段在文件遍历器中生效（死功能，不扩展）
- ❌ 不修改 SettingsDialog 的目录管理功能
- ❌ 不删除 CreateFileModal 死代码
- ❌ 不添加 WebSocket 广播配置变更
- ❌ 不构建自定义搜索组件（必须复用 PathInput）
- ❌ 不修改后端现有 API 接口的行为（仅新增 name 支持）
- ❌ 不改变文件创建按钮的行为和布局（仅追加编辑按钮）
- ❌ 不修改实际文件夹路径/名称（只修改显示别名）
- ❌ AI slop: 过度注释、过度抽象、通用命名（data/result/item）

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: None (不设置单元测试)
- **Framework**: none
- **Agent-Executed QA**: YES — Playwright + chrome-devtools MCP

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use chrome-devtools MCP — Navigate, interact, assert DOM, screenshot
- **API/Backend**: Use Bash (curl) — Send requests, assert status + response fields

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - 后端+基础UI):
├── Task 1: 后端 PATCH 支持 name 字段 [quick]
├── Task 2: 目录切换区域始终显示 + 添加按钮骨架 [quick]
└── Task 3: DirConfig 统一导入 [quick]

Wave 2 (After Wave 1 - 弹窗组件):
├── Task 4: AddDirDialog 组件 (depends: 1, 2, 3) [unspecified-high]
├── Task 5: FileTree 编辑按钮 + 状态传递 (depends: 3) [quick]
└── Task 6: EditDirDialog 组件 (depends: 1, 3, 5) [unspecified-high]

Wave 3 (After Wave 2 - 边界情况+整合):
├── Task 7: 空目录状态 + 删除切换 + 错误处理 (depends: 4, 6) [unspecified-high]
└── Task 8: 整合验证 + typecheck (depends: 7) [quick]

Wave FINAL (After ALL tasks — 4 parallel reviews):
├── F1: Plan compliance audit (oracle)
├── F2: Code quality review (unspecified-high)
├── F3: Real manual QA (unspecified-high + playwright)
├── F4: Scope fidelity check (deep)
→ Present results → Get explicit user okay

Critical Path: T1 → T2/T3 → T4 → T6 → T7 → T8 → F1-F4
Parallel Speedup: ~40% faster than sequential
Max Concurrent: 3 (Wave 1)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | - | 4, 6 | 1 |
| 2 | - | 4 | 1 |
| 3 | - | 4, 5, 6 | 1 |
| 4 | 1, 2, 3 | 7 | 2 |
| 5 | 3 | 6 | 2 |
| 6 | 1, 3, 5 | 7 | 2 |
| 7 | 4, 6 | 8 | 3 |
| 8 | 7 | F1-F4 | 3 |

### Agent Dispatch Summary

| Wave | Count | Tasks → Category |
|------|-------|-------------------|
| 1 | 3 | T1 → quick, T2 → quick, T3 → quick |
| 2 | 3 | T4 → unspecified-high, T5 → quick, T6 → unspecified-high |
| 3 | 2 | T7 → unspecified-high, T8 → quick |
| FINAL | 4 | F1 → oracle, F2 → unspecified-high, F3 → unspecified-high, F4 → deep |

---

## TODOs

- [x] 1. 后端 PATCH API 支持 name 字段

  **What to do**:
  - 在 `src/config.ts` 的 `DirConfig` interface 中新增 `name?: string` 字段（显示别名）
  - 修改 `src/server/api.ts` 的 `PATCH /api/files/dirs` 路由，支持接收和更新 `name` 字段
  - 确保读取目录列表时返回 `name` 字段
  - 确保配置文件保存时包含 `name` 字段
  - 测试 curl 请求验证功能

  **Must NOT do**:
  - ❌ 不修改其他 API 接口的行为
  - ❌ 不让 name 字段影响文件系统路径
  - ❌ 不添加 exclude 功能逻辑

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 简单的后端字段添加，改动量小
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `shadcn-ui`: 后端代码，不需要 UI 技能

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Tasks 4, 6
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `src/server/api.ts` — 找到 PATCH /api/files/dirs 路由的实现，了解现有的 exclude 更新逻辑，仿照添加 name 支持
  - `src/server/api.ts:GET /api/files/dirs` — 了解目录列表返回的数据格式，确保 name 字段被返回

  **API/Type References**:
  - `src/config.ts:DirConfig interface` — 当前接口定义 `{ path, exclude?, isCli? }`，需要新增 `name?` 字段
  - `src/config.ts:loadConfig/saveConfig` — 了解配置的读写机制，确保 name 能正确保存和加载

  **Test References**:
  - 无（项目无测试框架）

  **External References**:
  - 无需外部参考

  **WHY Each Reference Matters**:
  - `api.ts PATCH route`: 仿照现有 exclude 更新逻辑来添加 name 更新，保持代码风格一致
  - `DirConfig`: 这是数据模型的基础，name 字段必须在此定义才能被类型系统覆盖
  - `loadConfig/saveConfig`: 确保 name 字段在配置读写链路中正确传递

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: PATCH 添加 name 字段成功
    Tool: Bash (curl)
    Preconditions: 开发服务器运行 (npm run dev)
    Steps:
      1. curl -X PATCH http://localhost:5788/api/files/dirs -H 'Content-Type: application/json' -d '{"path":"<当前某个目录路径>","name":"MyCustomName"}'
      2. 检查响应 JSON 包含 name 字段且值为 "MyCustomName"
    Expected Result: 响应成功，name 字段已更新
    Failure Indicators: 响应返回 400 或不含 name 字段
    Evidence: .sisyphus/evidence/task-1-patch-name-success.txt

  Scenario: GET 目录列表包含 name 字段
    Tool: Bash (curl)
    Preconditions: 开发服务器运行，已 PATCH 设置过 name
    Steps:
      1. curl http://localhost:5788/api/files/dirs
      2. 检查响应数组中对应目录包含 name 字段
    Expected Result: name 字段在 GET 响应中出现
    Failure Indicators: name 字段缺失或为 null（未设置时应为 undefined/不存在）
    Evidence: .sisyphus/evidence/task-1-get-dirs-name.txt
  ```

  **Commit**: YES
  - Message: `feat(server): support name field in PATCH /api/files/dirs`
  - Files: `src/server/api.ts, src/config.ts`
  - Pre-commit: `npm run typecheck`

- [x] 2. 目录切换区域始终显示 + 添加按钮骨架

  **What to do**:
  - 在 `src/client/App.tsx` 的 SidebarContent 中移除 `groups.length > 1` 条件，使目录切换区域始终可见
  - 在目录切换区域末尾增加一个"添加"按钮（Plus icon，size="icon" className="size-6"）
  - 添加 `addDirDialogOpen` state（boolean），点击添加按钮时设置为 true
  - 单目录场景下，目录切换区域显示当前目录标签 + 添加按钮
  - 确保目录名称显示逻辑考虑 `name` 字段：优先显示 `group.root.name`，fallback 到 `path.split('/').pop()`

  **Must NOT do**:
  - ❌ 不修改 SettingsDialog 的目录管理功能
  - ❌ 不构建 AddDirDialog 弹窗内容（仅添加按钮和 state）
  - ❌ 不修改文件创建按钮区域
  - ❌ 不改变目录切换按钮的样式风格（保持现有 Button variant 模式）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 修改条件 + 添加按钮，改动量小且明确
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `shadcn-ui`: 仅添加一个 Button，不需要详细 shadcn 指导

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Task 4 (AddDirDialog 需要此按钮作为触发入口)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `src/client/App.tsx:108-135` — 当前目录切换器的实现（groups.length > 1 条件、Button variant 切换、truncate 样式），移除条件并添加按钮
  - `src/client/App.tsx:321-340` (FileTree.tsx) — 新建文件/文件夹按钮的 icon+size 样式（`size="icon" className="size-6"`），添加按钮应保持一致

  **API/Type References**:
  - `src/client/App.tsx:28-34` (FileGroup interface) — `root: { path, exclude? }`，需了解是否已包含 name 字段（Task 1 添加后应包含）

  **WHY Each Reference Matters**:
  - `目录切换器实现`: 这是改动的主要位置，需理解完整的 JSX 结构和条件逻辑才能安全移除
  - `新建按钮样式`: 添加按钮的视觉风格应与现有按钮一致，保持 UI 统一性
  - `FileGroup interface`: 确保类型定义包含 name 字段，目录名显示逻辑才能使用它

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 单目录场景显示目录切换区域
    Tool: chrome-devtools MCP
    Preconditions: 开发服务器运行，只有一个目录配置
    Steps:
      1. navigate_page → http://localhost:5787
      2. take_snapshot → 检查侧边栏顶部
      3. 验证目录切换区域可见（包含1个目录标签 + 1个添加按钮）
    Expected Result: 目录行可见，包含当前目录名标签和 Plus icon 按钮
    Failure Indicators: 目录行不显示，或缺少添加按钮
    Evidence: .sisyphus/evidence/task-2-single-dir-switcher.png

  Scenario: 多目录场景目录切换区域正常
    Tool: chrome-devtools MCP
    Preconditions: 开发服务器运行，有2+个目录配置
    Steps:
      1. navigate_page → http://localhost:5787
      2. take_snapshot → 检查侧边栏顶部
      3. 验证目录切换区域显示所有目录标签 + 添加按钮
    Expected Result: 所有目录标签可见 + Plus icon 添加按钮在末尾
    Failure Indicators: 目录切换区域缺少添加按钮
    Evidence: .sisyphus/evidence/task-2-multi-dir-switcher.png
  ```

  **Commit**: YES
  - Message: `feat(client): always show directory switcher with add button`
  - Files: `src/client/App.tsx`
  - Pre-commit: `npm run typecheck`

- [x] 3. DirConfig 统一导入

  **What to do**:
  - 在 `src/client/lib/types.ts`（新建或已有）中定义客户端用的 `DirConfig` interface，包含 `path`, `exclude?`, `name?`, `isCli?` 字段
  - 或者直接从 `src/config.ts` 通过 `@/config` 路径别名导入 DirConfig（如果类型兼容）
  - 修改 `SettingsDialog.tsx` 中重复定义的 DirConfig interface，改为从统一位置导入
  - 修改 App.tsx 中 FileGroup interface 的 root 类型，使用统一的 DirConfig

  **Must NOT do**:
  - ❌ 不修改 SettingsDialog 的功能逻辑（仅修改导入方式）
  - ❌ 不删除 SettingsDialog 中的目录管理功能
  - ❌ 不添加新类型以外的字段

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 类型定义统一，改动简单
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Tasks 4, 5, 6 (后续组件需要统一类型)
  - **Blocked By**: Task 1 (DirConfig 需包含 name 字段)

  **References**:

  **Pattern References**:
  - `src/client/components/SettingsDialog.tsx:24-28` — 当前客户端重复定义的 DirConfig interface，需替换为导入
  - `src/config.ts:DirConfig` — 服务器端正式定义，包含 name 字段后可作为统一来源

  **API/Type References**:
  - `src/client/App.tsx:28-34` (FileGroup interface) — root 类型需要使用统一 DirConfig

  **WHY Each Reference Matters**:
  - `SettingsDialog DirConfig`: 这是当前重复定义的位置，必须从这里移除并改为导入
  - `config.ts DirConfig`: 这是权威定义，统一后所有组件从此导入
  - `FileGroup.root`: 需确保 root 属性类型使用统一 DirConfig

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: DirConfig 导入统一
    Tool: Bash
    Preconditions: 代码修改完成
    Steps:
      1. grep -r "interface DirConfig" src/client/ → 确认客户端无重复定义
      2. npm run typecheck → 0 errors
    Expected Result: 客户端仅一处 DirConfig 定义（或从 config.ts 导入），typecheck 通过
    Failure Indicators: 仍有重复定义或 typecheck 报错
    Evidence: .sisyphus/evidence/task-3-dirconfig-unified.txt
  ```

  **Commit**: YES
  - Message: `refactor(client): unify DirConfig import from shared location`
  - Files: `src/client/components/SettingsDialog.tsx, src/client/App.tsx, (可能)src/client/lib/types.ts`
  - Pre-commit: `npm run typecheck`

- [x] 4. AddDirDialog 组件（搜索选择添加目录）

  **What to do**:
  - 新建 `src/client/components/AddDirDialog.tsx` 组件
  - 遵循 SettingsDialog 的 Sheet（移动端 bottom）+ Dialog（桌面端 centered）双模式
  - 弹窗内容：
    - 标题："添加目录"
    - 复用 PathInput 组件进行搜索（调用 /api/files/dirs/search?q=...）
    - 选中结果后调用 POST /api/files/dirs 添加目录
    - 添加成功后：关闭弹窗、dispatch `config-changed` DOM 事件、刷新文件树
    - 错误处理：内联显示 API 错误（如路径冲突 conflictWith、敏感路径）
  - 在 App.tsx 中将添加按钮连接到 AddDirDialog（addDirDialogOpen state）
  - isMobile 检测逻辑：使用 window.innerWidth < 768

  **Must NOT do**:
  - ❌ 不构建自定义搜索组件（必须复用 PathInput）
  - ❌ 不修改 PathInput 组件本身
  - ❌ 不添加 WebSocket 广播
  - ❌ 不修改 SettingsDialog 的目录添加逻辑

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 新组件创建，涉及弹窗模式、搜索集成、API 调用、状态管理
  - **Skills**: [`shadcn-ui`]
    - `shadcn-ui`: 需要正确使用 Sheet、Dialog、Button 等组件的 API

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 5)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 7
  - **Blocked By**: Tasks 1, 2, 3

  **References**:

  **Pattern References**:
  - `src/client/components/SettingsDialog.tsx:612-648` — Sheet+Dialog 条件渲染模式（isMobile 判断：Sheet side="bottom" h-[85vh] vs Dialog sm:max-w-[425px]），必须完全仿照此模式
  - `src/client/components/SettingsDialog.tsx:78-81,116-120` — isMobile 状态检测逻辑（useState + useEffect resize listener）
  - `src/client/components/PathInput.tsx` — 已有的目录搜索组件（Command/CommandInput、debounce、高亮匹配），在 AddDirDialog 中直接复用
  - `src/client/App.tsx:316-340` — config-changed 事件监听和 fetchFiles 调用模式

  **API/Type References**:
  - `POST /api/files/dirs` — 请求 body: `{ path: string, exclude?: string[] }`，响应中包含添加后的目录信息
  - `GET /api/files/dirs/search?q=...` — PathInput 已调用此接口，无需额外处理
  - `src/config.ts:DirConfig` — 统一导入的类型定义

  **WHY Each Reference Matters**:
  - `SettingsDialog Sheet+Dialog`: 这是项目标准的弹窗双模式实现，必须遵循以确保移动端和桌面端体验一致
  - `SettingsDialog isMobile`: 移动端检测的标准模式，需要复制到新弹窗中
  - `PathInput`: 搜索功能的核心，避免重复开发
  - `config-changed + fetchFiles`: 添加目录后必须触发配置刷新，这是项目已有的刷新机制

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 添加目录弹窗 - 搜索选择成功
    Tool: chrome-devtools MCP
    Preconditions: 开发服务器运行，至少一个目录已配置
    Steps:
      1. navigate_page → http://localhost:5787
      2. take_snapshot → 找到添加按钮 (Plus icon)
      3. click → 添加按钮 uid
      4. wait_for → ["添加目录"]
      5. take_snapshot → 确认弹窗打开，包含搜索输入
      6. type_text → 在搜索输入中输入 "docs" 或其他存在的路径关键词
      7. wait_for → timeout: 3s (搜索结果加载)
      8. take_snapshot → 确认搜索结果出现
      9. click → 选择一个搜索结果
      10. wait_for → ["添加目录"] 消失 (弹窗关闭)
      11. take_snapshot → 确认新目录标签出现在目录切换区域
    Expected Result: 弹窗打开→搜索→选择→关闭→新目录标签出现
    Failure Indicators: 弹窗未打开、搜索无结果、选择后弹窗不关闭、新目录未出现
    Evidence: .sisyphus/evidence/task-4-add-dir-success.png

  Scenario: 添加目录弹窗 - 搜索无结果
    Tool: chrome-devtools MCP
    Preconditions: 开发服务器运行
    Steps:
      1. navigate_page → http://localhost:5787
      2. click → 添加按钮
      3. wait_for → ["添加目录"]
      4. type_text → 输入不存在的路径如 "zzznonexistent"
      5. wait_for → timeout: 3s
      6. take_snapshot → 确认显示"无结果"或空状态
    Expected Result: 搜索无匹配时显示空状态提示
    Failure Indicators: 无空状态提示或报错
    Evidence: .sisyphus/evidence/task-4-add-dir-no-results.png

  Scenario: 添加目录弹窗 - 路径冲突错误
    Tool: chrome-devtools MCP
    Preconditions: 开发服务器运行，已有目录 /home/user/docs
    Steps:
      1. 尝试添加一个与已有目录有父子关系的路径
      2. 验证内联错误消息出现（包含冲突信息）
    Expected Result: 错误消息内联显示在弹窗中
    Failure Indicators: 无错误显示或弹窗直接崩溃
    Evidence: .sisyphus/evidence/task-4-add-dir-conflict-error.png

  Scenario: 添加目录弹窗 - 移动端 Sheet 模式
    Tool: chrome-devtools MCP
    Preconditions: 开发服务器运行
    Steps:
      1. emulate → viewport="375x812x2,mobile,touch"
      2. navigate_page → http://localhost:5787
      3. click → 添加按钮
      4. wait_for → ["添加目录"]
      5. take_snapshot → 确认弹窗为 Sheet（底部弹出）
      6. take_screenshot → 保存移动端截图
    Expected Result: 移动端弹窗为底部 Sheet（rounded-t-2xl）
    Failure Indicators: 弹窗为居中 Dialog（非移动端模式）
    Evidence: .sisyphus/evidence/task-4-add-dir-mobile-sheet.png

  Scenario: 添加目录弹窗 - 桌面端 Dialog 模式
    Tool: chrome-devtools MCP
    Preconditions: 开发服务器运行
    Steps:
      1. emulate → viewport="1280x800x1" (或重置为默认)
      2. navigate_page → http://localhost:5787
      3. click → 添加按钮
      4. wait_for → ["添加目录"]
      5. take_snapshot → 确认弹窗为 Dialog（居中弹出）
      6. take_screenshot → 保存桌面端截图
    Expected Result: 桌面端弹窗为居中 Dialog (sm:max-w-[425px])
    Failure Indicators: 弹窗为底部 Sheet（非桌面端模式）
    Evidence: .sisyphus/evidence/task-4-add-dir-desktop-dialog.png
  ```

  **Commit**: YES
  - Message: `feat(client): add AddDirDialog component with PathInput search`
  - Files: `src/client/components/AddDirDialog.tsx, src/client/App.tsx`
  - Pre-commit: `npm run typecheck`

- [x] 5. FileTree 编辑按钮 + 状态传递

  **What to do**:
  - 在 `src/client/components/FileTree.tsx` 的 header 区域（"Files" 标签旁）新建文件/文件夹按钮后面增加一个"编辑"按钮
  - 使用 Pencil (或 Settings) icon from lucide-react，size="icon" className="size-6"
  - 新增 `onEditDir` prop（回调函数，参数为当前活跃目录的 rootPath）
  - 在 App.tsx 中将编辑按钮连接到 `editDirDialogOpen` state + `editDirPath` state（记录当前编辑的目录路径）
  - 点击编辑按钮 → 设置 editDirPath = activeRoot，设置 editDirDialogOpen = true

  **Must NOT do**:
  - ❌ 不修改新建文件/文件夹按钮的行为
  - ❌ 不构建 EditDirDialog 弹窗内容（仅添加按钮和 state）
  - ❌ 不改变 FileTree 其他部分的布局

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 添加一个按钮和一个 prop，改动量小
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 4)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 6
  - **Blocked By**: Task 3 (需要统一 DirConfig 类型)

  **References**:

  **Pattern References**:
  - `src/client/components/FileTree.tsx:321-340` — 当前新建文件/文件夹按钮区域，编辑按钮应追加在此 div.flex.gap-1 中
  - `src/client/components/FileTree.tsx` — FileTreeProps interface，需新增 onEditDir prop

  **API/Type References**:
  - `src/client/App.tsx:activeRoot` — 当前活跃目录路径，编辑按钮需要传递此值

  **WHY Each Reference Matters**:
  - `FileTree 按钮`: 编辑按钮必须在视觉上与现有按钮对齐（相同的 icon size 和 variant）
  - `FileTreeProps`: 需正确扩展 props interface 以传递编辑回调
  - `activeRoot`: 编辑按钮的操作对象是当前选中的目录

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 编辑按钮可见且可点击
    Tool: chrome-devtools MCP
    Preconditions: 开发服务器运行
    Steps:
      1. navigate_page → http://localhost:5787
      2. take_snapshot → 检查 FileTree header 区域
      3. 验证 "Files" 标签旁有3个按钮：新建文件、新建文件夹、编辑(Pencil icon)
      4. click → 编辑按钮 uid
      5. (此时 EditDirDialog 未创建，按钮点击暂时无效果或 console.log)
    Expected Result: 编辑按钮可见，icon 为 Pencil 或 Settings，size 与其他按钮一致
    Failure Indicators: 编辑按钮缺失或样式不一致
    Evidence: .sisyphus/evidence/task-5-edit-button-visible.png
  ```

  **Commit**: YES
  - Message: `feat(client): add edit directory button to FileTree header`
  - Files: `src/client/components/FileTree.tsx, src/client/App.tsx`
  - Pre-commit: `npm run typecheck`

- [x] 6. EditDirDialog 组件（显示名修改 + 删除）

  **What to do**:
  - 新建 `src/client/components/EditDirDialog.tsx` 组件
  - 遵循 SettingsDialog 的 Sheet（移动端 bottom）+ Dialog（桌面端 centered）双模式
  - 弹窗内容：
    - 标题："目录设置"
    - 显示当前目录的完整路径（只读文本，不可编辑）
    - 显示名(别名)输入框：Input 组件，placeholder 为 "输入显示名称"，初始值从 DirConfig.name 获取，空时显示 path.split('/').pop() 的默认值
    - 保存按钮：调用 PATCH /api/files/dirs 更新 name 字段
    - 删除按钮（红色/destructive variant）：点击后弹出 AlertDialog 二次确认
    - AlertDialog 确认文本："确定要移除目录 <显示名> 吗？文件不会被删除，只是从列表中移除。"
    - 删除确认后：调用 DELETE /api/files/dirs?path=...、关闭所有弹窗、dispatch config-changed、刷新文件树
    - 错误处理：内联显示 API 错误消息
  - 在 App.tsx 中将编辑按钮连接到 EditDirDialog（editDirDialogOpen + editDirPath state）
  - isMobile 检测逻辑：使用 window.innerWidth < 768

  **Must NOT do**:
  - ❌ 不包含 exclude 编辑功能（跳过）
  - ❌ 不修改实际文件夹路径/名称（只修改显示别名）
  - ❌ 不修改 SettingsDialog 的目录编辑逻辑
  - ❌ 不添加 WebSocket 广播

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 新组件创建，涉及弹窗模式、编辑交互、删除确认、API 调用
  - **Skills**: [`shadcn-ui`]
    - `shadcn-ui`: 需要正确使用 Sheet、Dialog、AlertDialog、Input、Button 等组件

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Task 5's button and state)
  - **Parallel Group**: Wave 2 (after Task 5)
  - **Blocks**: Task 7
  - **Blocked By**: Tasks 1, 3, 5

  **References**:

  **Pattern References**:
  - `src/client/components/SettingsDialog.tsx:612-648` — Sheet+Dialog 条件渲染模式（isMobile判断），必须完全仿照
  - `src/client/components/SettingsDialog.tsx:78-81,116-120` — isMobile 状态检测
  - `src/client/components/ui/alert-dialog.tsx` — AlertDialog 组件，用于删除确认
  - `src/client/components/RenameDialog.tsx` — 重命名弹窗的交互模式（Input + 保存按钮）

  **API/Type References**:
  - `PATCH /api/files/dirs` — 请求 body: `{ path: string, name?: string }`，更新显示名
  - `DELETE /api/files/dirs?path=...` — 删除目录
  - `src/config.ts:DirConfig` — 统一导入的类型定义（包含 name 字段）

  **WHY Each Reference Matters**:
  - `SettingsDialog Sheet+Dialog`: 弹窗双模式标准实现
  - `AlertDialog`: 删除确认的 UI 组件，确保用户不会误删
  - `RenameDialog`: 输入+保存的交互模式参考
  - `PATCH/DELETE API`: EditDirDialog 需调用的两个关键 API

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 编辑目录弹窗 - 修改显示名成功
    Tool: chrome-devtools MCP
    Preconditions: 开发服务器运行，至少一个目录已配置
    Steps:
      1. navigate_page → http://localhost:5787
      2. take_snapshot → 找到编辑按钮 (Pencil icon 在 Files 标题旁)
      3. click → 编辑按钮 uid
      4. wait_for → ["目录设置"]
      5. take_snapshot → 确认弹窗打开，显示完整路径和显示名输入框
      6. fill → 显示名输入框 uid, value="我的文档"
      7. click → 保存按钮 uid
      8. wait_for → ["目录设置"] 消失 (弹窗关闭)
      9. take_snapshot → 确认目录切换区域显示"我的文档"而非路径basename
    Expected Result: 弹窗打开→输入显示名→保存→目录标签更新为"我的文档"
    Failure Indicators: 保存失败、显示名未更新、弹窗不关闭
    Evidence: .sisyphus/evidence/task-6-edit-name-success.png

  Scenario: 编辑目录弹窗 - 删除目录（确认）
    Tool: chrome-devtools MCP
    Preconditions: 开发服务器运行，2+个目录已配置
    Steps:
      1. navigate_page → http://localhost:5787
      2. click → 编辑按钮
      3. wait_for → ["目录设置"]
      4. take_snapshot → 确认弹窗显示当前目录路径
      5. click → 删除按钮 uid
      6. wait_for → ["确定要移除"] (AlertDialog 出现)
      7. take_snapshot → 确认 AlertDialog 包含确认文本
      8. click → AlertDialog 确认按钮 uid
      9. wait_for → ["目录设置"] 消失 (所有弹窗关闭)
      10. take_snapshot → 确认目录切换区域少了被删除的目录，自动切换到剩余目录
    Expected Result: 删除按钮→AlertDialog确认→目录移除→自动切换
    Failure Indicators: 无 AlertDialog 直接删除、删除后无自动切换
    Evidence: .sisyphus/evidence/task-6-delete-dir-confirm.png

  Scenario: 编辑目录弹窗 - 删除目录（取消）
    Tool: chrome-devtools MCP
    Preconditions: 开发服务器运行
    Steps:
      1. navigate_page → http://localhost:5787
      2. click → 编辑按钮
      3. wait_for → ["目录设置"]
      4. click → 删除按钮
      5. wait_for → ["确定要移除"]
      6. click → AlertDialog 取消按钮 uid
      7. take_snapshot → 确认 AlertDialog 关闭，EditDirDialog 仍在
      8. 验证目录未被删除
    Expected Result: 取消后 AlertDialog 关闭，目录仍在
    Failure Indicators: 取消后目录仍被删除
    Evidence: .sisyphus/evidence/task-6-delete-dir-cancel.png

  Scenario: 编辑目录弹窗 - 移动端 Sheet 模式
    Tool: chrome-devtools MCP
    Preconditions: 开发服务器运行
    Steps:
      1. emulate → viewport="375x812x2,mobile,touch"
      2. navigate_page → http://localhost:5787
      3. click → 编辑按钮
      4. wait_for → ["目录设置"]
      5. take_screenshot → 保存移动端截图
    Expected Result: 移动端为底部 Sheet
    Failure Indicators: 居中 Dialog
    Evidence: .sisyphus/evidence/task-6-edit-dir-mobile-sheet.png

  Scenario: 编辑目录弹窗 - 桌面端 Dialog 模式
    Tool: chrome-devtools MCP
    Preconditions: 开发服务器运行
    Steps:
      1. emulate → viewport="1280x800x1" (或重置)
      2. navigate_page → http://localhost:5787
      3. click → 编辑按钮
      4. wait_for → ["目录设置"]
      5. take_screenshot → 保存桌面端截图
    Expected Result: 桌面端为居中 Dialog
    Failure Indicators: 底部 Sheet
    Evidence: .sisyphus/evidence/task-6-edit-dir-desktop-dialog.png
  ```

  **Commit**: YES
  - Message: `feat(client): add EditDirDialog component with name edit and delete`
  - Files: `src/client/components/EditDirDialog.tsx, src/client/App.tsx`
  - Pre-commit: `npm run typecheck`

- [x] 7. 边界情况处理 - 空目录状态、删除当前目录切换、错误展示

  **What to do**:
  - **空目录状态 UI**: 当 groups.length === 0 时（所有目录被删除），在侧边栏显示空状态引导：
    - 图标（FolderOpen 或 Inbox icon）
    - 文本："暂无目录" 或 "No directories"
    - "添加目录"按钮（直接打开 AddDirDialog）
  - **删除当前目录自动切换**: 在 App.tsx 的目录删除逻辑中：
    - 删除 activeRoot 对应的目录后，自动切换到 groups[0].root.path（第一个剩余目录）
    - 如果 groups 为空，activeRoot 设为 null
    - 更新所有依赖 activeRoot 的状态（selectedFile、expandedPaths 等）
  - **AddDirDialog 错误展示增强**: 
    - API 返回错误时（如路径冲突 conflictWith、敏感路径），在弹窗内搜索输入下方显示红色错误文本
    - 错误类型区分：路径冲突（"此目录与已添加的 <conflictDir> 存在父子关系"）、敏感路径（"不允许添加敏感路径"）、路径不存在（"路径不存在"）
  - **EditDirDialog 错误展示增强**:
    - PATCH 失败时显示内联错误
    - DELETE 失败时显示内联错误

  **Must NOT do**:
  - ❌ 不添加 WebSocket 广播配置变更
  - ❌ 不修改 SettingsDialog 的空状态处理
  - ❌ 不让 exclude 字段生效

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 多个边界情况处理，涉及状态管理、UI 条件渲染、错误处理
  - **Skills**: [`shadcn-ui`]
    - `shadcn-ui`: 空状态 UI 设计需要正确使用组件

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential, after Wave 2)
  - **Blocks**: Task 8
  - **Blocked By**: Tasks 4, 6

  **References**:

  **Pattern References**:
  - `src/client/App.tsx:108-135` — 目录切换区域，需处理空 groups 状态
  - `src/client/App.tsx:657-665` — handleDirChange 函数，目录切换逻辑
  - `src/client/App.tsx:316-340` — config-changed 事件处理和 fetchFiles

  **API/Type References**:
  - `POST /api/files/dirs` — 错误响应格式：可能包含 `{ error: "...", conflictWith: "...", reason: "..." }` 等字段
  - `DELETE /api/files/dirs` — 错误响应格式

  **WHY Each Reference Matters**:
  - `目录切换区域`: 空状态需要在此区域替代显示
  - `handleDirChange`: 删除后自动切换的逻辑需要参考此函数
  - `API 错误格式`: 错误展示需要根据服务器返回的具体字段来定制消息

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 空目录状态 - 所有目录被删除后显示引导
    Tool: chrome-devtools MCP
    Preconditions: 开发服务器运行，2个目录已配置
    Steps:
      1. navigate_page → http://localhost:5787
      2. click → 编辑按钮
      3. wait_for → ["目录设置"]
      4. click → 删除按钮
      5. wait_for → ["确定要移除"]
      6. click → 确认删除 (删除第一个目录)
      7. 重复删除第二个目录
      8. take_snapshot → 确认显示空状态："暂无目录" + "添加目录"按钮
    Expected Result: 空状态 UI 显示，包含引导添加按钮
    Failure Indicators: 侧边栏空白或崩溃
    Evidence: .sisyphus/evidence/task-7-empty-state.png

  Scenario: 删除当前活跃目录后自动切换
    Tool: chrome-devtools MCP
    Preconditions: 开发服务器运行，2+个目录已配置，当前选中第二个目录
    Steps:
      1. navigate_page → http://localhost:5787
      2. click → 目录切换区域的第二个目录标签（切换到第二个目录）
      3. click → 编辑按钮
      4. wait_for → ["目录设置"]
      5. click → 删除按钮 → 确认删除当前目录
      6. take_snapshot → 确认自动切换到第一个目录，文件树显示第一个目录的文件
    Expected Result: 删除后自动切换到剩余的第一个目录，文件树更新
    Failure Indicators: 文件树为空或不切换
    Evidence: .sisyphus/evidence/task-7-delete-current-switch.png

  Scenario: 添加目录路径冲突错误展示
    Tool: chrome-devtools MCP
    Preconditions: 开发服务器运行，已有目录 /home/user/docs
    Steps:
      1. navigate_page → http://localhost:5787
      2. click → 添加按钮
      3. wait_for → ["添加目录"]
      4. type_text → 搜索一个与已有目录有父子关系的路径
      5. click → 选择该路径
      6. take_snapshot → 确认弹窗内显示红色错误文本（包含冲突信息）
    Expected Result: 内联错误消息出现，弹窗不关闭
    Failure Indicators: 弹窗崩溃或无错误提示
    Evidence: .sisyphus/evidence/task-7-add-conflict-error.png

  Scenario: 空目录状态点击添加按钮
    Tool: chrome-devtools MCP
    Preconditions: 所有目录已删除，显示空状态
    Steps:
      1. 在空状态 UI 中找到"添加目录"按钮
      2. click → "添加目录"按钮 uid
      3. wait_for → ["添加目录"]
      4. take_snapshot → 确认 AddDirDialog 打开
    Expected Result: 空状态的添加按钮能正常打开 AddDirDialog
    Failure Indicators: 添加按钮不可点击或弹窗不打开
    Evidence: .sisyphus/evidence/task-7-empty-add-button.png
  ```

  **Commit**: YES
  - Message: `feat(client): handle edge cases - empty state, delete switch, errors`
  - Files: `src/client/App.tsx, src/client/components/EditDirDialog.tsx, src/client/components/AddDirDialog.tsx`
  - Pre-commit: `npm run typecheck`

- [x] 8. 整合验证 + typecheck

  **What to do**:
  - 运行 `npm run typecheck` 确保零类型错误
  - 检查所有新增组件的导入是否正确
  - 检查 App.tsx 中所有新增 state 和 handler 是否完整连接
  - 检查所有弹窗的移动端/桌面端双模式是否完整
  - 修复任何 typecheck 发现的问题

  **Must NOT do**:
  - ❌ 不添加新功能
  - ❌ 不修改已有功能的行为

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 整合检查和修复，改动量小
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential, after Task 7)
  - **Blocks**: F1-F4
  - **Blocked By**: Task 7

  **References**:
  - `src/client/App.tsx` — 所有修改的集成点
  - `src/client/components/AddDirDialog.tsx` — 新增组件
  - `src/client/components/EditDirDialog.tsx` — 新增组件

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: typecheck 通过
    Tool: Bash
    Preconditions: 所有代码修改完成
    Steps:
      1. npm run typecheck
    Expected Result: 0 errors, 0 warnings
    Failure Indicators: 任何 type errors
    Evidence: .sisyphus/evidence/task-8-typecheck.txt

  Scenario: 全流程整合测试 - 添加→编辑→删除
    Tool: chrome-devtools MCP
    Preconditions: 开发服务器运行，至少1个目录
    Steps:
      1. navigate_page → http://localhost:5787 (desktop viewport)
      2. 点击添加按钮 → AddDirDialog 打开 → 搜索并添加新目录 → 关闭
      3. 验证新目录标签出现
      4. 点击编辑按钮 → EditDirDialog 打开 → 修改显示名 → 保存 → 关闭
      5. 验证目录标签显示新名称
      6. 点击编辑按钮 → 删除目录 → 确认 → 自动切换到剩余目录
      7. 切换到移动端 viewport → 验证所有弹窗为 Sheet 模式
    Expected Result: 全流程顺畅，移动端和桌面端都正常
    Failure Indicators: 任何步骤失败
    Evidence: .sisyphus/evidence/task-8-integration-test.png
  ```

  **Commit**: YES
  - Message: `chore: typecheck and integration verification`
  - Files: 任何修复的文件
  - Pre-commit: `npm run typecheck`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `npm run typecheck`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | Typecheck [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high` (+ chrome-devtools skill)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (add+edit+delete working together). Test edge cases: single directory, empty state, name collision. Test both mobile (375x812) and desktop (1280x800). Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Commit | Message | Files | Pre-commit |
|--------|---------|-------|-----------|
| 1 | `feat(server): support name field in PATCH /api/files/dirs` | src/server/api.ts, src/config.ts | npm run typecheck |
| 2 | `feat(client): always show directory switcher with add button` | src/client/App.tsx | npm run typecheck |
| 3 | `refactor(client): unify DirConfig import from shared location` | src/client/components/SettingsDialog.tsx, src/client/App.tsx | npm run typecheck |
| 4 | `feat(client): add AddDirDialog component with PathInput search` | src/client/components/AddDirDialog.tsx, src/client/App.tsx | npm run typecheck |
| 5 | `feat(client): add edit directory button to FileTree header` | src/client/components/FileTree.tsx, src/client/App.tsx | npm run typecheck |
| 6 | `feat(client): add EditDirDialog component with name edit and delete` | src/client/components/EditDirDialog.tsx, src/client/App.tsx | npm run typecheck |
| 7 | `feat(client): handle edge cases - empty state, delete switch, errors` | src/client/App.tsx, src/client/components/EditDirDialog.tsx, src/client/components/AddDirDialog.tsx | npm run typecheck |
| 8 | `chore: typecheck and integration verification` | - | npm run typecheck |

---

## Success Criteria

### Verification Commands
```bash
npm run typecheck  # Expected: 0 errors
curl -X PATCH http://localhost:5788/api/files/dirs -H 'Content-Type: application/json' -d '{"path":"/test","name":"MyTestDir"}'  # Expected: success response with name field
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] npm run typecheck passes
- [ ] Mobile viewport (375x812) all scenarios pass
- [ ] Desktop viewport (1280x800) all scenarios pass
- [ ] Empty directory state shows guidance
- [ ] Delete current directory auto-switches correctly