# Fix: dev.ts WebSocket 消息路径处理

## TL;DR

> **Quick Summary**: 修复 dev.ts（开发服务器）中 WebSocket 消息路径处理与 index.ts（生产服务器）不一致的问题。
> 
> **Deliverables**:
> - dev.ts 中使用 `findDirForPath` 获取正确的根目录路径
> - 统一路径计算逻辑：`'/' + filePath.replace(actualRootPath, '').replace(/^\/+/, '')`
> - 添加 `rootPath` 字段到 WebSocket 消息
> 
> **Estimated Effort**: Quick (~5 min)

---

## Context

### Root Cause
dev.ts line 93-94:
```typescript
const relativePath = filePath.replace(rootPath, '')  // rootPath 是相对路径 ./workspace，无法匹配绝对路径 filePath
const message = JSON.stringify({ type: 'file:change', event, path: relativePath })  // 缺少 rootPath 字段
```

index.ts line 109-111 (已修复):
```typescript
const actualRootPath = findDirForPath(filePath, config)
const relativePath = '/' + filePath.replace(actualRootPath, '').replace(/^\/+/, '')
const message = JSON.stringify({ type: 'file:change', event, path: relativePath, rootPath: actualRootPath })
```

### Impact
- 开发环境下外部修改提示完全不工作
- 生产环境已修复，但开发环境未同步

---

## TODOs

- [x] 1. 修复 dev.ts WebSocket 消息处理

  **What to do**:
  - 在 dev.ts 中导入 `findDirForPath` 函数（或内联实现）
  - 修改 line 92-100，与 index.ts 保持一致：
    ```typescript
    onFileChange: (rootPath: string, event: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir', filePath: string) => {
      const actualRootPath = findDirForPath(filePath, config)
      const relativePath = '/' + filePath.replace(actualRootPath, '').replace(/^\/+/, '')
      const message = JSON.stringify({ type: 'file:change', event, path: relativePath, rootPath: actualRootPath })
      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message)
        }
      })
    }
    ```
  - 运行 `npm run typecheck` 确认无类型错误

  **References**:
  - `src/dev.ts:91-101` — 需要修改的 WebSocket 处理逻辑
  - `src/server/index.ts:107-117` — 参考实现

  **Acceptance Criteria**:
  - [ ] `npm run typecheck` 通过
  - [ ] 开发环境下外部修改能触发刷新对话框

  **QA Scenarios**:
  ```
  Scenario: 开发环境 - 外部修改触发对话框
    Tool: Chrome DevTools + Bash
    Preconditions: npm run dev 运行中，已打开文件 /1.md
    Steps:
      1. 通过 shell 修改 workspace/1.md 文件内容
      2. 等待 6 秒（超过 SAVE_IGNORE_BUFFER_MS）
      3. 检查页面是否出现 AlertDialog
    Expected Result: 弹出"文件已更新"对话框
    Evidence: .sisyphus/evidence/dev-external-change-dialog.png
  ```

  **Commit**: YES
  - Message: `fix(dev): sync WebSocket message format with production server`
  - Files: `src/dev.ts`
  - Pre-commit: `npm run typecheck`

---

## Commit Strategy
- `fix(dev): sync WebSocket message format with production server` - src/dev.ts

---

## Success Criteria
- [ ] `npm run typecheck` 通过
- [ ] 开发环境下外部修改当前文件时弹出刷新对话框
- [ ] 自己保存文件不触发对话框
- [ ] 修改非当前文件不触发对话框
