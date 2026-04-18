#!/usr/bin/env node

import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createFileRouter } from '../dist/server/api.js'
import { loadConfig, DEFAULT_PORT, DEFAULT_HOST } from '../dist/config.js'
import { setupWatcher } from '../dist/server/watcher.js'
import { IgnoreMatcher } from '../dist/server/ignore.js'
import { WebSocketServer, WebSocket } from 'ws'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join, extname, resolve } from 'path'
import { Command } from 'commander'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'))

const program = new Command()

program
  .name('colonynote')
  .description('Markdown online editor')
  .version(pkg.version)
  .option('-d, --dir <path>', 'Root directory (can be specified multiple times)', collect, [])
  .option('-p, --port <number>', 'Server port', DEFAULT_PORT.toString())
  .option('--host <host>', 'Server host', DEFAULT_HOST)
  .parse()

const options = program.opts()

function collect(value, previous) {
  return previous.concat([value])
}

async function main() {
  const config = await loadConfig()

  if (options.dir && options.dir.length > 0) {
    for (const rootPath of options.dir) {
      const resolvedPath = resolve(rootPath)
      const exists = config.dirs.some((r) => resolve(r.path) === resolvedPath)
      if (exists) {
        console.warn(`Skipping duplicate dir: ${rootPath}`)
        continue
      }
      config.dirs.unshift({ path: resolvedPath, isCli: true })
    }
  }

  const port = parseInt(options.port, 10)
  const host = options.host

  const matcher = new IgnoreMatcher(config.dirs.map(d => d.path), {
    enableIgnoreFiles: config.ignore.enableIgnoreFiles,
    ignoreFileNames: config.ignore.ignoreFileNames,
    globalPatterns: config.ignore.patterns,
  })

  const app = new Hono()
  app.use('*', cors())

  const fileRouter = createFileRouter(config, matcher)
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
    port,
    hostname: host,
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

  setupWatcher(config, matcher, {
    onFileChange: (rootPath, event, filePath) => {
      const relativePath = filePath.replace(rootPath, '')
      const message = JSON.stringify({ type: 'file:change', event, path: relativePath, rootPath })
      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message)
        }
      })
    },
  })

  console.log(`\n  ColonyNote is running!\n`)
  console.log(`  Local:   http://localhost:${port}`)
  console.log(`  Network: http://${host}:${port}`)
  console.log(`  Dirs:    ${config.dirs.map(r => r.path).join(', ')}\n`)
}

main().catch((e) => {
  console.error('Failed to start:', e)
  process.exit(1)
})
