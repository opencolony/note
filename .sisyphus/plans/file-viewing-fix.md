# 修复文件点击无响应 Bug

## TL;DR

> **Quick Summary**: 修复 `walkDirectory` 中路径计算错误，使用 `path.relative()` 替代脆弱的字符串 `replace()`，确保文件树返回正确的相对路径，使前端能正确加载文件内容。
> 
> **Deliverables**: 
> - 修复 `src/server/api.ts` 中 `walkDirectory` 函数的路径计算（2处）
> - 修复文件创建响应中的路径计算（1处）
> - 验证文件点击加载功能正常
> 
> **Estimated Effort**: Quick
> **Parallel Execution**: NO - sequential (single file change)
> **Critical Path**: Fix walkDirectory → Verify API → Verify frontend

---

## Context

### Original Request
用户报告"查看文件功能出问题了"——启动服务后首次点击文件树中的文件，文件没有反应。

### Interview Summary
**Key Discussions**:
- 症状：点击文件无反应
- 触发场景：启动后首次打开
- 用户未查看控制台报错

**Research Findings**:
- 根因定位：`src/server/api.ts` 第93行和第102行，`walkDirectory` 函数使用 `fullPath.replace(dirPath, '')` 计算相对路径
- 问题：字符串 `replace()` 在路径包含相似子串时可能错误匹配（如 `/workspace` 匹配到 `/my-workspace`），且不够健壮
- 修复方案：使用 `path.relative(dirPath, fullPath)` 替代
- Metis 关键发现：`path.relative()` 返回的路径不带前导 `/`，而前端 URL 构造 (`/api/files${filePath}`) 依赖此前导斜杠

### Metis Review
**Identified Gaps** (addressed):
- **Critical**: `path.relative()` 输出需要手动添加前导 `/`，否则前端 URL 会变成 `/api/filesfile.md`（缺少分隔符）
- **Medium**: 第530行文件创建响应中有相同的脆弱模式，应一并修复
- **High**: 需要可执行的验收标准（API 测试 + 前端交互测试）

---

## Work Objectives

### Core Objective
修复后端文件树路径计算逻辑，确保返回的路径格式正确，使前端能够正确加载文件内容。

### Concrete Deliverables
- `src/server/api.ts` 第93行：修复目录节点的 path 计算
- `src/server/api.ts` 第102行：修复文件节点的 path 计算
- `src/server/api.ts` 第530行：修复文件创建响应的 path 计算

### Definition of Done
- [ ] `curl http://localhost:5787/api/files/` 返回的文件树中，`path` 字段以 `/` 开头
- [ ] `curl "http://localhost:5787/api/files/subdir/file.md?root=..."` 返回文件内容（200），而非 404
- [ ] 浏览器中点击文件树中的文件，内容正确加载到编辑器
- [ ] `npm run typecheck` 通过

### Must Have
- 使用 `path.relative()` 替代 `String.replace()` 计算相对路径
- 路径格式保持前导 `/`（如 `/subdir/file.md`）
- 保留 `.replace(/\\/g, '/')` 处理 Windows 路径分隔符

### Must NOT Have (Guardrails)
- 不修改前端代码（bug 纯粹在后端）
- 不修改 `FileNode` 接口或路径语义
- 不触碰 `findRootForPath`、`isAllowed` 等路径验证函数
- 不添加额外的错误处理或日志（仅修复路径计算）

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: NO（项目未配置测试框架）
- **Automated tests**: None
- **Agent-Executed QA**: ALWAYS（通过 curl API 测试 + Chrome DevTools 前端验证）

### QA Policy
- **API**: 使用 Bash (curl) 发送请求，断言状态码和响应字段
- **Frontend/UI**: 使用 Chrome DevTools MCP 模拟点击，验证文件加载

---

## Execution Strategy

### Sequential Execution

```
Task 1: 修复 walkDirectory 路径计算 [quick]
  ↓
Task 2: 验证修复（API + 前端）[quick]
```

### Agent Dispatch Summary

