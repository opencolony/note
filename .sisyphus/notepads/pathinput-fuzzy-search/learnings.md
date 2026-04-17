# PathInput Fuzzy Search - Learnings

## fuzzysort 集成经验

### 安装
```bash
pnpm add fuzzysort
```

### 基本用法
```typescript
import fuzzysort from 'fuzzysort'

// 对字符串数组进行模糊匹配
const results = fuzzysort.go(searchTerm, candidates, {
  limit: 100,
  threshold: -10000,  // 过滤低质量匹配
})

// 结果格式
results = [{
  target: string,    // 原始字符串
  score: number,     // 匹配分数（越高越好）
  indexes: number[], // 匹配的字符索引
}]
```

### 关键实现决策

1. **后端模糊匹配优于前端**
   - 候选集可能很大（整个文件系统）
   - 前端传输所有路径开销太大
   - fuzzysort 放在后端可以控制遍历深度和结果数量

2. **两阶段搜索策略**
   - 阶段1：遍历收集候选目录（限制 maxDepth=5, maxResults=100）
   - 阶段2：用 fuzzysort 对候选集进行模糊匹配和排序
   - 避免在遍历过程中实时匹配，确保获得最佳匹配结果

3. **跨路径段匹配**
   - fuzzysort 天然支持跨路径段匹配
   - 例如输入 `docapi` 可以匹配 `Documents/api`
   - 这是 minimatch glob 无法实现的

### API 响应格式
```typescript
{
  matches: [
    {
      path: string,    // 完整路径
      score: number,   // 匹配分数
      indexes: number[] // 匹配字符索引（可用于高亮）
    }
  ]
}
```

### 参数调整
- `maxDepth`: 从 3 改为 5，搜索更深层的目录
- `maxResults`: 从 20 改为 100，返回更多候选结果
- `threshold: -10000`: 过滤掉质量太低的匹配

### 安全考虑
- 保持 `checkSensitivePath` 检查，跳过敏感目录
- 保持跳过隐藏目录（`.` 开头）
- 不改变原有的路径解析逻辑

## 测试验证

### 场景1: 跨路径段模糊匹配
```bash
curl "/api/files/dirs/search?q=docapi"
# 成功匹配 layoutlib-api 等跨段路径
```

### 场景2: 评分排序
- 结果按 score 降序排列
- 分数范围通常在 0.2-0.8 之间

### 场景3: 空查询
- 返回 `{ matches: [] }`

### 场景4: 搜索深度和结果数
- 最大返回 100 个结果
- 最大搜索深度 5 层

## Task 3: E2E 测试验证 (2026-04-16)

### 测试场景及结果

#### 场景1: 桌面端端到端测试 ✅
- 打开 SettingsDialog，在 PathInput 中输入 "doc"
- 下拉结果正确出现，包含 62 个选项
- 高亮标记 `<mark>` 正确渲染，共 186 个 mark 元素
- 高亮样式类名：`bg-primary/20 text-primary font-semibold rounded px-0.5`
- 键盘导航（ArrowDown）正常工作
- Enter 确认选择后，输入框值正确更新为选中路径
- 证据：`.sisyphus/evidence/task-3-desktop-search-results.png`
- 证据：`.sisyphus/evidence/task-3-keyboard-nav.png`

#### 场景2: 移动端端到端测试 ✅
- 模拟 375x812 设备视口
- 移动端 SettingsDialog 正常打开
- PathInput 输入 "doc" 后下拉结果正确出现
- 高亮标记在移动端正常渲染（186 个 mark 元素）
- 点击选择结果后，输入框值正确更新
- 下拉列表在移动端视口内正常显示，无溢出
- 证据：`.sisyphus/evidence/task-3-mobile-search-results.png`
- 证据：`.sisyphus/evidence/task-3-e2e-mobile.png`

#### 场景3: 空查询测试 ✅
- 清空输入框后，下拉列表正确隐藏
- 证据：`.sisyphus/evidence/task-3-empty-query.png`

#### 场景4: 键盘导航测试 ✅
- ArrowDown 键正确遍历选项
- Enter 键正确确认选择
- 输入框值更新为选中路径：`/home/yuexiaoliang/Android/Sdk/cmake/3.22.1/doc`
- 证据：`.sisyphus/evidence/task-3-keyboard-nav.png`

### 关键发现
1. **高亮功能正常工作**：`<mark>` 标签正确包裹匹配字符，样式类名正确
2. **模糊搜索响应迅速**：防抖后约 150ms 返回结果
3. **键盘导航完整**：ArrowDown/Enter 正常工作
4. **移动端适配良好**：下拉列表在 375px 视口内正常显示
5. **TypeScript 类型检查通过**：`npm run typecheck` 无错误
