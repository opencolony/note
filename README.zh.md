# ColonyNote

[English](./README.md) | 简体中文

一个支持实时预览、Mermaid 图表和 LaTeX 公式的 Markdown 在线编辑器。

> **在线编辑服务端 Markdown 文件** - 无需上传下载，直接在浏览器中编辑！

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
npm install -g colonynote
```

## 使用方法

### 启动服务器

```bash
colonynote [选项]
```

### 选项

| 选项 | 别名 | 描述 | 默认值 |
|------|------|------|--------|
| `--dir` | `-d` | 目录 | 当前目录 |
| `--port` | `-p` | 服务器端口 | `5787` |
| `--host` | | 服务器地址 | `0.0.0.0` |
| `--config` | `-c` | 配置文件路径 | `colonynote.config.js` |
| `--help` | `-h` | 显示帮助 | |
| `--version` | | 显示版本 | |

### 示例

```bash
# 使用默认设置启动
colonynote

# 指定目录
colonynote -d /path/to/docs

# 指定端口
colonynote -p 3000

# 使用配置文件
colonynote -c ./my-config.js

# 组合选项
colonynote -d ./docs -p 8080
```

## 配置

在项目目录创建 `colonynote.config.js` 文件：

```javascript
export default {
  dirs: ['./docs'],  // 文档目录
  port: 5787,           // 服务器端口
  host: '0.0.0.0',      // 服务器地址
  allowedExtensions: ['.md', '.markdown'],  // 支持的文件扩展名
  theme: {
    default: 'system',  // 主题：light | dark | system
  },
  editor: {
    autosave: true,     // 自动保存
    debounceMs: 300,     // 保存防抖延迟
  },
}
```

## 开发

```bash
# 克隆仓库
git clone https://github.com/opencolony/note.git

# 安装依赖
npm install

# 启动开发服务器（后端 + 前端热更新）
npm run dev

# 仅前端开发（Vite 开发服务器，端口 5787）
npm run dev:frontend

# 仅后端开发（Hono 服务器，端口 5788）
npm run dev:backend

# 构建生产版本
npm run build

# 运行生产版本
npm start
```

## 技术栈

- **后端**: Hono, @hono/node-server, ws (WebSocket)
- **前端**: React 18, Vite, Tailwind CSS v4
- **UI 组件**: shadcn/ui (Radix UI)
- **编辑器**: TipTap 3, tiptap-markdown
- **图表**: Mermaid
- **LaTeX 公式**: KaTeX
- **图标**: lucide-react

## 许可证

MIT

## 作者

岳晓亮 <hi@yuexiaoliang.com>
