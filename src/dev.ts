import { spawn } from 'child_process'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { WebSocketServer, WebSocket } from 'ws'
import { createServer } from 'http'
import { serve } from '@hono/node-server'
import { createFileRouter } from './server/api.js'
import { setupWatcher } from './server/watcher.js'
import { loadConfig } from './config.js'
import { IgnoreMatcher } from './server/ignore.js'

async function main() {
  const config = await loadConfig()
  config.port = 5788
  config.root = process.cwd() + '/workspace'

  const matcher = new IgnoreMatcher(config.root, {
    enableIgnoreFiles: config.ignore.enableIgnoreFiles,
    ignoreFileNames: config.ignore.ignoreFileNames,
    globalPatterns: config.ignore.patterns,
  })

  const app = new Hono()
  app.use('*', cors())

  const fileRouter = createFileRouter(config, matcher)
  app.route('/api/files', fileRouter)

  const clients = new Set<WebSocket>()

  const server = serve({
    fetch: app.fetch,
    port: 5788,
    hostname: 'localhost',
  })

  const wss = new WebSocketServer({ noServer: true })

  wss.on('connection', (ws, req) => {
    console.log(`[WS] New connection from: ${req.socket.remoteAddress}`)
    clients.add(ws)
    ws.on('close', () => clients.delete(ws))
    ws.on('error', (err) => console.log(`[WS] Error: ${err.message}`))
  })

  server.on('upgrade', (request, socket, head) => {
    console.log(`[WS] Upgrade request: ${request.url}`)
    if (request.url === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request)
      })
    } else {
      socket.destroy()
    }
  })

  setupWatcher(config, matcher, {
    onFileChange: (event: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir', filePath: string) => {
      const relativePath = filePath.replace(config.root, '')
      const message = JSON.stringify({ type: 'file:change', event, path: relativePath })
      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message)
        }
      })
    },
  })

  console.log('Backend server running on http://localhost:5788')

  const vite = spawn('npx', ['vite'], { stdio: 'inherit', shell: true })

  vite.on('close', (code) => {
    process.exit(code || 0)
  })
}

main().catch((e) => {
  console.error('Failed to start:', e)
  process.exit(1)
})