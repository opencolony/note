import chokidar from 'chokidar'
import type { ColonydocConfig } from '../config.js'

export interface WatcherCallbacks {
  onFileChange: (event: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir', path: string) => void
}

export function setupWatcher(config: ColonydocConfig, callbacks: WatcherCallbacks) {
  const watcher = chokidar.watch(config.root, {
    ignored: (path) => {
      if (!config.showHiddenFiles && path.includes('/.') || path.startsWith('.')) return true
      const ext = path.split('.').pop()?.toLowerCase() || ''
      if (ext && !config.allowedExtensions.includes('.' + ext) && !path.includes('/')) {
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