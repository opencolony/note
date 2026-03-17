# ColonyDoc

[English](./README.md) | 简体中文

一个支持实时预览、Mermaid 图表和 LaTeX 公式的 Markdown 在线编辑器。

> ✨ **在线编辑服务端 Markdown 文件** - 无需上传下载，直接在浏览器中编辑！

## 功能特性

- **服务端编辑** - 在浏览器中直接编辑服务器上的 Markdown 文件
- **实时预览** - 实时渲染输入内容
- **Mermaid 支持** - 渲染流程图、时序图、甘特图等
- **LaTeX 公式** - 完整支持数学公式
- **代码高亮** - 支持多种编程语言的语法高亮
- **深色主题** - 跟随系统偏好或手动切换
- **移动端适配** - 响应式设计，适配移动设备
- **实时同步** - 基于 WebSocket 的文件变更通知

## 安装

```bash
npm install -g colonydoc
```

## 使用方法

### 启动服务器

```bash
colonydoc [选项]
```

### 选项

| 选项 | 别名 | 描述 | 默认值 |
|--------|-------|-------------|---------|
| `--root` | `-r` | 文档根目录 | 当前目录 |
| `--port` | `-p` | 服务器端口 | `5787` |
| `--host` | `-h` | 服务器地址 | `0.0.0.0` |
| `--config` | `-c` | 配置文件路径 | `colonydoc.config.js` |
| `--help` | | 显示帮助 | |
| `--version` | | 显示版本 | |

### 示例

```bash
# 使用默认设置启动
colonydoc

# 指定根目录
colonydoc -r /path/to/docs

# 指定端口
colonydoc -p 3000

# 使用配置文件
colonydoc -c ./my-config.js

# 组合选项
colonydoc -r ./docs -p 8080
```

## 配置

在项目根目录创建 `colonydoc.config.js` 文件：

```javascript
export default {
  root: './docs',    // 文档根目录
  port: 5787,        // 服务器端口
  host: '0.0.0.0',   // 服务器地址
}
```

## 开发

```bash
# 克隆仓库
git clone https://github.com/opencolony/colonydoc.git

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 运行生产版本
npm start
```

## 技术栈

- **后端**: Hono
- **前端**: React, Vite
- **UI 组件**: Ant Design Mobile
- **Markdown**: @ant-design/x-markdown
- **图表**: Mermaid
- **构建工具**: Vite

## 许可证

MIT

## 作者

岳晓亮 <hi@yuexiaoliang.com>