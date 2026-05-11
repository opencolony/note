import { useState, useCallback, useRef, useEffect } from 'react'
import type { OpenTab } from '../lib/tabTypes'

interface UseTabsOptions {
  onSaveStart?: (filePath: string, sessionId: string) => void
  onSave?: (filePath: string) => void
  onError?: (error: Error, filePath: string) => void
}

const SAVE_IGNORE_BUFFER_MS = 5000
const PERSISTENCE_KEY = 'colonynote:tabs'

function makeTabKey(path: string, rootPath: string | null): string {
  return rootPath ? `${rootPath}::${path}` : path
}

interface UseTabsReturn {
  tabs: Map<string, OpenTab>
  tabOrder: string[]
  activeTabPath: string | null
  openTab: (path: string, rootPath: string | null, options?: { asPreview?: boolean }) => void
  closeTab: (key: string) => void
  updateTabContent: (key: string, newContent: string, debounceMs?: number) => void
  saveTab: (key: string) => void
  saveAllTabs: () => void
  isTabDirty: (key: string) => boolean
  isTabPinned: (key: string) => boolean
  getActiveTab: () => OpenTab | null
  handleWsFileChange: (changedPath: string, rootPath: string | undefined, fetchFiles: () => void) => void
  togglePin: (key: string) => void
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

  // Per-tab debounce timers (keyed by tab key)
  const saveTimeoutsRef = useRef<Map<string, number>>(new Map())

  // For tracking self-saves (to distinguish from external changes) — keyed by tab key
  const pendingSaveSessionsRef = useRef<Map<string, Set<string>>>(new Map())
  const lastSelfSaveTimeRef = useRef<Map<string, number>>(new Map())

  // Helper: bump tick to trigger re-render
  const bump = useCallback(() => setTick(v => v + 1), [])

  const makeTab = useCallback((path: string, rootPath: string | null, content = '', lastSavedContent = ''): OpenTab => ({
    key: makeTabKey(path, rootPath),
    path,
    rootPath,
    content,
    lastSavedContent,
    status: 'idle',
    saveSessionId: null,
    lastSelfSaveTime: null,
    isPinned: false,
    isPreview: false,
  }), [])

