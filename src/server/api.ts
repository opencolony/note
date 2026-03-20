import { Hono } from 'hono'
import fs from 'fs/promises'
import path from 'path'
import type { ColonydocConfig } from '../config.js'

declare module 'hono' {
  interface ContextVariableMap {
    config: ColonydocConfig
  }
}

interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

function isAllowed(pathStr: string, config: ColonydocConfig): boolean {
  const resolved = path.resolve(pathStr)
  return resolved.startsWith(path.resolve(config.root))
}

function hasAllowedExtension(filename: string, extensions: string[]): boolean {
  const ext = path.extname(filename).toLowerCase()
  return extensions.includes(ext)
}

async function walkDirectory(dir: string, config: ColonydocConfig): Promise<FileNode[]> {
  const nodes: FileNode[] = []
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      
      const fullPath = path.join(dir, entry.name)
      
      if (entry.isDirectory()) {
        const children = await walkDirectory(fullPath, config)
        nodes.push({
          name: entry.name,
          path: fullPath.replace(config.root, '').replace(/\\/g, '/'),
          type: 'directory',
          children,
        })
      } else if (entry.isFile()) {
        if (hasAllowedExtension(entry.name, config.allowedExtensions)) {
          nodes.push({
            name: entry.name,
            path: fullPath.replace(config.root, '').replace(/\\/g, '/'),
            type: 'file',
          })
        }
      }
    }
  } catch (e) {
    // ignore errors
  }
  
  nodes.sort((a, b) => {
    if (a.type === 'directory' && b.type === 'file') return -1
    if (a.type === 'file' && b.type === 'directory') return 1
    return a.name.localeCompare(b.name)
  })
  
  return nodes
}

export function createFileRouter(config: ColonydocConfig) {
  const router = new Hono()

  router.get('/', async (c) => {
    try {
      const files = await walkDirectory(config.root, config)
      return c.json({ files })
    } catch (e) {
      return c.json({ error: 'Failed to read directory' }, 500)
    }
  })

  router.get('/content', async (c) => {
    const pathsParam = c.req.query('paths')
    if (!pathsParam) {
      return c.json({ error: 'paths parameter is required' }, 400)
    }

    const paths = pathsParam.split(',').filter(Boolean)
    const results: { path: string; name: string; content: string }[] = []

    for (const filePath of paths) {
      const fullPath = path.join(config.root, filePath)
      
      if (!isAllowed(fullPath, config)) {
        continue
      }

      try {
        const stat = await fs.stat(fullPath)
        if (stat.isFile()) {
          const content = await fs.readFile(fullPath, 'utf-8')
          results.push({
            path: filePath,
            name: path.basename(filePath),
            content,
          })
        }
      } catch (e) {
        // skip files that can't be read
      }
    }

    return c.json({ files: results })
  })

  router.get('/*', async (c) => {
    const filePath = c.req.path.replace(/^\/api\/files/, '') || '/'
    const fullPath = path.join(config.root, filePath)
    
    if (!isAllowed(fullPath, config)) {
      return c.json({ error: 'Access denied' }, 403)
    }
    
    try {
      const stat = await fs.stat(fullPath)
      if (stat.isDirectory()) {
        const files = await walkDirectory(fullPath, config)
        return c.json({ files })
      }
    } catch (e) {
      // not a directory
    }
    
    try {
      const content = await fs.readFile(fullPath, 'utf-8')
      return c.text(content)
    } catch (e) {
      return c.json({ error: 'File not found' }, 404)
    }
  })

  router.post('/*', async (c) => {
    const filePath = c.req.path.replace(/^\/api\/files/, '') || '/'
    const fullPath = path.join(config.root, filePath)
    
    if (!isAllowed(fullPath, config)) {
      return c.json({ error: 'Access denied' }, 403)
    }
    
    const contentType = c.req.header('Content-Type') || ''
    
    if (contentType.includes('application/json')) {
      const body = await c.req.json()
      
      if (body.type === 'create') {
        const parentPath = body.parentPath || ''
        const name = body.name
        const targetPath = path.join(config.root, parentPath, name)
        
        if (!isAllowed(targetPath, config)) {
          return c.json({ error: 'Access denied' }, 403)
        }
        
        try {
          if (body.isDirectory) {
            await fs.mkdir(targetPath, { recursive: true })
          } else {
            if (!hasAllowedExtension(name, config.allowedExtensions)) {
              return c.json({ error: 'File type not allowed' }, 400)
            }
            await fs.writeFile(targetPath, '', 'utf-8')
          }
          return c.json({ success: true, path: targetPath.replace(config.root, '') })
        } catch (e) {
          return c.json({ error: 'Failed to create' }, 500)
        }
      }
    }
    
    try {
      await fs.mkdir(path.dirname(fullPath), { recursive: true })
      const content = await c.req.text()
      await fs.writeFile(fullPath, content, 'utf-8')
      return c.json({ success: true })
    } catch (e) {
      return c.json({ error: 'Failed to save file' }, 500)
    }
  })

  router.delete('/*', async (c) => {
    const filePath = c.req.path.replace(/^\/api\/files/, '') || '/'
    const fullPath = path.join(config.root, filePath)
    
    if (!isAllowed(fullPath, config)) {
      return c.json({ error: 'Access denied' }, 403)
    }
    
    try {
      const stat = await fs.stat(fullPath)
      if (stat.isDirectory()) {
        await fs.rm(fullPath, { recursive: true })
      } else {
        await fs.unlink(fullPath)
      }
      return c.json({ success: true })
    } catch (e) {
      return c.json({ error: 'Failed to delete' }, 500)
    }
  })

  return router
}