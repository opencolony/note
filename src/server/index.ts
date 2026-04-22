import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createFileRouter, createMutableConfigHolder, type ConfigHolder } from './api.js'
import { loadConfig, getConfigFilePath, DEFAULT_PORT, DEFAULT_HOST, type ColonynoteConfig } from '../config.js'
import { setupWatcher } from './watcher.js'
import { IgnoreMatcher } from './ignore.js'
import { WebSocketServer, WebSocket } from 'ws'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const clientDir = path.join(__dirname, '..', 'client')

function findDirForPath(filePath: string, config: ColonynoteConfig): string {
  for (const dir of config.dirs) {
    if (filePath.startsWith(dir.path)) {
      return dir.path
    }
  }
  return config.dirs[0]?.path || ''
}

async function main() {
  const initialConfig = await loadConfig()
  let initialMatcher = new IgnoreMatcher(initialConfig.dirs.map(d => d.path), {
    globalPatterns: initialConfig.ignore.patterns,
  })

  const holder = createMutableConfigHolder(initialConfig, initialMatcher)

  const clients = new Set<WebSocket>()
  const wss = new WebSocketServer({ noServer: true })

  wss.on('connection', (ws) => {
    clients.add(ws)
    ws.on('close', () => clients.delete(ws))
  })

  const app = new Hono()
  app.use('*', cors())

  const fileRouter = createFileRouter(holder)
  app.route('/api/files', fileRouter)

  app.get('/assets/*', async (c) => {
    const filePath = c.req.path.replace('/assets', '')
    const fullPath = path.join(clientDir, 'assets', filePath)
    try {
      const content = fs.readFileSync(fullPath)
      const ext = path.extname(filePath)
      const contentType = ext === '.js' ? 'application/javascript' : ext === '.css' ? 'text/css' : 'text/plain'
      return new Response(content, { headers: { 'Content-Type': contentType } })
    } catch {
      return c.notFound()
    }
  })

  app.get('/logo.png', async (c) => {
    const fullPath = path.join(clientDir, 'logo.png')
    try {
      const content = fs.readFileSync(fullPath)
      return new Response(content, { headers: { 'Content-Type': 'image/png' } })
    } catch {
      return c.notFound()
    }
  })

  app.get('/favicon.ico', async (c) => {
    const fullPath = path.join(clientDir, 'favicon.ico')
    try {
      const content = fs.readFileSync(fullPath)
      return new Response(content, { headers: { 'Content-Type': 'image/x-icon' } })
    } catch {
      return c.notFound()
    }
  })

  app.get('*', async (c) => {
    const indexPath = path.join(clientDir, 'index.html')
    try {
      const content = fs.readFileSync(indexPath, 'utf-8')
      return new Response(content, {
        headers: { 'Content-Type': 'text/html' },
      })
    } catch {
      return c.notFound()
    }
  })

  const server = serve({
    fetch: app.fetch,
    port: DEFAULT_PORT,
    hostname: DEFAULT_HOST,
  })

  server.on('upgrade', (request, socket, head) => {
    if (request.url === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request)
      })
    }
  })

  function broadcastWsMessage(message: string) {
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message)
      }
    })
  }

  let watcher = setupWatcher(holder.config, initialMatcher, {
    onFileChange: (rootPath: string, event: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir', filePath: string) => {
      const actualRootPath = findDirForPath(filePath, holder.config)
      const relativePath = '/' + filePath.replace(actualRootPath, '').replace(/^\/+/, '')
      const message = JSON.stringify({ type: 'file:change', event, path: relativePath, rootPath: actualRootPath })
      broadcastWsMessage(message)
    },
  })

  // Config file hot-reload
  const configFilePath = getConfigFilePath()
  let reloadTimer: NodeJS.Timeout | null = null
  fs.watch(path.dirname(configFilePath), (eventType, filename) => {
    if (filename !== path.basename(configFilePath)) return
    if (reloadTimer) clearTimeout(reloadTimer)
    reloadTimer = setTimeout(() => {
      reloadTimer = null
      reloadConfig()
    }, 500)
  })

  function reloadConfig() {
    loadConfig().then((loaded) => {
      const newMatcher = new IgnoreMatcher(loaded.dirs.map(d => d.path), {
        globalPatterns: loaded.ignore.patterns,
      })
      holder.setConfig(loaded)
      holder.setMatcher(newMatcher)

      // Restart file watcher
      watcher.close()
      watcher = setupWatcher(loaded, newMatcher, {
        onFileChange: (rootPath: string, event: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir', filePath: string) => {
          const actualRootPath = findDirForPath(filePath, holder.config)
          const relativePath = '/' + filePath.replace(actualRootPath, '').replace(/^\/+/, '')
          const message = JSON.stringify({ type: 'file:change', event, path: relativePath, rootPath: actualRootPath })
          broadcastWsMessage(message)
        },
      })

      console.log(`[Config] Reloaded from ${configFilePath}`)
      broadcastWsMessage(JSON.stringify({ type: 'config:reload' }))
    }).catch((e) => {
      console.warn('[Config] Failed to reload config:', e)
    })
  }

  console.log(`\n  ColonyNote is running!\n`)
  console.log(`  Local:   http://localhost:${DEFAULT_PORT}`)
  console.log(`  Network: http://${DEFAULT_HOST}:${DEFAULT_PORT}`)
  console.log(`  Dirs:   ${holder.config.dirs.map(r => r.path).join(', ')}\n`)
}

main().catch((e) => {
  console.error('Failed to start:', e)
  process.exit(1)
})