  const doSave = useCallback(async (tab: OpenTab, rootPath: string | null) => {
    const sessionId = `${tab.path}:${Date.now()}`
    const tabKey = tab.key

    // Update tab status synchronously
    const currentTab = tabsRef.current.get(tabKey)
    if (currentTab) {
      tabsRef.current.set(tabKey, { ...currentTab, status: 'saving', saveSessionId: sessionId, lastSelfSaveTime: Date.now() })
    }
    bump()

    // Track save session
    const sessions = pendingSaveSessionsRef.current.get(tabKey) || new Set<string>()
    sessions.add(sessionId)
    pendingSaveSessionsRef.current.set(tabKey, sessions)
    lastSelfSaveTimeRef.current.set(tabKey, Date.now())

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

      const savedTab = tabsRef.current.get(tabKey)
      if (savedTab) {
        tabsRef.current.set(tabKey, { ...savedTab, status: 'saved', lastSavedContent: savedTab.content })
      }
      bump()

      // Delay cleanup of save session to handle network latency
      setTimeout(() => {
        const ss = pendingSaveSessionsRef.current.get(tabKey)
        if (ss) {
          const now = Date.now()
          const cutoff = now - SAVE_IGNORE_BUFFER_MS
          const lastTime = lastSelfSaveTimeRef.current.get(tabKey)
          if (lastTime && lastTime < cutoff) {
            pendingSaveSessionsRef.current.delete(tabKey)
            lastSelfSaveTimeRef.current.delete(tabKey)
          }
        }
      }, SAVE_IGNORE_BUFFER_MS)

      optionsRef.current.onSave?.(tab.path)
    } catch (e) {
      const errTab = tabsRef.current.get(tabKey)
      if (errTab) {
        tabsRef.current.set(tabKey, { ...errTab, status: 'error' })
      }
      bump()
      pendingSaveSessionsRef.current.delete(tabKey)
      lastSelfSaveTimeRef.current.delete(tabKey)
      optionsRef.current.onError?.(e instanceof Error ? e : new Error('Unknown error'), tab.path)
    }
  }, [bump])

  const openTab = useCallback((path: string, rootPath: string | null, options?: { asPreview?: boolean }) => {
    const tabKey = makeTabKey(path, rootPath)
    const asPreview = options?.asPreview !== false // 默认 preview

    // Update URL hash
    if (rootPath) {
      window.location.hash = `${rootPath}:${path}`
    } else {
      window.location.hash = path
    }

    // If already open, just activate
    if (tabsRef.current.has(tabKey)) {
      setActiveTabPath(tabKey)
      return
    }

    setTabOrder(prev => {
      // If there's a clean preview tab, replace it
      let newOrder = prev
      if (asPreview) {
        const previewKey = prev.find(k => {
          const t = tabsRef.current.get(k)
          return t?.isPreview && t.content === t.lastSavedContent
        })
        if (previewKey) {
          // Close the old preview tab
          const oldTimeout = saveTimeoutsRef.current.get(previewKey)
          if (oldTimeout) {
            clearTimeout(oldTimeout)
            saveTimeoutsRef.current.delete(previewKey)
          }
          pendingSaveSessionsRef.current.delete(previewKey)
          lastSelfSaveTimeRef.current.delete(previewKey)
          tabsRef.current.delete(previewKey)
          newOrder = prev.filter(k => k !== previewKey)
        }
      }

      if (newOrder.includes(tabKey)) {
        return newOrder
      }
      const result = [...newOrder, tabKey]
      setActiveTabPath(tabKey)
      return result
    })

    // Create tab
    const newTab = makeTab(path, rootPath)
    newTab.isPreview = asPreview
    tabsRef.current.set(tabKey, newTab)
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
        const tab = tabsRef.current.get(tabKey)
        if (tab) {
          tabsRef.current.set(tabKey, { ...tab, content: text, lastSavedContent: text })
          bump()
        }
      })
      .catch(e => {
        console.error(e)
      })
  }, [makeTab, bump])

  const closeTab = useCallback((key: string) => {
    // Clear debounce timer
    const timeout = saveTimeoutsRef.current.get(key)
    if (timeout) {
      clearTimeout(timeout)
      saveTimeoutsRef.current.delete(key)
    }

    // Clear save tracking
    pendingSaveSessionsRef.current.delete(key)
    lastSelfSaveTimeRef.current.delete(key)

    setTabOrder(prev => {
      const idx = prev.indexOf(key)
      if (idx === -1) return prev
      const newOrder = prev.filter(k => k !== key)

      // If closing active tab, activate neighbor
      setActiveTabPath(currentActive => {
        if (currentActive !== key) return currentActive
        if (newOrder.length === 0) {
          window.location.hash = ''
          return null
        }
        // Try next tab, or fall back to previous
        const newIdx = Math.min(idx, newOrder.length - 1)
        const newKey = newOrder[newIdx]
        // Preserve rootPath in URL hash
        const newTab = tabsRef.current.get(newKey)
        if (newTab?.rootPath) {
          window.location.hash = `${newTab.rootPath}:${newTab.path}`
        } else if (newTab) {
          window.location.hash = newTab.path
        }
        return newKey
      })

      return newOrder
    })

    tabsRef.current.delete(key)
    bump()
  }, [bump])

  const togglePin = useCallback((key: string) => {
    const tab = tabsRef.current.get(key)
    if (!tab) return

    const newPinned = !tab.isPinned
    // 取消固定时，如果文件是 clean 的，恢复为 preview；否则保持持久化
    const newPreview = !newPinned && tab.content === tab.lastSavedContent
    tabsRef.current.set(key, { ...tab, isPinned: newPinned, isPreview: newPreview })
    bump()

    // Reorder: pinned tabs first
    setTabOrder(prev => {
      const pinned = prev.filter(k => tabsRef.current.get(k)?.isPinned)
      const unpinned = prev.filter(k => !tabsRef.current.get(k)?.isPinned)
      return [...pinned, ...unpinned]
    })
  }, [bump])

  const updateTabContent = useCallback((key: string, newContent: string, debounceMs: number = 300) => {
    // Sync to ref immediately — this is ALWAYS the latest
    const currentTab = tabsRef.current.get(key)
    if (currentTab) {
      const updated: OpenTab = {
        ...currentTab,
        content: newContent,
        status: currentTab.status === 'saved' ? 'idle' : currentTab.status,
        // Editing a preview tab promotes it to a persistent tab
        isPreview: false,
      }
      tabsRef.current.set(key, updated)
    }
    bump()

    // Clear existing timer
    const existing = saveTimeoutsRef.current.get(key)
    if (existing) {
      clearTimeout(existing)
    }

    const timer = window.setTimeout(() => {
      saveTimeoutsRef.current.delete(key)
      const tab = tabsRef.current.get(key)
      if (tab) {
        doSave(tab, tab.rootPath)
      }
    }, debounceMs)

    saveTimeoutsRef.current.set(key, timer)
  }, [doSave, bump])

  const saveTab = useCallback((key: string) => {
    // Clear debounce timer and save immediately
    const timeout = saveTimeoutsRef.current.get(key)
    if (timeout) {
      clearTimeout(timeout)
      saveTimeoutsRef.current.delete(key)
    }

    const tab = tabsRef.current.get(key)
    if (tab) {
      doSave(tab, tab.rootPath)
    }
  }, [doSave])

  const saveAllTabs = useCallback(() => {
    const currentTabs = new Map(tabsRef.current)
    currentTabs.forEach((tab, key) => {
      const timeout = saveTimeoutsRef.current.get(key)
      if (timeout) {
        clearTimeout(timeout)
        saveTimeoutsRef.current.delete(key)
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
    const now = Date.now()

    // Find matching tab(s) by path + rootPath
    for (const [key, tab] of tabsRef.current) {
      if (tab.path !== changedPath) continue
      if (rootPath !== undefined && tab.rootPath != null && tab.rootPath !== rootPath) continue

      // Check if this is our own save
      const sessions = pendingSaveSessionsRef.current.get(key)
      const lastSaveTime = lastSelfSaveTimeRef.current.get(key)

      if (sessions && sessions.size > 0) continue
      if (lastSaveTime && (now - lastSaveTime) < SAVE_IGNORE_BUFFER_MS) continue

      if (tab.content !== tab.lastSavedContent) {
        // Tab is dirty, don't overwrite user's edits
        continue
      }

      // Tab is clean, reload content
      const url = tab.rootPath
        ? `/api/files${changedPath}?root=${encodeURIComponent(tab.rootPath)}`
        : `/api/files${changedPath}`
      fetch(url)
        .then(res => {
          if (!res.ok) throw new Error('Failed to reload')
          return res.text()
        })
        .then(text => {
          const currentTab = tabsRef.current.get(key)
          if (currentTab) {
            tabsRef.current.set(key, { ...currentTab, content: text, lastSavedContent: text })
            bump()
          }
        })
        .catch(() => {})
    }

    fetchFiles()
  }, [bump])

  // --- Persistence: restore on mount ---
  const hasRestoredRef = useRef(false)
  const isRestoringRef = useRef(false)

  useEffect(() => {
    if (hasRestoredRef.current) return
    hasRestoredRef.current = true
    isRestoringRef.current = true

    try {
      const raw = localStorage.getItem(PERSISTENCE_KEY)
      if (!raw) {
        isRestoringRef.current = false
        return
      }

      const data = JSON.parse(raw) as { tabOrder: string[], activeTabPath: string | null, pinnedKeys?: string[] }
      if (!data.tabOrder?.length) {
        isRestoringRef.current = false
        return
      }

      const pinnedSet = new Set(data.pinnedKeys || [])

      const restoredKeys: string[] = []
      for (const key of data.tabOrder) {
        // Parse key: rootPath::filePath or filePath
        const parts = key.split('::')
        let path: string
        let rootPath: string | null
        if (parts.length >= 2) {
          rootPath = parts[0]
          path = parts.slice(1).join('::')
        } else {
          rootPath = null
          path = key
        }

        const tabKey = makeTabKey(path, rootPath)
        if (!tabsRef.current.has(tabKey)) {
          const tab = makeTab(path, rootPath)
          tab.isPreview = false // Restored tabs are never preview
          tab.isPinned = pinnedSet.has(key)
          tabsRef.current.set(tabKey, tab)

          // Fetch content silently
          const url = rootPath
            ? `/api/files${path}?root=${encodeURIComponent(rootPath)}`
            : `/api/files${path}`
          fetch(url)
            .then(res => {
              if (!res.ok) throw new Error('Failed to load file')
              return res.text()
            })
            .then(text => {
              const t = tabsRef.current.get(tabKey)
              if (t) {
                tabsRef.current.set(tabKey, { ...t, content: text, lastSavedContent: text })
                bump()
              }
            })
            .catch(() => {})
        }
        restoredKeys.push(tabKey)
      }

      setTabOrder(restoredKeys)

      if (data.activeTabPath && tabsRef.current.has(data.activeTabPath)) {
        setActiveTabPath(data.activeTabPath)
        const activeTab = tabsRef.current.get(data.activeTabPath)
        if (activeTab?.rootPath) {
          window.location.hash = `${activeTab.rootPath}:${activeTab.path}`
        } else if (activeTab) {
          window.location.hash = activeTab.path
        }
      }

      bump()
    } catch (e) {
      console.error('Failed to restore tabs:', e)
    } finally {
      isRestoringRef.current = false
    }
  }, [makeTab, bump])

  // --- Persistence: save on change ---
  useEffect(() => {
    if (isRestoringRef.current) return

    try {
      // Only persist non-preview tabs
      const persistentOrder = tabOrder.filter(k => {
        const t = tabsRef.current.get(k)
        return t && !t.isPreview
      })

      if (persistentOrder.length === 0) {
        localStorage.removeItem(PERSISTENCE_KEY)
      } else {
        // activeTabPath 如果是 preview，也不持久化 active
        const activeToSave = activeTabPath && tabsRef.current.get(activeTabPath)?.isPreview
          ? null
          : activeTabPath

        const pinnedKeys = persistentOrder.filter(k => tabsRef.current.get(k)?.isPinned)

        localStorage.setItem(PERSISTENCE_KEY, JSON.stringify({
          tabOrder: persistentOrder,
          activeTabPath: activeToSave,
          pinnedKeys: pinnedKeys.length > 0 ? pinnedKeys : undefined,
        }))
      }
    } catch (e) {
      console.error('Failed to persist tabs:', e)
    }
  }, [tabOrder, activeTabPath])

  return {
    tabs: tabsRef.current,
    tabOrder,
    activeTabPath,
    openTab,
    closeTab,
    updateTabContent,
    saveTab,
    saveAllTabs,
    isTabDirty: (key: string) => {
      const tab = tabsRef.current.get(key)
      return tab ? tab.content !== tab.lastSavedContent : false
    },
    isTabPinned: (key: string) => {
      const tab = tabsRef.current.get(key)
      return tab ? tab.isPinned : false
    },
    getActiveTab: getActiveTabSync,
    handleWsFileChange,
    togglePin,
  }
}
