import { spawn } from 'child_process'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { WebSocketServer, WebSocket } from 'ws'
import { createServer } from 'http'
import { serve } from '@hono/node-server'
import fs from 'fs'
import path from 'path'
import { createFileRouter, createMutableConfigHolder } from './server/api.js'
import { setupWatcher } from './server/watcher.js'
import { loadConfig, getConfigFilePath, type DirConfig, type ColonynoteConfig } from './config.js'
import { IgnoreMatcher } from './server/ignore.js'

function collect(value: string, previous: string[]) {
  return previous.concat([value])
}

function findDirForPath(filePath: string, config: ColonynoteConfig): string {
  for (const dir of config.dirs) {
    if (filePath.startsWith(dir.path)) {
      return dir.path
    }
  }
  return config.dirs[0]?.path || ''
}

async function main() {
  const args = process.argv.slice(2)
  const cliDirs: string[] = []

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-d' || args[i] === '--dir') {
      if (args[i + 1]) {
        cliDirs.push(args[i + 1])
        i++
      }
    }
  }

  let config = await loadConfig('development')

  if (cliDirs.length > 0) {
    for (const rootPath of cliDirs) {
      const resolvedPath = path.resolve(rootPath)
      const exists = config.dirs.some((r) => path.resolve(r.path) === resolvedPath)
      if (exists) {
        console.warn(`Skipping duplicate root: ${rootPath}`)
        continue
      }
      config.dirs.unshift({ path: resolvedPath, isCli: true } as DirConfig)
    }
  }

  let matcher = new IgnoreMatcher(config.dirs.map(d => d.path), {
    globalPatterns: config.ignore.patterns,
  })

  const holder = createMutableConfigHolder(config, matcher)

  const app = new Hono()
  app.use('*', cors())

  const fileRouter = createFileRouter(holder, 'development')
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

  function broadcastWsMessage(message: string) {
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message)
      }
    })
  }

  let watcher = setupWatcher(holder.config, holder.matcher, {
    onFileChange: (rootPath: string, event: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir', filePath: string) => {
      const actualRootPath = findDirForPath(filePath, holder.config)
      const relativePath = '/' + filePath.replace(actualRootPath, '').replace(/^\/+/, '')
      const message = JSON.stringify({ type: 'file:change', event, path: relativePath, rootPath: actualRootPath })
      broadcastWsMessage(message)
    },
  })

  // Config file hot-reload
  const configFilePath = getConfigFilePath('development')
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
    loadConfig('development').then((loaded) => {
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