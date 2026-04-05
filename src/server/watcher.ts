import chokidar from 'chokidar'
import fs from 'fs'
import type { ColonynoteConfig } from '../config.js'
import { IgnoreMatcher } from './ignore.js'

export interface WatcherCallbacks {
  onFileChange: (event: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir', path: string) => void
}

export function setupWatcher(config: ColonynoteConfig, matcher: IgnoreMatcher, callbacks: WatcherCallbacks) {
  const watcher = chokidar.watch(config.root, {
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
    depth: 99,
  })

  watcher
    .on('add', (path) => {
      if (config.allowedExtensions.some(ext => path.endsWith(ext))) {
        callbacks.onFileChange('add', path)
      }
    })
    .on('change', (path) => {
      if (config.allowedExtensions.some(ext => path.endsWith(ext))) {
        callbacks.onFileChange('change', path)
      }
    })
    .on('unlink', (path) => {
      if (config.allowedExtensions.some(ext => path.endsWith(ext))) {
        callbacks.onFileChange('unlink', path)
      }
    })
    .on('addDir', (path) => callbacks.onFileChange('addDir', path))
    .on('unlinkDir', (path) => callbacks.onFileChange('unlinkDir', path))
    .on('error', (error) => console.error('Watcher error:', error))

  return watcher
}