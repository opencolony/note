import { Hono } from 'hono'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import os from 'os'
import { execFile, execFileSync } from 'child_process'
import type { ColonynoteConfig, DirConfig } from '../config.js'
import { saveConfig, DEFAULT_SENSITIVE_PATHS } from '../config.js'
import { IgnoreMatcher } from './ignore.js'
import { minimatch } from 'minimatch'
import fuzzysort from 'fuzzysort'

declare module 'hono' {
  interface ContextVariableMap {
    config: ColonynoteConfig
  }
}

interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  rootPath: string
  children?: FileNode[]
}

function isAllowed(pathStr: string, config: ColonynoteConfig): boolean {
  const resolved = path.resolve(pathStr)
  return config.dirs.some(dir => {
    const dirPath = path.resolve(dir.path)
    return resolved === dirPath || resolved.startsWith(dirPath + path.sep)
  })
}

function validateRoot(dirPath: string, config: ColonynoteConfig): string | null {
  const resolved = path.resolve(dirPath)
  const dir = config.dirs.find(r => path.resolve(r.path) === resolved)
  return dir ? path.resolve(dir.path) : null
}

function checkSensitivePath(inputPath: string): boolean {
  const basename = path.basename(inputPath)
  for (const pattern of DEFAULT_SENSITIVE_PATHS) {
    if (minimatch(basename, pattern, { nocase: true, dot: true })) return true
  }
  return false
}

function checkNestedPath(newPath: string, existingDirs: DirConfig[]): {
  isNested: boolean
  conflictWith?: string
  reason?: 'child' | 'parent' | 'duplicate'
} {
  const resolved = path.resolve(newPath)
  for (const dir of existingDirs) {
    const existing = path.resolve(dir.path)
    if (resolved === existing) return { isNested: true, conflictWith: dir.path, reason: 'duplicate' }
    if (resolved.startsWith(existing + path.sep)) return { isNested: true, conflictWith: dir.path, reason: 'child' }
    if (existing.startsWith(resolved + path.sep)) return { isNested: true, conflictWith: dir.path, reason: 'parent' }
  }
  return { isNested: false }
}

function findRootForPath(filePath: string, config: ColonynoteConfig): string | null {
  for (const dir of config.dirs) {
    const dirPath = path.resolve(dir.path)
    const relativePath = filePath.startsWith('/') ? filePath.slice(1) : filePath
    const fullPath = path.join(dirPath, relativePath)
    if ((fullPath.startsWith(dirPath + path.sep) || fullPath === dirPath) && existsSync(fullPath)) {
      return dirPath
    }
  }
  return null
}

function hasAllowedExtension(filename: string, extensions: string[]): boolean {
  const ext = path.extname(filename).toLowerCase()
  return extensions.includes(ext)
}

async function walkDirectory(dir: string, dirPath: string, config: ColonynoteConfig, matcher: IgnoreMatcher, visited: Set<string> = new Set()): Promise<FileNode[]> {
  const nodes: FileNode[] = []

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      let isDir = entry.isDirectory()
      let isFile = entry.isFile()

      // 处理符号链接：跟随链接获取实际类型
      if (entry.isSymbolicLink()) {
        try {
          const stat = await fs.stat(fullPath)
          isDir = stat.isDirectory()
          isFile = stat.isFile()
        } catch {
          // 符号链接目标不存在或无法访问，跳过
          continue
        }
      }

      if (!config.showHiddenFiles && entry.name.startsWith('.')) continue
      if (matcher.isIgnored(fullPath, isDir)) continue

      if (isDir) {
        // 对符号链接目录进行循环检测（防止符号链接指向祖先目录导致无限递归）
        if (entry.isSymbolicLink()) {
          let realPath: string
          try {
            realPath = await fs.realpath(fullPath)
          } catch {
            realPath = fullPath
          }
          if (visited.has(realPath)) continue
          visited.add(realPath)
        }
        const children = await walkDirectory(fullPath, dirPath, config, matcher, visited)
        const relativePath = path.relative(dirPath, fullPath).replace(/\\/g, '/')
        nodes.push({
          name: entry.name,
          path: relativePath ? '/' + relativePath : '/',
          type: 'directory',
          rootPath: dirPath,
          children,
        })
      } else if (isFile) {
        if (hasAllowedExtension(entry.name, config.allowedExtensions)) {
          const relativePath = path.relative(dirPath, fullPath).replace(/\\/g, '/')
          nodes.push({
            name: entry.name,
            path: relativePath ? '/' + relativePath : '/',
            type: 'file',
            rootPath: dirPath,
          })
        }
      }
    }
  } catch (e) {
    // Re-throw error if this is the root directory, otherwise ignore
    if (dir === dirPath) {
      throw e
    }
  }

  nodes.sort((a, b) => {
    if (a.type === 'directory' && b.type === 'file') return -1
    if (a.type === 'file' && b.type === 'directory') return 1
    return a.name.localeCompare(b.name)
  })

  return nodes
}