- **1**: **1** - T1 → `quick`
- **2**: **1** - T2 → `quick`

---

## TODOs

- [ ] 1. 修复 walkDirectory 路径计算

  **What to do**:
  - 在 `src/server/api.ts` 的 `walkDirectory` 函数中，将第93行和第102行的路径计算从：
    ```ts
    path: fullPath.replace(dirPath, '').replace(/\\/g, '/') || '/',
    ```
    改为：
    ```ts
    const relativePath = path.relative(dirPath, fullPath).replace(/\\/g, '/')
    // ...
    path: relativePath ? '/' + relativePath : '/',
    ```
  - 将第530行文件创建响应的路径计算从：
    ```ts
    path: targetPath.replace(parentDirPath, '')
    ```
    改为：
    ```ts
    path: '/' + path.relative(parentDirPath, targetPath).replace(/\\/g, '/')
    ```

  **Must NOT do**:
  - 不修改 `FileNode` 接口定义
  - 不修改前端代码
  - 不添加额外的日志或错误处理

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 单文件内的简单修改，3处路径计算替换
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `git-master`: 修改完成后需要 commit，但可在验证阶段一并处理

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 2
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/server/api.ts:76-123` - `walkDirectory` 函数完整实现，需要修改第93行和第102行

  **API/Type References**:
  - `src/server/api.ts:17-23` - `FileNode` 接口定义，`path` 字段类型

  **External References**:
  - Node.js `path.relative()` 文档: https://nodejs.org/api/path.html#pathrelativefrom-to

  **WHY Each Reference Matters**:
  - `src/server/api.ts:76-123`: 需要修改的核心函数，理解完整的上下文以避免破坏递归逻辑
  - `src/server/api.ts:17-23`: 确保修改后的路径格式与 `FileNode.path` 的预期一致

  **Acceptance Criteria**:
  - [ ] `npm run typecheck` 通过（无 TypeScript 错误）
  - [ ] 修改后代码中不再有 `fullPath.replace(dirPath, '')` 模式

  **QA Scenarios**:

  ```
  Scenario: 验证代码修改正确
    Tool: Bash (grep)
    Steps:
      1. grep -n "fullPath.replace(dirPath" src/server/api.ts
      2. 确认无匹配结果（旧模式已消除）
      3. grep -n "path.relative(dirPath, fullPath)" src/server/api.ts
      4. 确认有2处匹配（目录和文件节点）
    Expected Result: 旧模式0匹配，新模式2匹配
    Failure Indicators: 仍有 fullPath.replace(dirPath 模式存在

  Scenario: TypeScript 类型检查
    Tool: Bash
    Steps:
      1. cd /home/yuexiaoliang/projects/colonynote
      2. npm run typecheck
    Expected Result: 无类型错误，exit code 0
    Evidence: .sisyphus/evidence/task-1-typecheck.txt
  ```

  **Evidence to Capture:**
  - [ ] grep 结果截图
  - [ ] typecheck 输出

  **Commit**: YES
  - Message: `fix(server): use path.relative() for correct file path computation`
  - Files: `src/server/api.ts`
  - Pre-commit: `npm run typecheck`

- [ ] 2. 验证修复（API + 前端交互）

  **What to do**:
  - 重启后端服务使修改生效
  - 使用 curl 测试文件树 API 返回的路径格式
  - 使用 curl 测试单个文件内容加载
  - 使用 Chrome DevTools 验证前端文件点击功能

  **Must NOT do**:
  - 不修改任何代码（仅验证）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 验证性任务，执行预定义的测试步骤
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**:
    - `playwright`: 项目已有 Chrome DevTools MCP，优先使用

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: None
  - **Blocked By**: Task 1

  **References**:

  **API References**:
  - `GET /api/files/` - 文件树 API
  - `GET /api/files/*?root=...` - 单文件内容 API

  **WHY Each Reference Matters**:
  - 需要知道 API 端点格式来构造正确的测试请求

  **Acceptance Criteria**:
  - [ ] 文件树 API 返回的 `path` 字段以 `/` 开头
  - [ ] 单文件内容 API 返回 200 和文件内容
  - [ ] 前端点击文件能正确加载内容

  **QA Scenarios**:

  ```
  Scenario: 文件树 API 路径格式验证
    Tool: Bash (curl)
    Steps:
      1. curl -s http://localhost:5787/api/files/ | grep -o '"path":"[^"]*"' | head -5
      2. 检查返回的 path 值是否以 / 开头
    Expected Result: 所有 path 值均以 / 开头，如 "/dev/opencode/技术栈概览.md"
    Failure Indicators: path 不以 / 开头，或包含绝对路径
    Evidence: .sisyphus/evidence/task-2-tree-paths.txt

  Scenario: 单文件内容加载验证
    Tool: Bash (curl)
    Steps:
      1. 从文件树 API 获取一个文件路径（如 /dev/opencode/技术栈概览.md）
      2. 获取对应的 root 值（如 ./workspace）
      3. curl -s "http://localhost:5787/api/files/dev/opencode/技术栈概览.md?root=.%2Fworkspace" | head -c 200
    Expected Result: 返回 200 和文件内容（以 --- 或 # 开头），而非 {"error":"File not found"}
    Failure Indicators: 返回 404 或错误信息
    Evidence: .sisyphus/evidence/task-2-file-content.txt

  Scenario: 前端文件点击功能验证
    Tool: Chrome DevTools
    Preconditions: 后端服务运行在 localhost:5787
    Steps:
      1. 导航到 http://localhost:5787
      2. 等待页面加载完成（等待 "ColonyNote" 文本出现）
      3. 打开移动端侧边栏（点击汉堡菜单按钮）
      4. 等待文件树加载
      5. 点击一个文件（如 "技术栈概览.md"）
      6. 等待 3 秒让文件加载
      7. 检查编辑器区域是否显示文件内容
      8. 检查 URL hash 是否更新为 "<root>:<filePath>"
      9. 检查浏览器控制台是否有错误
    Expected Result: 
      - 编辑器显示文件内容
      - URL hash 格式正确
      - 控制台无错误
    Failure Indicators: 编辑器空白、控制台报错、URL hash 未更新
    Evidence: .sisyphus/evidence/task-2-frontend-click.png
  ```

  **Evidence to Capture:**
  - [ ] curl 输出保存为 .sisyphus/evidence/task-2-*.txt
  - [ ] 前端验证截图保存为 .sisyphus/evidence/task-2-*.png

  **Commit**: YES（与 Task 1 合并）
  - Message: `fix(server): use path.relative() for correct file path computation`
  - Files: `src/server/api.ts`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  验证 `walkDirectory` 中使用了 `path.relative()`，路径格式带前导 `/`，无 `fullPath.replace(dirPath` 残留。
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  运行 `npm run typecheck`，检查修改后的代码无类型错误，无 `as any`，无未使用的导入。
  Output: `Build [PASS/FAIL] | TypeCheck [PASS/FAIL] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high`
  执行所有 QA 场景：API 路径格式、文件内容加载、前端点击验证。
  Output: `Scenarios [N/N pass] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  验证仅修改了 `src/server/api.ts` 中的路径计算逻辑，未触碰其他文件。
  Output: `Tasks [N/N compliant] | VERDICT`

---

## Commit Strategy

- **1**: `fix(server): use path.relative() for correct file path computation` - src/server/api.ts, npm run typecheck

---

## Success Criteria

### Verification Commands
```bash
npm run typecheck  # Expected: no errors, exit code 0
curl http://localhost:5787/api/files/  # Expected: file tree with paths starting with "/"
curl "http://localhost:5787/api/files/subdir/file.md?root=..."  # Expected: 200 + file content
```

### Final Checklist
- [ ] `walkDirectory` 使用 `path.relative()` 计算路径
- [ ] 路径格式带前导 `/`
- [ ] 文件创建响应路径已修复
- [ ] 前端点击文件能正常加载
- [ ] `npm run typecheck` 通过
