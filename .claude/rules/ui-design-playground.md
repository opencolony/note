# UI 设计 Playground 规范

当用户要求**重新设计某个模块的 UI** 或**新增模块**时，必须先在 Playground 中完成设计，再进入正式代码实现。

## 流程要求

1. **创建 Playground Case**
   - 在 `src/client/components/playground/cases/` 目录下新建 case 文件，命名格式：`{模块名}-{设计目标}.tsx`
   - 在 `src/client/components/playground/registry.ts` 中注册该 case
   - Case 结构遵循 `PlaygroundCase` 接口（`id`, `name`, `description`, `variants[]`）

2. **设计 6 个候选项**
   - 每个 case 必须包含 **6 个不同的 `PlaygroundVariant`**
   - 每个 variant 是一个独立的视觉方案，使用不同的布局、配色、交互风格
   - Variant 命名格式：`方案 X：{风格描述}`（X 为 A-F）
   - 每个 variant 需提供 `name`、`description` 和 `component`

3. **启动开发服务器预览**
   - 确保 `note` Tmux 会话中已运行 `pnpm dev`
   - 在浏览器中访问 Playground 页面查看所有候选项
   - 确认每个 variant 在浅色和深色主题下都能正常显示

4. **用户选择**
   - 向用户展示 6 个候选项的截图或描述
   - 由用户选定最终方案后，再将选定方案提取到正式组件中实现

## Playground 类型参考

```typescript
// src/client/components/playground/types.ts
interface PlaygroundVariant {
  name: string           // 如："方案 A：圆角卡片式"
  description?: string   // 简短描述设计特点
  component: React.ReactNode
}

interface PlaygroundCase {
  id: string             // kebab-case，如 "tabbar-styles"
  name: string           // 显示名称
  description?: string   // 设计目标说明
  variants: PlaygroundVariant[]  // 6 个候选项
}
```

## 禁止事项

- **禁止**在未经过 Playground 设计阶段就直接修改正式组件代码
- **禁止**候选项少于 6 个
- **禁止**候选项之间差异过小（如仅改颜色、字号）