export interface ConfigHolder {
  get config(): ColonynoteConfig
  get matcher(): IgnoreMatcher
  setConfig(config: ColonynoteConfig): void
  setMatcher(matcher: IgnoreMatcher): void
}

export function createMutableConfigHolder(initialConfig: ColonynoteConfig, initialMatcher: IgnoreMatcher): ConfigHolder {
  let config = initialConfig
  let matcher = initialMatcher
  return {
    get config() { return config },
    get matcher() { return matcher },
    setConfig(c: ColonynoteConfig) { config = c },
    setMatcher(m: IgnoreMatcher) { matcher = m },
  }
}

export function createFileRouter(holder: ConfigHolder, env: 'development' | 'production' = 'production') {
  const router = new Hono()

  function getConfig() { return holder.config }
  function getMatcher() { return holder.matcher }

  // Server-side file tree cache to avoid re-walking on every request
  interface CacheEntry {
    groups: any[]
    timestamp: number
    configHash: string
  }
  let treeCache: CacheEntry | null = null
  const CACHE_TTL_MS = 3000

  function computeConfigHash(): string {
    const config = getConfig()
    return JSON.stringify({
      dirs: config.dirs.map(d => ({ path: d.path, name: d.name })),
      showHiddenFiles: config.showHiddenFiles,
      allowedExtensions: config.allowedExtensions,
      ignore: config.ignore,
    })
  }

  function invalidateTreeCache() {
    treeCache = null
  }

  async function getFileGroups(): Promise<any[]> {
    const config = getConfig()
    const matcher = getMatcher()
    const now = Date.now()
    const hash = computeConfigHash()
    if (treeCache && (now - treeCache.timestamp) < CACHE_TTL_MS && treeCache.configHash === hash) {
      return treeCache.groups
    }

    const groups = await Promise.all(
      config.dirs.map(async (dir) => {
        try {
          return {
            root: dir,
            files: await walkDirectory(dir.path, dir.path, config, matcher)
          }
        } catch (e) {
          return {
            root: dir,
            files: [],
            error: e instanceof Error ? e.message : 'Failed to read directory'
          }
        }
      })
    )

    treeCache = { groups, timestamp: now, configHash: hash }
    return groups
  }

  router.get('/config', async (c) => {
    const config = getConfig()
    return c.json({
      showHiddenFiles: config.showHiddenFiles,
      allowedExtensions: config.allowedExtensions,
      ignore: config.ignore,
    })
  })

  router.patch('/config', async (c) => {
    const config = getConfig()
    const matcher = getMatcher()
    try {
      const body = await c.req.json()
      const allowedFields = ['showHiddenFiles', 'allowedExtensions', 'ignore']
      const updates: { showHiddenFiles?: boolean; allowedExtensions?: string[]; ignore?: { patterns?: string[] } } = {}

      for (const key of allowedFields) {
        if (key in body) {
          (updates as Record<string, unknown>)[key] = body[key]
        }
      }

      // 先更新内存中的配置，再保存到文件
      if (typeof updates.showHiddenFiles === 'boolean') {
        config.showHiddenFiles = updates.showHiddenFiles
      }
      if (Array.isArray(updates.allowedExtensions)) {
        config.allowedExtensions = updates.allowedExtensions
      }
      if (updates.ignore) {
        if (Array.isArray(updates.ignore.patterns)) {
          config.ignore.patterns = updates.ignore.patterns
          matcher.updateGlobalPatterns(updates.ignore.patterns)
        }
      }

      saveConfig(config, env)
      invalidateTreeCache()

      return c.json({ success: true, config: { showHiddenFiles: config.showHiddenFiles, allowedExtensions: config.allowedExtensions, ignore: config.ignore } })
    } catch (e) {
      console.error('Failed to update config:', e)
      return c.json({ error: 'Failed to update config' }, 500)
    }
  })

  // Dir management routes
  router.get('/dirs', async (c) => {
    const config = getConfig()
    return c.json({ dirs: config.dirs })
  })

  router.post('/dirs', async (c) => {
    const config = getConfig()
    try {
      const body = await c.req.json()
      const newPath = body.path
      if (!newPath) return c.json({ error: 'Path is required' }, 400)

      try {
        const stat = await fs.stat(newPath)
        if (!stat.isDirectory()) return c.json({ error: 'Path must be a directory' }, 400)
      } catch {
        return c.json({ error: 'Path does not exist' }, 400)
      }

      if (checkSensitivePath(newPath)) return c.json({ error: 'Sensitive path not allowed' }, 400)

      const nested = checkNestedPath(newPath, config.dirs)
      if (nested.isNested) return c.json({ error: 'Nested path not allowed', conflictWith: nested.conflictWith, reason: nested.reason }, 400)

      const newDir: DirConfig = { path: path.resolve(newPath), exclude: body.exclude, name: body.name }
      config.dirs.push(newDir)
      saveConfig(config, env)
      invalidateTreeCache()
      return c.json({ success: true, dir: newDir })
    } catch (e) {
      return c.json({ error: 'Failed to add dir' }, 500)
    }
  })

  router.delete('/dirs', async (c) => {
    const config = getConfig()
    const pathParam = c.req.query('path')
    if (!pathParam) return c.json({ error: 'path parameter required' }, 400)

    const idx = config.dirs.findIndex(r => path.resolve(r.path) === path.resolve(pathParam))
    if (idx === -1) return c.json({ error: 'Dir not found' }, 404)

    config.dirs.splice(idx, 1)
    saveConfig(config, env)
    invalidateTreeCache()
    return c.json({ success: true })
  })

  router.patch('/dirs', async (c) => {
    const config = getConfig()
    try {
      const body = await c.req.json()
      const { path: dirPath, exclude, name } = body
      if (!dirPath) return c.json({ error: 'Path is required' }, 400)

      const dir = config.dirs.find(r => path.resolve(r.path) === path.resolve(dirPath))
      if (!dir) return c.json({ error: 'Dir not found' }, 404)

      if (exclude !== undefined) dir.exclude = exclude
      if (name !== undefined) dir.name = name
      saveConfig(config, env)
      invalidateTreeCache()
      return c.json({ success: true, dir })
    } catch (e) {
      return c.json({ error: 'Failed to update dir' }, 500)
    }
  })

  router.get('/dirs/browse', async (c) => {
    const rawPath = c.req.query('path') || ''
    if (!rawPath.trim()) return c.json({ dirs: [], currentPath: '' })

    let resolvedPath: string
    if (rawPath === '~' || rawPath.startsWith('~/')) {
      resolvedPath = path.join(os.homedir(), rawPath.slice(1))
    } else {
      resolvedPath = path.resolve(rawPath)
    }

    try {
      const stat = await fs.stat(resolvedPath)
      if (!stat.isDirectory()) {
        return c.json({ dirs: [], currentPath: rawPath })
      }

      const entries = await fs.readdir(resolvedPath, { withFileTypes: true })
      const dirs: string[] = []

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue
        const fullPath = path.join(resolvedPath, entry.name)
        if (entry.isDirectory() && !checkSensitivePath(fullPath)) {
          dirs.push(fullPath)
        }
      }

      dirs.sort((a, b) => path.basename(a).localeCompare(path.basename(b)))

      return c.json({ dirs, currentPath: rawPath })
    } catch {
      return c.json({ dirs: [], currentPath: rawPath })
    }
  })

  router.get('/dirs/search', async (c) => {
    const config = getConfig()
    const query = c.req.query('q') || ''
    const rawRoot = c.req.query('root')
    const mode = c.req.query('mode') || 'fuzzy'

    let searchRoot: string
    if (rawRoot === '~' || rawRoot === '') {
      searchRoot = os.homedir()
    } else if (rawRoot === '/') {
      searchRoot = '/'
    } else if (rawRoot && rawRoot.startsWith('~/')) {
      searchRoot = path.join(os.homedir(), rawRoot.slice(2))
    } else if (rawRoot && path.isAbsolute(rawRoot)) {
      searchRoot = path.normalize(rawRoot)
    } else if (rawRoot) {
      // Relative path like 'projects' → resolve relative to home
      searchRoot = path.join(os.homedir(), rawRoot)
    } else {
      searchRoot = os.homedir()
    }

    // Browse mode: list direct children directories
    if (mode === 'browse') {
      try {
        const stat = await fs.stat(searchRoot)
        if (!stat.isDirectory()) {
          return c.json({ matches: [] })
        }

        const entries = await fs.readdir(searchRoot, { withFileTypes: true })
        const dirs: { path: string; score: number; indexes: number[] }[] = []

        for (const entry of entries) {
          if (entry.name.startsWith('.')) continue
          const fullPath = path.join(searchRoot, entry.name)
          if (entry.isDirectory() && !checkSensitivePath(fullPath)) {
            dirs.push({ path: fullPath, score: 0, indexes: [] })
          }
        }

        dirs.sort((a, b) => path.basename(a.path).localeCompare(path.basename(b.path)))

        return c.json({ matches: dirs })
      } catch {
        return c.json({ matches: [] })
      }
    }

    // Search mode requires non-empty query
    if (!query.trim()) return c.json({ matches: [] })

    const MAX_DEPTH = 5
    const MAX_CANDIDATES = 10000
    const MAX_RESULTS = 100

    const candidates: { name: string; fullPath: string }[] = []

    async function traverse(dir: string, depth: number): Promise<void> {
      if (depth > MAX_DEPTH || candidates.length >= MAX_CANDIDATES) return
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true })
        const subDirs: string[] = []
        for (const entry of entries) {
          if (entry.name.startsWith('.')) continue
          const fullPath = path.join(dir, entry.name)

          // Check if path matches any ignore pattern
          const isIgnored = config.ignore?.patterns?.some(pattern => {
            const normalizedPattern = pattern.endsWith('/') ? pattern.slice(0, -1) : pattern
            return minimatch(fullPath, normalizedPattern, { dot: true, matchBase: true })
          })
          if (isIgnored) continue

          if (entry.isDirectory() && !checkSensitivePath(fullPath)) {
            subDirs.push(fullPath)
          }
        }
        for (const subDir of subDirs) {
          if (candidates.length >= MAX_CANDIDATES) break
          candidates.push({ name: path.basename(subDir), fullPath: subDir })
        }
        for (const subDir of subDirs) {
          if (candidates.length >= MAX_CANDIDATES) break
          await traverse(subDir, depth + 1)
        }
      } catch {}
    }

    await traverse(searchRoot, 0)

    let results: { obj: { name: string; fullPath: string }; score: number; indexes: number[] }[]

    if (mode === 'prefix') {
      const lowerQuery = query.toLowerCase()
      results = candidates
        .filter(c => c.name.toLowerCase().startsWith(lowerQuery))
        .slice(0, MAX_RESULTS)
        .map(c => ({
          obj: c,
          score: 0,
          indexes: Array.from({ length: query.length }, (_, i) => i)
        }))
    } else {
      results = fuzzysort.go(query, candidates, {
        key: 'name',
        limit: MAX_RESULTS,
        threshold: 0.5,
      }) as unknown as typeof results
    }

    const matches = results.map(r => ({
      path: r.obj.fullPath,
      score: r.score,
      indexes: r.indexes,
    }))

    return c.json({ matches })
  })

  // Lazy-load directory children on demand (performance optimization)
  router.get('/children', async (c) => {
    const config = getConfig()
    const matcher = getMatcher()
    const dirPathParam = c.req.query('dirPath')
    const rootParam = c.req.query('root')
    if (!dirPathParam) return c.json({ error: 'dirPath is required' }, 400)

    let dirPath: string | null
    if (rootParam) {
      dirPath = validateRoot(rootParam, config)
      if (!dirPath) return c.json({ error: 'Invalid root' }, 400)
    } else {
      dirPath = findRootForPath(dirPathParam, config)
      if (!dirPath) return c.json({ error: 'Access denied' }, 403)
    }

    const relativePath = dirPathParam.startsWith('/') ? dirPathParam.slice(1) : dirPathParam
    const fullPath = path.join(dirPath, relativePath)

    if (!isAllowed(fullPath, config)) return c.json({ error: 'Access denied' }, 403)

    try {
      const stat = await fs.stat(fullPath)
      if (!stat.isDirectory()) return c.json({ error: 'Not a directory' }, 400)
      const children = await walkDirectory(fullPath, dirPath, config, matcher)
      return c.json({ children })
    } catch (e) {
      return c.json({ error: 'Failed to read directory' }, 500)
    }
  })

  router.get('/', async (c) => {
    try {
      const groups = await getFileGroups()
      return c.json({ groups })
    } catch (e) {
      return c.json({ error: 'Failed to read directory' }, 500)
    }
  })

  router.get('/content', async (c) => {
    const config = getConfig()
    const pathsParam = c.req.query('paths')
    if (!pathsParam) {
      return c.json({ error: 'paths parameter is required' }, 400)
    }

    const paths = pathsParam.split(',').filter(Boolean)
    const results: { path: string; name: string; content: string }[] = []

    for (const filePath of paths) {
      const rootParam = c.req.query('root')
      let dirPath: string | null

      if (rootParam) {
        dirPath = path.resolve(rootParam)
        if (!config.dirs.some(r => path.resolve(r.path) === dirPath)) {
          return c.json({ error: 'Invalid root' }, 400)
        }
      } else {
        dirPath = findRootForPath(filePath, config)
      }

      if (!dirPath) return c.json({ error: 'Access denied' }, 403)
      const relativePath = filePath.startsWith('/') ? filePath.slice(1) : filePath
      const fullPath = path.join(dirPath, relativePath)

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

  router.get('/search', async (c) => {
    const config = getConfig()
    const query = c.req.query('q')
    if (!query || !query.trim()) {
      return c.json({ results: [] })
    }

    const limit = parseInt(c.req.query('limit') || '50', 10)
    const rootParam = c.req.query('root')

    let targetDirs: DirConfig[]
    if (rootParam) {
      const validatedRoot = validateRoot(rootParam, config)
      if (!validatedRoot) {
        return c.json({ error: 'Invalid root' }, 400)
      }
      targetDirs = config.dirs.filter(d => path.resolve(d.path) === validatedRoot)
    } else {
      targetDirs = config.dirs
    }

    const results: Array<{ path: string; name: string; rootPath: string; rootName: string; matchedLine?: string; matchedContent?: string }> = []

    for (const dir of targetDirs) {
      if (results.length >= limit) break

      const dirPath = path.resolve(dir.path)
      const dirName = dir.name || path.basename(dirPath)

      try {
        const { stdout, stderr } = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
          execFile('rg', [
            '--json',
            '--ignore-case',
            '--max-count', String(Math.min(limit, 5)),
            '--line-number',
            '--context', '1',
            '-g', '*.md',
            query,
            dirPath,
          ], { timeout: 5000, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
            if (error && error.code !== 1) {
              reject(error)
            } else {
              resolve({ stdout, stderr })
            }
          })
        })

        if (stderr.includes('no matches')) continue

        let currentPath = ''
        let currentRelativePath = ''
        let lines: Array<{ line: string; lineNumber: number; subMatches: Array<{ start: number; end: number }> }> = []

        for (const rawLine of stdout.split('\n')) {
          if (!rawLine.trim()) continue
          try {
            const obj = JSON.parse(rawLine)

            if (obj.type === 'begin') {
              currentPath = obj.data.path.text
              currentRelativePath = path.relative(dirPath, currentPath).replace(/\\/g, '/')
              lines = []
            } else if (obj.type === 'match') {
              const lineText = obj.data.lines.text
              lines.push({ line: lineText, lineNumber: obj.data.line_number, subMatches: obj.data.submatches })
            } else if (obj.type === 'end') {
              if (lines.length > 0) {
                const firstMatch = lines[0]
                const snippet = firstMatch.line.trim()
                results.push({
                  path: '/' + currentRelativePath,
                  name: path.basename(currentRelativePath),
                  rootPath: dirPath,
                  rootName: dirName,
                  matchedLine: snippet,
                })
              }
            }
          } catch {
            // skip parse errors
          }
        }
      } catch {
        // skip directories where rg fails
      }
    }

    return c.json({ results: results.slice(0, limit) })
  })

  // --- Git API ---

  /** 辅助函数：判断路径是否在 git 仓库中 */
  function getGitRoot(dirPath: string): string | null {
    try {
      const result = execFileSync('git', ['rev-parse', '--show-toplevel'], {
        cwd: dirPath,
        encoding: 'utf-8',
      }).trim()
      return result || null
    } catch {
      return null
    }
  }

  /** 辅助函数：在 git 仓库中执行命令 */
  function execGitCommand(gitRoot: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      execFile('git', args, { cwd: gitRoot, timeout: 30000, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) reject(new Error(stderr || error.message))
        else resolve({ stdout, stderr })
      })
    })
  }

  router.get('/git/status', async (c) => {
    const config = getConfig()
    const rootParam = c.req.query('root')
    let dirPath: string | null = null

    if (rootParam) {
      dirPath = validateRoot(rootParam, config)
      if (!dirPath) return c.json({ error: 'Invalid root' }, 400)
    } else {
      dirPath = config.dirs[0]?.path ? path.resolve(config.dirs[0].path) : null
    }
    if (!dirPath) return c.json({ error: 'No root directory' }, 400)

    const gitRoot = getGitRoot(dirPath)
    if (!gitRoot) return c.json({ isGitRepo: false })

    // Get git status (short format) and recent log
    try {
      const [{ stdout: statusOutput }, { stdout: logOutput }] = await Promise.all([
        execGitCommand(gitRoot, ['status', '--porcelain']),
        execGitCommand(gitRoot, ['log', '--oneline', '-n', '20', '--pretty=format:%H|%an|%ad|%s', '--date=short']),
      ])

      const files: Array<{ path: string; status: string; staged: boolean }> = []
      for (const line of statusOutput.trim().split('\n').filter(Boolean)) {
        const stagedStatus = line.slice(0, 1)
        const unstagedStatus = line.slice(1, 2)
        const filePath = line.slice(3)
        files.push({
          path: filePath,
          status: `${stagedStatus}${unstagedStatus}`,
          staged: stagedStatus !== ' ' && stagedStatus !== '?',
        })
      }

      const logEntries: Array<{ hash: string; author: string; date: string; message: string }> = []
      for (const line of logOutput.trim().split('\n').filter(Boolean)) {
        const parts = line.split('|')
        if (parts.length >= 4) {
          logEntries.push({
            hash: parts[0],
            author: parts[1],
            date: parts[2],
            message: parts.slice(3).join('|'),
          })
        }
      }

      return c.json({
        isGitRepo: true,
        gitRoot,
        files,
        recentCommits: logEntries,
      })
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : 'Failed to get git status' }, 500)
    }
  })

  router.post('/git/commit', async (c) => {
    const config = getConfig()
    const rootParam = c.req.query('root')
    let dirPath: string | null = null

    if (rootParam) {
      dirPath = validateRoot(rootParam, config)
      if (!dirPath) return c.json({ error: 'Invalid root' }, 400)
    } else {
      dirPath = config.dirs[0]?.path ? path.resolve(config.dirs[0].path) : null
    }
    if (!dirPath) return c.json({ error: 'No root directory' }, 400)

    const gitRoot = getGitRoot(dirPath)
    if (!gitRoot) return c.json({ error: 'Not a git repository' }, 400)

    const body = await c.req.json()
    const message = body.message?.trim()
    if (!message) return c.json({ error: 'Commit message is required' }, 400)

    try {
      // Stage all changes
      await execGitCommand(gitRoot, ['add', '-A'])
      // Check if there's anything to commit
      const { stdout } = await execGitCommand(gitRoot, ['status', '--porcelain'])
      if (!stdout.trim()) {
        return c.json({ error: 'No changes to commit' }, 400)
      }
      // Commit
      await execGitCommand(gitRoot, ['commit', '-m', message])
      return c.json({ success: true })
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : 'Failed to commit' }, 500)
    }
  })

  router.post('/git/push', async (c) => {
    const config = getConfig()
    const rootParam = c.req.query('root')
    let dirPath: string | null = null

    if (rootParam) {
      dirPath = validateRoot(rootParam, config)
      if (!dirPath) return c.json({ error: 'Invalid root' }, 400)
    } else {
      dirPath = config.dirs[0]?.path ? path.resolve(config.dirs[0].path) : null
    }
    if (!dirPath) return c.json({ error: 'No root directory' }, 400)

    const gitRoot = getGitRoot(dirPath)
    if (!gitRoot) return c.json({ error: 'Not a git repository' }, 400)

    try {
      await execGitCommand(gitRoot, ['push'])
      return c.json({ success: true })
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : 'Failed to push' }, 500)
    }
  })

  router.get('/*', async (c) => {
    const config = getConfig()
    const matcher = getMatcher()
    const filePath = c.req.path.replace(/^\/api\/files/, '') || '/'

    // Handle root path - return grouped file tree
    if (filePath === '/' || filePath === '') {
      try {
        const groups = await getFileGroups()
        return c.json({ groups })
      } catch (e) {
        return c.json({ error: 'Failed to read directory' }, 500)
      }
    }

    // Handle root parameter from query string
    const rootParam = c.req.query('root')
    let dirPath: string | null

    if (rootParam) {
      dirPath = path.resolve(rootParam)
      if (!config.dirs.some(r => path.resolve(r.path) === dirPath)) {
        return c.json({ error: 'Invalid root' }, 400)
      }
    } else {
      dirPath = findRootForPath(filePath, config)
    }

    if (!dirPath) return c.json({ error: 'Access denied' }, 403)
    const relativePath = filePath.startsWith('/') ? filePath.slice(1) : filePath
    const fullPath = path.join(dirPath, relativePath)

    if (!isAllowed(fullPath, config)) {
      return c.json({ error: 'Access denied' }, 403)
    }

    try {
      const stat = await fs.stat(fullPath)
      if (stat.isDirectory()) {
        const files = await walkDirectory(fullPath, dirPath, config, matcher)
        return c.json({ files })
      }
    } catch (e) {
      // not a directory
    }

    try {
      const ext = path.extname(fullPath).toLowerCase()
      const binaryExts = new Set([
        '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico',
        '.pdf', '.mp3', '.mp4', '.wav', '.ogg', '.webm', '.zip', '.tar', '.gz',
      ])
      const contentTypeMap: Record<string, string> = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.bmp': 'image/bmp',
        '.ico': 'image/x-icon',
        '.pdf': 'application/pdf',
        '.mp3': 'audio/mpeg',
        '.mp4': 'video/mp4',
        '.wav': 'audio/wav',
        '.ogg': 'audio/ogg',
        '.webm': 'video/webm',
        '.zip': 'application/zip',
        '.tar': 'application/x-tar',
        '.gz': 'application/gzip',
      }

      if (binaryExts.has(ext)) {
        const content = await fs.readFile(fullPath)
        return new Response(content, {
          headers: { 'Content-Type': contentTypeMap[ext] || 'application/octet-stream' },
        })
      }

      const content = await fs.readFile(fullPath, 'utf-8')
      return c.text(content)
    } catch (e) {
      return c.json({ error: 'File not found' }, 404)
    }
  })

  router.post('/copy', async (c) => {
    const config = getConfig()
    try {
      const body = await c.req.json()
      let { sourcePath, targetPath, sourceRoot, targetRoot } = body

      if (!sourcePath || !targetPath) {
        return c.json({ error: 'sourcePath and targetPath required' }, 400)
      }

      if (!sourceRoot || !targetRoot) {
        return c.json({ error: 'sourceRoot and targetRoot required' }, 400)
      }

      const validatedSourceRoot = validateRoot(sourceRoot, config)
      const validatedTargetRoot = validateRoot(targetRoot, config)
      if (!validatedSourceRoot) return c.json({ error: 'Invalid source root' }, 400)
      if (!validatedTargetRoot) return c.json({ error: 'Invalid target root' }, 400)

      const srcFullPath = path.join(validatedSourceRoot, sourcePath)
      let tgtFullPath = path.join(validatedTargetRoot, targetPath)

      const stat = await fs.stat(srcFullPath)

      const targetExists = await fs.access(tgtFullPath).then(() => true).catch(() => false)
      if (targetExists) {
        const ext = path.extname(targetPath)
        const base = path.basename(targetPath, ext)
        const dir = path.dirname(targetPath)
        targetPath = `${dir}/${base} (copy)${ext}`
        tgtFullPath = path.join(validatedTargetRoot, targetPath)
      }

      if (stat.isDirectory()) {
        await fs.cp(srcFullPath, tgtFullPath, { recursive: true })
      } else {
        await fs.copyFile(srcFullPath, tgtFullPath)
      }

      return c.json({ success: true, newPath: targetPath })
    } catch (e) {
      console.error('Copy error:', e)
      return c.json({ error: 'Failed to copy' }, 500)
    }
  })

  router.post('/*', async (c) => {
    const config = getConfig()
    const filePath = c.req.path.replace(/^\/api\/files/, '') || '/'
    const rootParam = c.req.query('root')
    let dirPath: string | null

    if (rootParam) {
      dirPath = validateRoot(rootParam, config)
      if (!dirPath) return c.json({ error: 'Invalid root' }, 400)
    } else {
      dirPath = findRootForPath(filePath, config)
      if (!dirPath) return c.json({ error: 'Access denied' }, 403)
    }
    const relativePath = filePath.startsWith('/') ? filePath.slice(1) : filePath
    const fullPath = path.join(dirPath, relativePath)

    if (!isAllowed(fullPath, config)) {
      return c.json({ error: 'Access denied' }, 403)
    }

    const contentType = c.req.header('Content-Type') || ''

    if (contentType.includes('application/json')) {
      const body = await c.req.json()

      if (body.type === 'create') {
        const parentPath = body.parentPath || ''
        const name = body.name
        let parentDirPath: string | null

        if (body.root) {
          parentDirPath = validateRoot(body.root, config)
          if (!parentDirPath) {
            return c.json({ error: 'Invalid root' }, 400)
          }
        } else {
          parentDirPath = findRootForPath(parentPath, config)
          if (!parentDirPath) return c.json({ error: 'Access denied' }, 403)
        }
        const targetPath = path.join(parentDirPath, parentPath, name)

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
          return c.json({ success: true, path: '/' + path.relative(parentDirPath, targetPath).replace(/\\/g, '/') })
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
    const config = getConfig()
    try {
      const body = await c.req.json()
      const { oldPath, newPath, isDirectory, sourceRoot, targetRoot } = body

      if (!oldPath || !newPath) {
        return c.json({ error: 'oldPath and newPath are required' }, 400)
      }

      if (!sourceRoot || !targetRoot) {
        return c.json({ error: 'sourceRoot and targetRoot are required' }, 400)
      }

      const validatedSourceRoot = validateRoot(sourceRoot, config)
      const validatedTargetRoot = validateRoot(targetRoot, config)
      if (!validatedSourceRoot) return c.json({ error: 'Invalid source root' }, 400)
      if (!validatedTargetRoot) return c.json({ error: 'Invalid target root' }, 400)

      const oldFullPath = path.join(validatedSourceRoot, oldPath)
      const newFullPath = path.join(validatedTargetRoot, newPath)

      if (!isAllowed(oldFullPath, config) || !isAllowed(newFullPath, config)) {
        return c.json({ error: 'Access denied' }, 403)
      }

      if (isDirectory) {
        const stat = await fs.stat(oldFullPath)
        if (!stat.isDirectory()) {
          return c.json({ error: 'Source is not a directory' }, 400)
        }
      } else {
        const ext = path.extname(newPath).toLowerCase()
        if (!hasAllowedExtension(newPath, config.allowedExtensions)) {
          return c.json({ error: 'File type not allowed' }, 400)
        }
      }

      try {
        await fs.rename(oldFullPath, newFullPath)
      } catch (err: unknown) {
        if (err instanceof Error && 'code' in err && err.code === 'EXDEV') {
          // Cross-filesystem move - copy then delete
          if (isDirectory) {
            await fs.cp(oldFullPath, newFullPath, { recursive: true })
            await fs.rm(oldFullPath, { recursive: true })
          } else {
            await fs.copyFile(oldFullPath, newFullPath)
            await fs.unlink(oldFullPath)
          }
        } else {
          throw err
        }
      }

      return c.json({ success: true, newPath })
    } catch (e) {
      console.error('Rename/Move error:', e)
      return c.json({ error: 'Failed to rename or move' }, 500)
    }
  })

  router.delete('/*', async (c) => {
    const config = getConfig()
    const filePath = c.req.path.replace(/^\/api\/files/, '') || '/'
    const rootParam = c.req.query('root')
    let dirPath: string | null

    if (rootParam) {
      dirPath = validateRoot(rootParam, config)
      if (!dirPath) return c.json({ error: 'Invalid root' }, 400)
    } else {
      dirPath = findRootForPath(filePath, config)
      if (!dirPath) return c.json({ error: 'Access denied' }, 403)
    }
    const relativePath = filePath.startsWith('/') ? filePath.slice(1) : filePath
    const fullPath = path.join(dirPath, relativePath)

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