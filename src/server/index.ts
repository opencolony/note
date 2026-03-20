import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createFileRouter } from './api.js'
import { loadConfig } from '../config.js'
import { setupWatcher } from './watcher.js'
import { WebSocketServer, WebSocket } from 'ws'
import { createServer } from 'http'
import fs from 'fs'
import path from 'path'

async function main() {
  const config = await loadConfig()

  const app = new Hono()
  app.use('*', cors())

  const fileRouter = createFileRouter(config)
  app.route('/api/files', fileRouter)

  app.get('/assets/*', async (c) => {
    const filePath = c.req.path.replace('/assets', '')
    const fullPath = path.join(new URL('../client/assets', import.meta.url).pathname, filePath)
    try {
      const content = fs.readFileSync(fullPath)
      const ext = path.extname(filePath)
      const contentType = ext === '.js' ? 'application/javascript' : ext === '.css' ? 'text/css' : 'text/plain'
      return new Response(content, { headers: { 'Content-Type': contentType } })
    } catch {
      return c.notFound()
    }
  })

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

  const clients = new Set<WebSocket>()

  wss.on('connection', (ws) => {
    clients.add(ws)
    ws.on('close', () => clients.delete(ws))
  })

  setupWatcher(config, {
    onFileChange: (event, filePath) => {
      const relativePath = filePath.replace(config.root, '')
      const message = JSON.stringify({ type: 'file:change', event, path: relativePath })
      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
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