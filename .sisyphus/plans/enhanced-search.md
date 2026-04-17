# 增强目录搜索功能

## TL;DR
> 增强 `/dirs/search` API 的模糊匹配能力，支持更智能的路径前缀搜索逻辑。

## Context
- 当前搜索逻辑：
  - 无路径前缀（如 `projects`）：从家目录遍历，fuzzysort 匹配
  - `/` 或 `~` 前缀（如 `~/proje`）：解析为路径，提取最后一部分作为搜索词
- 问题：用户期望 `~/do` 能匹配 `~/Documents` 和 `~/Downloads`，而当前逻辑会把 `~/do` 当作路径 `/home/user/do` 处理，只搜索该目录下的内容

## 期望的搜索逻辑

### 场景 1：无路径前缀（纯名称搜索）
- **输入**: `projects`
- **行为**: 全盘搜索（从 `/` 开始），匹配所有包含 `projects` 的目录路径
- **实现**: 调用 API `?q=projects&scope=global`

### 场景 2：家目录前缀 + 缩写
- **输入**: `~/do`
- **行为**: 在家目录下搜索以 `do` 开头的目录（匹配 `Documents`, `Downloads` 等）
- **实现**: 调用 API `?q=do&root=~`

### 场景 3：绝对路径前缀
- **输入**: `/et`
- **行为**: 在根目录下搜索以 `et` 开头的目录（匹配 `etc` 等）
- **实现**: 调用 API `?q=et&root=/`

## 设计决策
- **方案 A（后端增强）**: 修改 `/dirs/search` 接收 `root` 参数，指定搜索起始目录
  - `?q=projects&root=/` - 全盘搜索
  - `?q=do&root=~` - 家目录下搜索
  - `?q=projects`（无 root）- 默认从家目录开始
- **方案 B（前端转换）**: 前端根据输入模式，自动转换查询参数
  - `~/do` → `?q=do&root=~`
  - `/et` → `?q=et&root=/`
  - `projects` → `?q=projects&root=/` 或 `?q=projects`

**选择方案 A**：后端更灵活，前端逻辑更简单。

## TODOs

- [ ] 1. 后端：增强 `/dirs/search` API 支持 `root` 参数
  **What to do**:
  - 修改 `src/server/api.ts` 中的 `/dirs/search` 路由
  - 新增可选查询参数 `root`，支持 `~`（家目录）、`/`（根目录）或任意绝对路径
  - 当提供 `root` 时，从该目录开始遍历；否则默认从家目录开始
  - 搜索词 `q` 只匹配目录名（而不是完整路径），实现"前缀匹配"
  - 保持 `MAX_DEPTH = 5` 和 `MAX_RESULTS = 100`
  **QA Scenarios**:
  1. `curl "/api/files/dirs/search?q=do&root=~"` 返回家目录下以 `do` 开头的目录（如 `Documents`, `Downloads`）
  2. `curl "/api/files/dirs/search?q=et&root=/"` 返回根目录下以 `et` 开头的目录（如 `etc`）
  3. `curl "/api/files/dirs/search?q=projects"` 默认从家目录搜索，返回所有包含 `projects` 的目录
  4. `npm run typecheck` 无错误
  **Commit**: `feat(api): enhance search with root parameter for prefix matching`

- [ ] 2. 前端：更新搜索请求，支持新的 `root` 参数
  **What to do**:
  - 修改 `src/client/components/AddDirDialog.tsx`
  - 解析用户输入，提取 `root` 和 `q`：
    - `~/do` → `root=~`, `q=do`
    - `/et` → `root=/`, `q=et`
    - `projects` → `root=/`（全盘搜索）, `q=projects`
  - 构建 API URL：`/api/files/dirs/search?q=${q}&root=${root}`
  **QA Scenarios**:
  1. 输入 `~/do`，列表显示 `~/Documents`、`~/Downloads`
  2. 输入 `/et`，列表显示 `/etc`
  3. 输入 `projects`，全盘搜索显示所有包含 `projects` 的目录
  4. 输入为空，显示家目录子目录列表（browse 模式）
  **Commit**: `feat(ui): update search to use root parameter`

- [ ] 3. 运行类型检查并验证
  **What to do**:
  - 运行 `npm run typecheck`
  - 启动 dev server，用浏览器验证各种搜索场景
  **QA Scenarios**:
  1. `npm run typecheck` 输出 `0` 错误
  2. 浏览器测试：输入 `~/do`、`/et`、`projects` 都能得到预期结果
  **Commit**: NO (包含在上一条)
