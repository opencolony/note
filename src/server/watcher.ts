import chokidar from 'chokidar'
import fs from 'fs'
import type { ColonynoteConfig } from '../config.js'
import { IgnoreMatcher } from './ignore.js'

export interface WatcherCallbacks {
  onFileChange: (rootPath: string, event: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir', path: string) => void
}

export function setupWatcher(config: ColonynoteConfig, matcher: IgnoreMatcher, callbacks: WatcherCallbacks) {
  const rootPaths = config.dirs.map(r => r.path)
  const watcher = chokidar.watch(rootPaths, {
    ignored: (filePath: string) => {
      if (!config.showHiddenFiles && (filePath.includes('/.') || filePath.startsWith('.'))) return true

      try {
        const stat = fs.statSync(filePath)
        if (matcher.isIgnored(filePath, stat.isDirectory())) return true
      } catch {
        if (matcher.isIgnored(filePath, false)) return true
      }

      const ext = filePath.split('.').pop()?.toLowerCase() || ''
      if (ext && !config.allowedExtensions.includes('.' + ext) && !filePath.includes('/')) {
        return false
      }
      return false
    },
    persistent: true,
    ignoreInitial: true,
    depth: 3,
  })

  watcher
    .on('add', (path) => {
      if (config.allowedExtensions.some(ext => path.endsWith(ext))) {
        const matchingRoot = config.dirs.find(r => path.startsWith(r.path))
        const rootPath = matchingRoot?.path || config.dirs[0]?.path || ''
        callbacks.onFileChange(rootPath, 'add', path)
      }
    })
    .on('change', (path) => {
      if (config.allowedExtensions.some(ext => path.endsWith(ext))) {
        const matchingRoot = config.dirs.find(r => path.startsWith(r.path))
        const rootPath = matchingRoot?.path || config.dirs[0]?.path || ''
        callbacks.onFileChange(rootPath, 'change', path)
      }
    })
    .on('unlink', (path) => {
      if (config.allowedExtensions.some(ext => path.endsWith(ext))) {
        const matchingRoot = config.dirs.find(r => path.startsWith(r.path))
        const rootPath = matchingRoot?.path || config.dirs[0]?.path || ''
        callbacks.onFileChange(rootPath, 'unlink', path)
      }
    })
    .on('addDir', (path) => {
      const matchingRoot = config.dirs.find(r => path.startsWith(r.path))
      const rootPath = matchingRoot?.path || config.dirs[0]?.path || ''
      callbacks.onFileChange(rootPath, 'addDir', path)
    })
    .on('unlinkDir', (path) => {
      const matchingRoot = config.dirs.find(r => path.startsWith(r.path))
      const rootPath = matchingRoot?.path || config.dirs[0]?.path || ''
      callbacks.onFileChange(rootPath, 'unlinkDir', path)
    })
    .on('error', (error) => console.error('Watcher error:', error))

  return watcher
}