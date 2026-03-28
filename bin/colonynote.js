#!/usr/bin/env node

import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createFileRouter } from '../dist/server/api.js'
import { loadConfig } from '../dist/config.js'
import { setupWatcher } from '../dist/server/watcher.js'
import { WebSocketServer, WebSocket } from 'ws'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join, extname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'))

const argv = process.argv.slice(2)
const args = {}
const validOptions = new Set(['root', 'r', 'port', 'p', 'host', 'config', 'c', 'help', 'h', 'version'])

for (let i = 0; i < argv.length; i++) {
  const arg = argv[i]
  if (arg.startsWith('--')) {
    const key = arg.slice(2)
    const next = argv[i + 1]
    if (next && !next.startsWith('-')) {
      args[key] = next
      i++
    } else {
      args[key] = true
    }
  } else if (arg.startsWith('-')) {
    const key = arg.slice(1)
    const next = argv[i + 1]
    if (next && !next.startsWith('-')) {
      args[key] = next
      i++
    } else {
      args[key] = true
    }
  } else {
    console.error(`Unknown argument: ${arg}`)
    console.error(`Run 'colonynote --help' for usage.`)
    process.exit(1)
  }
}

for (const key of Object.keys(args)) {
  if (!validOptions.has(key)) {
    console.error(`Unknown option: --${key}`)
    console.error(`Run 'colonynote --help' for usage.`)
    process.exit(1)
  }
}

if (args.h || args.help) {
  console.log(`
colonynote - Markdown online editor

Usage:
  colonynote [options]

Options:
  -r, --root <path>      Root directory (default: current directory)
  -p, --port <number>    Server port (default: 5787)
  --host <host>          Server host (default: 0.0.0.0)
  -c, --config <path>    Config file path
  -h, --help             Show this help
  --version              Show version
`)
  process.exit(0)
}

if (args.version) {
  console.log(`colonynote v${pkg.version}`)
  process.exit(0)
}

async function main() {
  const config = await loadConfig(args.config)

  if (args.r || args.root) {
    config.root = args.r || args.root
  }
  if (args.p || args.port) {
    config.port = parseInt(args.p || args.port, 10)
  }
  if (args.host) {
    config.host = args.host
  }

  const app = new Hono()
  app.use('*', cors())

  const fileRouter = createFileRouter(config)
  app.route('/api/files', fileRouter)

  const publicDir = join(dirname(fileURLToPath(import.meta.url)), '../dist/client')

  app.get('/assets/*', async (c) => {
    const filePath = c.req.path.replace('/assets', '')
    const fullPath = join(publicDir, 'assets', filePath)
    if (!existsSync(fullPath)) {
      return c.notFound()
    }
    const content = readFileSync(fullPath)
    const ext = extname(filePath)
    const contentType = ext === '.js' ? 'application/javascript' : ext === '.css' ? 'text/css' : 'text/plain'
    return new Response(content, { headers: { 'Content-Type': contentType } })
  })

  app.get('/logo.png', async (c) => {
    const fullPath = join(publicDir, 'logo.png')
    if (!existsSync(fullPath)) {
      return c.notFound()
    }
    const content = readFileSync(fullPath)
    return new Response(content, { headers: { 'Content-Type': 'image/png' } })
  })

  app.get('/favicon.ico', async (c) => {
    const fullPath = join(publicDir, 'favicon.ico')
    if (!existsSync(fullPath)) {
      return c.notFound()
    }
    const content = readFileSync(fullPath)
    return new Response(content, { headers: { 'Content-Type': 'image/x-icon' } })
  })

  app.get('*', async (c) => {
    const indexPath = join(publicDir, 'index.html')
    if (existsSync(indexPath)) {
      const content = readFileSync(indexPath, 'utf-8')
      return new Response(content, {
        headers: { 'Content-Type': 'text/html' },
      })
    }
    return c.notFound()
  })

  const server = serve({
    fetch: app.fetch,
    port: config.port,
    hostname: config.host,
  })

  const clients = new Set()
  const wss = new WebSocketServer({ noServer: true })

  wss.on('connection', (ws) => {
    clients.add(ws)
    ws.on('close', () => clients.delete(ws))
  })

  server.on('upgrade', (request, socket, head) => {
    if (request.url === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request)
      })
    }
  })

  setupWatcher(config, {
    onFileChange: (event, path) => {
      const relativePath = path.replace(config.root, '')
      const message = JSON.stringify({ type: 'file:change', event, path: relativePath })
      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message)
        }
      })
    },
  })

  console.log(`\n  ColonyNote is running!\n`)
  console.log(`  Local:   http://localhost:${config.port}`)
  console.log(`  Network: http://${config.host}:${config.port}`)
  console.log(`  Root:    ${config.root}\n`)
}

main().catch((e) => {
  console.error('Failed to start:', e)
  process.exit(1)
})