import { useState, useCallback, useRef, useEffect } from 'react'
import type { OpenTab } from '../lib/tabTypes'

interface UseTabsOptions {
  onSaveStart?: (filePath: string, sessionId: string) => void
  onSave?: (filePath: string) => void
  onError?: (error: Error, filePath: string) => void
}

const SAVE_IGNORE_BUFFER_MS = 5000

interface UseTabsReturn {
  tabs: Map<string, OpenTab>
  tabOrder: string[]
  activeTabPath: string | null
  openTab: (path: string, rootPath: string | null) => void
  closeTab: (path: string) => void
  updateTabContent: (path: string, newContent: string, debounceMs?: number) => void
  saveTab: (path: string) => void
  saveAllTabs: () => void
  isTabDirty: (path: string) => boolean
  getActiveTab: () => OpenTab | null
  handleWsFileChange: (changedPath: string, rootPath: string | undefined, fetchFiles: () => void) => void
}

export function useTabs(options: UseTabsOptions = {}): UseTabsReturn {
  // Primary source of truth — always synchronous
  const tabsRef = useRef<Map<string, OpenTab>>(new Map())
  // Used to trigger React re-renders when tabs change
  const [tick, setTick] = useState(0)

  const [tabOrder, setTabOrder] = useState<string[]>([])
  const [activeTabPath, setActiveTabPath] = useState<string | null>(null)

  const optionsRef = useRef(options)
  optionsRef.current = options

  // Per-tab debounce timers
  const saveTimeoutsRef = useRef<Map<string, number>>(new Map())

  // For tracking self-saves (to distinguish from external changes)
  const pendingSaveSessionsRef = useRef<Map<string, Set<string>>>(new Map())
  const lastSelfSaveTimeRef = useRef<Map<string, number>>(new Map())

  // Helper: bump tick to trigger re-render
  const bump = useCallback(() => setTick(v => v + 1), [])

  const makeTab = useCallback((path: string, rootPath: string | null, content = '', lastSavedContent = ''): OpenTab => ({
    path,
    rootPath,
    content,
    lastSavedContent,
    status: 'idle',
    saveSessionId: null,
    lastSelfSaveTime: null,
  }), [])

  const doSave = useCallback(async (tab: OpenTab, rootPath: string | null) => {
    const sessionId = `${tab.path}:${Date.now()}`

    // Update tab status synchronously
    const currentTab = tabsRef.current.get(tab.path)
    if (currentTab) {
      tabsRef.current.set(tab.path, { ...currentTab, status: 'saving', saveSessionId: sessionId, lastSelfSaveTime: Date.now() })
    }
    bump()

    // Track save session
    const sessions = pendingSaveSessionsRef.current.get(tab.path) || new Set<string>()
    sessions.add(sessionId)
    pendingSaveSessionsRef.current.set(tab.path, sessions)
    lastSelfSaveTimeRef.current.set(tab.path, Date.now())

    optionsRef.current.onSaveStart?.(tab.path, sessionId)

    try {
      const url = rootPath
        ? `/api/files${tab.path}?root=${encodeURIComponent(rootPath)}`
        : `/api/files${tab.path}`
      const res = await fetch(url, {
        method: 'POST',
        body: tab.content,
      })
      if (!res.ok) throw new Error('Failed to save')

      const savedTab = tabsRef.current.get(tab.path)
      if (savedTab) {
        tabsRef.current.set(tab.path, { ...savedTab, status: 'saved', lastSavedContent: savedTab.content })
      }
      bump()

      // Delay cleanup of save session to handle network latency
      setTimeout(() => {
        const ss = pendingSaveSessionsRef.current.get(tab.path)
        if (ss) {
          const now = Date.now()
          const cutoff = now - SAVE_IGNORE_BUFFER_MS
          const lastTime = lastSelfSaveTimeRef.current.get(tab.path)
          if (lastTime && lastTime < cutoff) {
            pendingSaveSessionsRef.current.delete(tab.path)
            lastSelfSaveTimeRef.current.delete(tab.path)
          }
        }
      }, SAVE_IGNORE_BUFFER_MS)

      optionsRef.current.onSave?.(tab.path)
    } catch (e) {
      const errTab = tabsRef.current.get(tab.path)
      if (errTab) {
        tabsRef.current.set(tab.path, { ...errTab, status: 'error' })
      }
      bump()
      pendingSaveSessionsRef.current.delete(tab.path)
      lastSelfSaveTimeRef.current.delete(tab.path)
      optionsRef.current.onError?.(e instanceof Error ? e : new Error('Unknown error'), tab.path)
    }
  }, [bump])

  const openTab = useCallback((path: string, rootPath: string | null) => {
    // Update URL hash
    if (rootPath) {
      window.location.hash = `${rootPath}:${path}`
    } else {
      window.location.hash = path
    }

    // If already open, just activate
    if (tabsRef.current.has(path)) {
      setActiveTabPath(path)
      return
    }

    setTabOrder(prev => {
      if (prev.includes(path)) {
        return prev
      }
      const newOrder = [...prev, path]
      setActiveTabPath(path)
      return newOrder
    })

    // Create placeholder tab
    tabsRef.current.set(path, makeTab(path, rootPath))
    bump()

    // Fetch content from server
    const url = rootPath
      ? `/api/files${path}?root=${encodeURIComponent(rootPath)}`
      : `/api/files${path}`
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load file')
        return res.text()
      })
      .then(text => {
        const tab = tabsRef.current.get(path)
        if (tab) {
          tabsRef.current.set(path, { ...tab, content: text, lastSavedContent: text })
          bump()
        }
      })
      .catch(e => {
        console.error(e)
      })
  }, [makeTab, bump])

  const closeTab = useCallback((path: string) => {
    // Clear debounce timer
    const timeout = saveTimeoutsRef.current.get(path)
    if (timeout) {
      clearTimeout(timeout)
      saveTimeoutsRef.current.delete(path)
    }

    setTabOrder(prev => {
      const idx = prev.indexOf(path)
      if (idx === -1) return prev
      const newOrder = prev.filter(p => p !== path)

      // If closing active tab, activate neighbor
      setActiveTabPath(currentActive => {
        if (currentActive !== path) return currentActive
        if (newOrder.length === 0) {
          window.location.hash = ''
          return null
        }
        // Try next tab, or fall back to previous
        const newIdx = Math.min(idx, newOrder.length - 1)
        const newPath = newOrder[newIdx]
        // Preserve rootPath in URL hash
        const newTab = tabsRef.current.get(newPath)
        if (newTab?.rootPath) {
          window.location.hash = `${newTab.rootPath}:${newPath}`
        } else {
          window.location.hash = newPath
        }
        return newPath
      })

      return newOrder
    })

    tabsRef.current.delete(path)
    bump()
  }, [bump])

  const updateTabContent = useCallback((path: string, newContent: string, debounceMs: number = 300) => {
    // Sync to ref immediately — this is ALWAYS the latest
    const currentTab = tabsRef.current.get(path)
    if (currentTab) {
      const updated = { ...currentTab, content: newContent, status: currentTab.status === 'saved' ? 'idle' : currentTab.status }
      tabsRef.current.set(path, updated)
    }
    bump()

    // Clear existing timer
    const existing = saveTimeoutsRef.current.get(path)
    if (existing) {
      clearTimeout(existing)
    }

    const timer = window.setTimeout(() => {
      saveTimeoutsRef.current.delete(path)
      const tab = tabsRef.current.get(path)
      if (tab) {
        doSave(tab, tab.rootPath)
      }
    }, debounceMs)

    saveTimeoutsRef.current.set(path, timer)
  }, [doSave, bump])

  const saveTab = useCallback((path: string) => {
    // Clear debounce timer and save immediately
    const timeout = saveTimeoutsRef.current.get(path)
    if (timeout) {
      clearTimeout(timeout)
      saveTimeoutsRef.current.delete(path)
    }

    const tab = tabsRef.current.get(path)
    if (tab) {
      doSave(tab, tab.rootPath)
    }
  }, [doSave])

  const saveAllTabs = useCallback(() => {
    const currentTabs = new Map(tabsRef.current)
    currentTabs.forEach((tab) => {
      const timeout = saveTimeoutsRef.current.get(tab.path)
      if (timeout) {
        clearTimeout(timeout)
        saveTimeoutsRef.current.delete(tab.path)
      }
      if (tab.content !== tab.lastSavedContent) {
        doSave(tab, tab.rootPath)
      }
    })
  }, [doSave])

  const getActiveTabSync = useCallback((): OpenTab | null => {
    if (!activeTabPath) return null
    return tabsRef.current.get(activeTabPath) || null
  }, [activeTabPath])

  const handleWsFileChange = useCallback((changedPath: string, rootPath: string | undefined, fetchFiles: () => void) => {
    // Check if this is our own save
    const sessions = pendingSaveSessionsRef.current.get(changedPath)
    const lastSaveTime = lastSelfSaveTimeRef.current.get(changedPath)
    const now = Date.now()

    if (sessions && sessions.size > 0) return
    if (lastSaveTime && (now - lastSaveTime) < SAVE_IGNORE_BUFFER_MS) return

    const tab = tabsRef.current.get(changedPath)
    if (!tab) return // Tab not open, skip

    if (tab.content !== tab.lastSavedContent) {
      // Tab is dirty, don't overwrite user's edits
      return
    }

    // Tab is clean, reload content
    const url = rootPath
      ? `/api/files${changedPath}?root=${encodeURIComponent(rootPath)}`
      : `/api/files${changedPath}`
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('Failed to reload')
        return res.text()
      })
      .then(text => {
        const currentTab = tabsRef.current.get(changedPath)
        if (currentTab) {
          tabsRef.current.set(changedPath, { ...currentTab, content: text, lastSavedContent: text })
          bump()
        }
      })
      .catch(() => {})

    fetchFiles()
  }, [bump])

  return {
    tabs: tabsRef.current,
    tabOrder,
    activeTabPath,
    openTab,
    closeTab,
    updateTabContent,
    saveTab,
    saveAllTabs,
    isTabDirty: (path: string) => {
      const tab = tabsRef.current.get(path)
      return tab ? tab.content !== tab.lastSavedContent : false
    },
    getActiveTab: getActiveTabSync,
    handleWsFileChange,
  }
}
