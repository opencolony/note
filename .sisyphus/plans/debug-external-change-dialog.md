# Debug: 外部修改提示不触发

## TL;DR

> **Quick Summary**: 外部文件修改时 WebSocket 消息已到达，但未触发刷新对话框。需要添加调试日志确认是路径格式不匹配还是其他原因。
> 
> **Deliverables**:
> - 在 WebSocket 消息处理中添加调试日志
> - 确认 `changedPath` vs `path` 和 `rootPath` vs `activeDir` 的格式
> - 修复路径比较逻辑
> 
> **Estimated Effort**: Quick (~10 min)

---

## Context

### Original Request
用户反馈：高亮已修复，但外部修改提示仍然没有。控制台确认 WebSocket 消息有修改消息到达。

### Analysis
WebSocket 消息处理逻辑 (App.tsx:342-391) 中有两个关键比较：
1. Line 349: `if (rootPath && activeDir && rootPath !== activeDir) return` — 根目录匹配
2. Line 370: `if (path && changedPath === path)` — 文件路径匹配

可能的失败点：
- `rootPath` (来自 WebSocket) 与 `activeDir` (来自 App 状态) 格式不一致
- `changedPath` (来自 WebSocket) 与 `path` (来自 useFile) 格式不一致

---

## TODOs

- [ ] 1. 添加调试日志

  **What to do**:
  - 在 `src/client/App.tsx` WebSocket 消息处理中添加 console.log
  - 输出：`changedPath`, `rootPath`, `activeDir`, `path`, 比较结果
  - 重新触发外部修改，查看控制台输出
  - 根据日志确定具体失败原因

  **References**:
  - `src/client/App.tsx:342-391` — WebSocket 消息处理逻辑

  **QA Scenarios**:
  ```
  Scenario: 查看调试日志
    Tool: Chrome DevTools
    Steps:
      1. 打开文件 /1.md
      2. 通过命令行修改文件内容
      3. 查看控制台输出 [WS] 开头的日志
      4. 记录 changedPath, rootPath, activeDir, path 的值
    Expected Result: 控制台显示详细的调试信息，可以确定失败原因
    Evidence: .sisyphus/evidence/debug-ws-log.txt
  ```

- [ ] 2. 修复路径比较逻辑

  **What to do**:
  - 根据 Task 1 的日志，修复路径比较逻辑
  - 可能需要规范化路径格式（如都使用 path.resolve 或都去掉前导斜杠）
  - 运行 `npm run typecheck`

  **QA Scenarios**:
  ```
  Scenario: 外部修改触发对话框
    Tool: Chrome DevTools + Bash
    Steps:
      1. 打开文件 /1.md
      2. 通过命令行修改文件
      3. 等待 6 秒
      4. 验证弹出 AlertDialog
    Expected Result: 弹出"文件已更新"对话框
    Evidence: .sisyphus/evidence/external-change-dialog.png
  ```

---

## Commit Strategy
- `debug: add WebSocket message logging for external change detection`
- `fix(client): normalize path comparison in WebSocket handler`
