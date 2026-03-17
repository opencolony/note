# ColonyDoc

[简体中文](./README.zh.md) | English

A modern Markdown online editor with real-time preview, Mermaid diagrams, and LaTeX support.

> ✨ **Edit server-side Markdown files** - No upload needed, edit directly in your browser!

## Features

- **Server-side Editing** - Edit markdown files on server directly in browser
- **Real-time Preview** - Live rendering as you type
- **Mermaid Support** - Render flowcharts, sequence diagrams, Gantt charts, and more
- **LaTeX Formulas** - Full support for mathematical expressions
- **Code Highlighting** - Syntax highlighting for various programming languages
- **Dark Theme** - Follow system preference or manual toggle
- **Mobile Friendly** - Responsive design optimized for mobile devices
- **Real-time Sync** - WebSocket-based file change notifications

## Installation

```bash
npm install -g colonydoc
```

## Usage

### Start the server

```bash
colonydoc [options]
```

### Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--root` | `-r` | Root directory for documents | Current directory |
| `--port` | `-p` | Server port | `5787` |
| `--host` | `-h` | Server host | `0.0.0.0` |
| `--config` | `-c` | Config file path | `colonydoc.config.js` |
| `--help` | | Show help | |
| `--version` | | Show version | |

### Examples

```bash
# Start with default settings
colonydoc

# Specify root directory
colonydoc -r /path/to/docs

# Specify port
colonydoc -p 3000

# Use config file
colonydoc -c ./my-config.js

# Combine options
colonydoc -r ./docs -p 8080
```

## Configuration

Create a `colonydoc.config.js` file in your project root:

```javascript
export default {
  root: './docs',    // Root directory for documents
  port: 5787,        // Server port
  host: '0.0.0.0',   // Server host
}
```

## Development

```bash
# Clone the repository
git clone https://github.com/opencolony/colonydoc.git

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## Tech Stack

- **Backend**: Hono
- **Frontend**: React, Vite
- **UI Components**: Ant Design Mobile
- **Markdown**: @ant-design/x-markdown
- **Diagrams**: Mermaid
- **Build Tool**: Vite

## License

MIT

## Author

岳晓亮 <hi@yuexiaoliang.com>
