# 优化目录选择对话框

## TL;DR
> 调整 `AddDirDialog` 组件：输入框默认空、支持模糊搜索、去掉「上级目录」和「添加当前目录」按钮、点击列表项直接添加目录。

## Context
- 已有 `/api/files/dirs/browse` API（列出指定路径下子目录）
- 已有 `/api/files/dirs/search` API（模糊搜索目录路径）
- 当前 `AddDirDialog.tsx` 实现了层级浏览，但用户体验需要简化

## Work Objectives
1. 修改 `src/client/components/AddDirDialog.tsx`
2. 默认打开时搜索框为空，下方显示 `~` 目录下的子目录列表
3. 输入内容时切换为模糊搜索模式，调用 `search` API
4. 移除「上级目录」和「添加当前目录」按钮
5. 点击列表中任意目录项直接添加该目录
6. 搜索结果不需要高亮，普通文本显示即可

## TODOs

- [x] 1. 重构 AddDirDialog 组件
  **What to do**:
  - 将 `inputValue` 默认值从 `'~'` 改为 `''`
  - 移除 `currentPath`、`getParentDir`、`handleGoUp`、`navigateToDir` 等层级浏览相关状态/函数
  - 移除「上级目录」和「添加当前目录」按钮
  - 修改数据获取逻辑：`inputValue` 为空时调用 `browse?path=~`；有值时调用 `search?q=`
  - 列表项 `onClick` 统一调用 `handleAddDir`，不再进入子目录
  - 保留「最近项目」区域功能不变
  - 搜索结果仅显示普通路径文本，不需要高亮组件
  **QA Scenarios**:
  1. 打开「添加目录」对话框，搜索框为空，下方显示 `~` 下子目录（如 `~/Android`、`~/Desktop`）
  2. 输入 `proj`，列表切换为搜索结果，显示模糊匹配的路径列表
  3. 点击任意列表项，该目录被成功添加，对话框关闭
  4. 确认没有「上级目录」和「添加当前目录」按钮
  **Commit**: `fix(ui): simplify add dir dialog with fuzzy search`

- [x] 2. 运行类型检查并验证
  **What to do**:
  - 运行 `npm run typecheck`，确保无类型错误
  - 启动 dev server，用浏览器验证功能正常
  **QA Scenarios**:
  1. `npm run typecheck` 输出 `0` 错误
  **Commit**: NO (包含在上一条)
