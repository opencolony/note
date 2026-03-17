#!/usr/bin/env node

import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createFileRouter } from '../dist/server/api.js'
import { loadConfig } from '../dist/config.js'
import { setupWatcher } from '../dist/server/watcher.js'
import { WebSocketServer } from 'ws'
import { createServer } from 'http'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'))

const argv = process.argv.slice(2)
const args = {}

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
  }
}

if (args.h || args.help) {
  console.log(`
colonydoc - Markdown online editor

Usage:
  colonydoc [options]

Options:
  -r, --root <path>      Root directory (default: current directory)
  -p, --port <number>    Server port (default: 5787)
  -h, --host <host>      Server host (default: 0.0.0.0)
  -c, --config <path>    Config file path
  --help                 Show this help
  --version              Show version
`)
  process.exit(0)
}

if (args.version) {
  console.log(`colonydoc v${pkg.version}`)
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
  if (args.h || args.host) {
    config.host = args.h || args.host
  }

  const app = new Hono()
  app.use('*', cors())

  const fileRouter = createFileRouter(config)
  app.route('/api/files', fileRouter)

  const publicDir = new URL('../dist/client', import.meta.url).pathname
  app.use('/*', serveStatic({ root: publicDir }))
  app.get('*', async (c) => {
    return c.html(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>ColonyDoc</title>
  <link rel="stylesheet" href="/assets/index.css">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/assets/index.js"></script>
</body>
</html>`)
  })

  const httpServer = createServer()
  const wss = new WebSocketServer({ server: httpServer })

  const clients = new Set()

  wss.on('connection', (ws) => {
    clients.add(ws)
    ws.on('close', () => clients.delete(ws))
  })

  setupWatcher(config, {
    onFileChange: (event, path) => {
      const message = JSON.stringify({ type: 'file:change', event, path })
      clients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(message)
        }
      })
    },
  })

  serve({ fetch: app.fetch, port: config.port, hostname: config.host })

  httpServer.on('upgrade', (request, socket, head) => {
    if (request.url === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request)
      })
    }
  })

  console.log(`\n  ColonyDoc is running!\n`)
  console.log(`  Local:   http://localhost:${config.port}`)
  console.log(`  Network: http://${config.host}:${config.port}`)
  console.log(`  Root:    ${config.root}\n`)
}

main().catch((e) => {
  console.error('Failed to start:', e)
  process.exit(1)
})