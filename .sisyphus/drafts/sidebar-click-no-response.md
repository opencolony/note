# Draft: 侧边栏点击文件无响应

## 问题描述
用户报告：点击侧边栏文件后没有反应

## 代码流程分析（已完成）

### 完整点击链路
```
FileTree.tsx:112 - SidebarMenuButton onClick
  → onSelect(node.path, 'file', activeRoot || undefined)
    → App.tsx:393 handleSelectFile
      → load(selectedPath, effectiveRoot)
        → useFile.ts:23 load()
          → fetch(`/api/files${filePath}?root=${dirPath}`)
          → setContent(text) + setPath(filePath)
            → TipTapEditor re-render (key={`${path}-${editorMode}`})
```

### 关键文件
- `src/client/components/FileTree.tsx` - 文件树组件，TreeNode 处理点击
- `src/client/App.tsx` - handleSelectFile 回调，状态管理
- `src/client/hooks/useFile.ts` - load/save 逻辑
- `src/client/components/ui/sidebar.tsx` - SidebarMenuButton 基础组件

### 已确认的代码逻辑
1. 文件点击：`SidebarMenuButton` 有 `onClick` 调用 `onSelect`
2. 文件夹点击：`CollapsibleTrigger` 包裹的按钮只负责展开/收起，不调用 `onSelect`
3. `handleSelectFile` 区分文件/文件夹类型
4. `load()` 通过 fetch 获取文件内容并更新 state
5. 错误处理：load 失败时调用 onError，但不会更新 path state

### 潜在问题点（待验证）
1. **API 请求静默失败** - load() 中 fetch 返回非 OK 状态时，catch 只调用 onError，path 不更新，UI 无变化
2. **activeDir 未正确设置** - 如果 activeDir 为 null，SidebarContent 中 files 为空数组，但用户说能看到文件列表
3. **CSS 事件拦截** - 需要检查是否有 pointer-events 或 z-index 问题
4. **移动端特定问题** - 用户说 "ulw" 可能是 "UI" 的打字错误，也可能是特定场景

## 待确认问题
- [ ] "ulw" 是什么意思？是 "UI" 的打字错误吗？
- [ ] 移动端还是桌面端？
- [ ] 点击后控制台有无报错？
- [ ] 文件列表能正常显示吗？
- [ ] 是最近才出现的问题吗？

## 最近相关提交
- a422cbb fix: handle root hash path to show empty state instead of raw JSON
- 15ac15e refactor: remove backward compat, clean all root references
- 30b4c4b refactor(client): rename activeRoot/roots to activeDir/dirs
