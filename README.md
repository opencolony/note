# ColonyNote

[简体中文](./README.zh.md) | English

A modern Markdown online editor with real-time preview, Mermaid diagrams, and LaTeX support.

> **Edit server-side Markdown files** - No upload needed, edit directly in your browser!

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
npm install -g colonynote
```

## Usage

### Start the server

```bash
colonynote [options]
```

### Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--dir` | `-d` | Directory for documents | Current directory |
| `--port` | `-p` | Server port | `5787` |
| `--host` | | Server host | `0.0.0.0` |
| `--config` | `-c` | Config file path | `colonynote.config.js` |
| `--help` | `-h` | Show help | |
| `--version` | | Show version | |

### Examples

```bash
# Start with default settings
colonynote

# Specify directory
colonynote -d /path/to/docs

# Specify port
colonynote -p 3000

# Use config file
colonynote -c ./my-config.js

# Combine options
colonynote -d ./docs -p 8080
```

## Configuration

Create a `colonynote.config.js` file in your project directory:

```javascript
export default {
  dirs: ['./docs'],  // Directories for documents
  port: 5787,           // Server port
  host: '0.0.0.0',      // Server host
  allowedExtensions: ['.md', '.markdown'],  // Supported file extensions
  theme: {
    default: 'system',  // Theme: light | dark | system
  },
  editor: {
    autosave: true,     // Auto save
    debounceMs: 300,    // Save debounce delay
  },
}
```

## Development

```bash
# Clone the repository
git clone https://github.com/opencolony/note.git

# Install dependencies
npm install

# Start development server (backend + frontend with hot reload)
npm run dev

# Frontend only (Vite dev server, port 5787)
npm run dev:frontend

# Backend only (Hono server, port 5788)
npm run dev:backend

# Build for production
npm run build

# Run production build
npm start
```

## Tech Stack

- **Backend**: Hono, @hono/node-server, ws (WebSocket)
- **Frontend**: React 18, Vite, Tailwind CSS v4
- **UI Components**: shadcn/ui (Radix UI)
- **Editor**: TipTap 3, tiptap-markdown
- **Diagrams**: Mermaid
- **LaTeX**: KaTeX
- **Icons**: lucide-react

## License

MIT

## Author

岳晓亮 <hi@yuexiaoliang.com>
