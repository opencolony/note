import { Hono } from 'hono'
import fs from 'fs/promises'
import path from 'path'
import type { ColonynoteConfig } from '../config.js'
import { saveUserConfig } from '../config.js'
import { IgnoreMatcher } from './ignore.js'

declare module 'hono' {
  interface ContextVariableMap {
    config: ColonynoteConfig
  }
}

interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

function isAllowed(pathStr: string, config: ColonynoteConfig): boolean {
  const resolved = path.resolve(pathStr)
  return resolved.startsWith(path.resolve(config.root))
}

function hasAllowedExtension(filename: string, extensions: string[]): boolean {
  const ext = path.extname(filename).toLowerCase()
  return extensions.includes(ext)
}

async function walkDirectory(dir: string, config: ColonynoteConfig, matcher: IgnoreMatcher): Promise<FileNode[]> {
  const nodes: FileNode[] = []

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      const isDir = entry.isDirectory()

      if (!config.showHiddenFiles && entry.name.startsWith('.')) continue
      if (matcher.isIgnored(fullPath, isDir)) continue

      if (isDir) {
        const children = await walkDirectory(fullPath, config, matcher)
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

export function createFileRouter(config: ColonynoteConfig, matcher: IgnoreMatcher) {
  const router = new Hono()

  router.get('/config', async (c) => {
    return c.json({
      showHiddenFiles: config.showHiddenFiles,
      allowedExtensions: config.allowedExtensions,
      ignore: config.ignore,
    })
  })

  router.patch('/config', async (c) => {
    try {
      const body = await c.req.json()
      const allowedFields = ['showHiddenFiles', 'allowedExtensions', 'ignore']
      const updates: { showHiddenFiles?: boolean; allowedExtensions?: string[]; ignore?: { enableIgnoreFiles?: boolean; ignoreFileNames?: string[]; patterns?: string[] } } = {}

      for (const key of allowedFields) {
        if (key in body) {
          (updates as Record<string, unknown>)[key] = body[key]
        }
      }

      saveUserConfig(config.root, updates)

      if (typeof updates.showHiddenFiles === 'boolean') {
        config.showHiddenFiles = updates.showHiddenFiles
      }
      if (Array.isArray(updates.allowedExtensions)) {
        config.allowedExtensions = updates.allowedExtensions
      }
      if (updates.ignore) {
        if (typeof updates.ignore.enableIgnoreFiles === 'boolean') {
          config.ignore.enableIgnoreFiles = updates.ignore.enableIgnoreFiles
        }
        if (Array.isArray(updates.ignore.ignoreFileNames)) {
          config.ignore.ignoreFileNames = updates.ignore.ignoreFileNames
        }
        if (Array.isArray(updates.ignore.patterns)) {
          config.ignore.patterns = updates.ignore.patterns
          matcher.updateGlobalPatterns(updates.ignore.patterns)
        }
        matcher.clearCache()
      }

      return c.json({ success: true, config: { showHiddenFiles: config.showHiddenFiles, allowedExtensions: config.allowedExtensions, ignore: config.ignore } })
    } catch (e) {
      console.error('Failed to update config:', e)
      return c.json({ error: 'Failed to update config' }, 500)
    }
  })

  router.get('/', async (c) => {
    try {
      const files = await walkDirectory(config.root, config, matcher)
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
        const files = await walkDirectory(fullPath, config, matcher)
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

  router.put('/*', async (c) => {
    const filePath = c.req.path.replace(/^\/api\/files/, '') || '/'
    const fullPath = path.join(config.root, filePath)

    if (!isAllowed(fullPath, config)) {
      return c.json({ error: 'Access denied' }, 403)
    }

    try {
      const body = await c.req.json()
      const { oldPath, newPath, isDirectory } = body

      if (!oldPath || !newPath) {
        return c.json({ error: 'oldPath and newPath are required' }, 400)
      }

      const oldFullPath = path.join(config.root, oldPath)
      const newFullPath = path.join(config.root, newPath)

      if (!isAllowed(oldFullPath, config) || !isAllowed(newFullPath, config)) {
        return c.json({ error: 'Access denied' }, 403)
      }

      if (isDirectory) {
        const stat = await fs.stat(oldFullPath)
        if (!stat.isDirectory()) {
          return c.json({ error: 'Source is not a directory' }, 400)
        }
        await fs.rename(oldFullPath, newFullPath)
      } else {
        const ext = path.extname(newPath).toLowerCase()
        if (!hasAllowedExtension(newPath, config.allowedExtensions)) {
          return c.json({ error: 'File type not allowed' }, 400)
        }
        await fs.rename(oldFullPath, newFullPath)
      }

      return c.json({ success: true, newPath })
    } catch (e) {
      console.error('Rename/Move error:', e)
      return c.json({ error: 'Failed to rename or move' }, 500)
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