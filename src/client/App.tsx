import { useState, useCallback, useEffect, useRef, memo } from 'react'
import { Plus, Code, Eye, List, FileText, Folder, FolderOpen, Search, X, Settings, AlertCircle, Sun, Moon, Monitor } from 'lucide-react'
import { useWebSocket } from './hooks/useWebSocket'
import { useTabs } from './hooks/useTabs'
import { FileTree } from './components/FileTree'
import { TipTapEditor } from './components/TipTapEditor'
import { TabBar } from './components/TabBar'
import { CreateFileModal } from './components/CreateFileModal'
import { SearchDialog } from './components/SearchDialog'
import { RenameDialog } from './components/RenameDialog'
import { MoveFileModal } from './components/MoveFileModal'
import { CopyFileModal } from './components/CopyFileModal'
import { SettingsDialog } from './components/SettingsDialog'
import { AddDirDialog } from './components/AddDirDialog'
import { EditDirDialog } from './components/EditDirDialog'
import { Button } from './components/ui/button'
import { Sheet, SheetContent } from './components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './components/ui/alert-dialog'
import { cn } from './lib/utils'
import type { DirConfig } from './lib/types'

interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  rootPath: string
  children?: FileNode[]
}

interface FileGroup {
  root: DirConfig
  files: FileNode[]
  error?: string
}

interface SidebarContentProps {
  groups: FileGroup[]
  activePath: string | null
  activeRoot: string | null
  currentDir: string
  expandedPaths: Set<string>
  setExpandedPaths: React.Dispatch<React.SetStateAction<Set<string>>>
  onSelect: (path: string, type: 'file' | 'directory', rootPath?: string) => void
  onDelete: (path: string) => void
  onRenameRequest: (item: { path: string; name: string; type: 'file' | 'directory' }) => void
  onMoveRequest: (item: { path: string; name: string; type: 'file' | 'directory' }) => void
  onCopyRequest?: (item: { path: string; name: string; type: 'file' | 'directory' }) => void
  onExpand?: (path: string) => void
  editingType?: 'file' | 'directory' | null
  onEditingChange?: (type: 'file' | 'directory' | null) => void
  onCreateSubmit?: (name: string, isDirectory: boolean) => void
  onCreateRequest?: (isDirectory: boolean, parentPath: string) => void
  onSettingsOpen?: () => void
  onClose?: () => void
  onDirChange?: (dirPath: string) => void
  onAddDir?: () => void
  onEditDir?: () => void
  onToggleTheme?: () => void
  themeMode?: 'light' | 'dark' | 'system'
}

const SidebarContent = memo(function SidebarContent({
  groups,
  activePath,
  activeRoot,
  currentDir,
  expandedPaths,
  setExpandedPaths,
  onSelect,
  onDelete,
  onRenameRequest,
  onMoveRequest,
  onCopyRequest,
  onExpand,
  editingType,
  onEditingChange,
  onCreateSubmit,
  onCreateRequest,
  onSettingsOpen,
  onClose,
  onDirChange,
  onAddDir,
  onEditDir,
  onToggleTheme,
  themeMode,
}: SidebarContentProps) {
  // 获取当前活动组的文件列表
  const activeGroup = groups.find(g => g.root.path === activeRoot)
  const files = activeGroup?.files || []

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="logo" className="size-8 shrink-0" />
          <span className="font-semibold text-sm">ColonyNote</span>
        </div>
        <div className="flex gap-1">
          {onToggleTheme && (
            <Button variant="ghost" size="icon" onClick={onToggleTheme} title={themeMode === 'light' ? '切换到深色主题' : themeMode === 'dark' ? '切换到跟随系统' : '切换到浅色主题'}>
              {themeMode === 'dark' ? <Sun className="size-4" /> : themeMode === 'system' ? <Monitor className="size-4" /> : <Moon className="size-4" />}
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} title="关闭" className="md:hidden">
              <X className="size-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onSettingsOpen} title="设置">
            <Settings className="size-4" />
          </Button>
        </div>
      </div>
      {/* 目录切换 */}
      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center border-b border-border">
          <FolderOpen className="size-12 mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground mb-4">暂无目录</p>
          <Button variant="outline" size="sm" onClick={() => onAddDir?.()}>
            <Plus className="size-4 mr-1" />
            添加目录
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-1 px-4 py-2 border-b border-border shrink-0 overflow-x-auto dir-tabs-scroll" style={{ WebkitOverflowScrolling: 'touch' }}>
          {groups.map(group => (
            <Button
              key={group.root.path}
              variant={activeRoot === group.root.path ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onDirChange?.(group.root.path)}
              className={cn(
                "whitespace-nowrap relative group flex-shrink-0",
                group.error && "border-destructive text-destructive hover:text-destructive"
              )}
              title={group.error || group.root.path}
            >
              {group.error && (
                <AlertCircle className="size-3 mr-1 text-destructive shrink-0" />
              )}
              <span className="flex-shrink-0">
                {group.root.name || group.root.path.split('/').pop() || group.root.path}
              </span>
              {/* Desktop tooltip */}
              <span className="hidden md:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                {group.error ? `${group.root.path} (${group.error})` : group.root.path}
              </span>
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAddDir?.()}
            className="whitespace-nowrap flex-shrink-0"
            title="添加目录"
          >
            <Plus className="size-4 mr-1" />
            添加
          </Button>
        </div>
      )}
      <FileTree
        files={files}
        activePath={activePath}
        activeRoot={activeRoot}
        currentDir={currentDir}
        expandedPaths={expandedPaths}
        setExpandedPaths={setExpandedPaths}
        onSelect={onSelect}
        onDelete={onDelete}
        onRenameRequest={onRenameRequest}
        onMoveRequest={onMoveRequest}
        onCopyRequest={onCopyRequest}
        onExpand={onExpand}
        editingType={editingType}
        onEditingChange={onEditingChange}
        onCreateSubmit={onCreateSubmit}
        onCreateRequest={onCreateRequest}
        onEditDir={onEditDir}
      />
    </div>
  )
})

function App() {
  const [fileGroups, setFileGroups] = useState<FileGroup[]>([])
  const [activeDir, setActiveDir] = useState<string | null>(null)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [searchDialogOpen, setSearchDialogOpen] = useState(false)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [moveModalOpen, setMoveModalOpen] = useState(false)
  const [copyModalOpen, setCopyModalOpen] = useState(false)
  const [renameItem, setRenameItem] = useState<{ path: string; name: string; type: 'file' | 'directory' } | null>(null)
  const [moveItem, setMoveItem] = useState<{ path: string; name: string; type: 'file' | 'directory' } | null>(null)
  const [copyItem, setCopyItem] = useState<{ path: string; name: string; type: 'file' | 'directory' } | null>(null)
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 768
  })
  const [editorMode, setEditorMode] = useState<'wysiwyg' | 'source'>('wysiwyg')
  const [currentDir, setCurrentDir] = useState('')
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
  const dirExpandedPathsRef = useRef<Map<string, Set<string>>>(new Map())
  const [editingType, setEditingType] = useState<'file' | 'directory' | null>(null)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [addDirDialogOpen, setAddDirDialogOpen] = useState(false)
  const [editDirDialogOpen, setEditDirDialogOpen] = useState(false)
  const [editDirPath, setEditDirPath] = useState<string | null>(null)
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>(() => {
    const saved = localStorage.getItem('colonynote-theme')
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
    return 'system'
  })

  // Close tab confirmation state
  const [closingTabPath, setClosingTabPath] = useState<string | null>(null)

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window === 'undefined') return 260
    const saved = localStorage.getItem('sidebar-width')
    return saved ? parseInt(saved, 10) : 260
  })
  const isResizingRef = useRef(false)
  const fetchingRef = useRef(false)
  const loadingRef = useRef<string | null>(null)
  const scrollPositionRef = useRef<number>(0)

  const {
    tabs,
    tabOrder,
    activeTabPath,
    openTab,
    closeTab,
    updateTabContent,
    saveTab,
    saveAllTabs,
    isTabDirty,
    getActiveTab,
    handleWsFileChange,
  } = useTabs({
    onSaveStart: () => {},
    onSave: () => {},
    onError: (e) => console.error(e),
  })

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 同步主题状态
  useEffect(() => {
    const applyTheme = (mode: 'light' | 'dark' | 'system') => {
      const shouldBeDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      const isCurrentlyDark = document.documentElement.classList.contains('dark')
      if (shouldBeDark !== isCurrentlyDark) {
        if (shouldBeDark) {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
        window.dispatchEvent(new CustomEvent('theme-change'))
      }
      localStorage.setItem('colonynote-theme', mode)
    }

    applyTheme(themeMode)

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemChange = () => {
      if (themeMode === 'system') {
        applyTheme('system')
      }
    }
    mediaQuery.addEventListener('change', handleSystemChange)

    const handleThemeChange = () => {
      const saved = localStorage.getItem('colonynote-theme')
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setThemeMode(saved)
      }
    }
    window.addEventListener('theme-change', handleThemeChange)

    return () => {
      mediaQuery.removeEventListener('change', handleSystemChange)
      window.removeEventListener('theme-change', handleThemeChange)
    }
  }, [themeMode])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchDialogOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    const tab = getActiveTab()
    if (!tab) return
    const parts = tab.path.split('/').filter(Boolean)
    const dirs: string[] = []
    for (let i = 0; i < parts.length - 1; i++) {
      dirs.push('/' + parts.slice(0, i + 1).join('/'))
    }
    if (dirs.length > 0) {
      setExpandedPaths(prev => {
        const next = new Set(prev)
        dirs.forEach(d => next.add(d))
        return next
      })
    }
  }, [activeTabPath, getActiveTab])

  const fetchFiles = useCallback(async () => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    try {
      const res = await fetch('/api/files/')
      const data = await res.json()
      setFileGroups(data.groups || [])
      if (!activeDir && data.groups?.length > 0) {
        const hash = decodeURIComponent(window.location.hash.slice(1))
        const colonIndex = hash.indexOf(':')
        const rootFromHash = colonIndex > 0 ? hash.substring(0, colonIndex) : null
        
        if (rootFromHash) {
          const rootExists = data.groups.some((g: { root: { path: string } }) => g.root.path === rootFromHash)
          setActiveDir(rootExists ? rootFromHash : data.groups[0].root.path)
        } else {
          setActiveDir(data.groups[0].root.path)
        }
      }
    } catch (e) {
      console.error('Failed to fetch files:', e)
    } finally {
      fetchingRef.current = false
    }
  }, [activeDir])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  useEffect(() => {
    const handleConfigChanged = async () => {
      try {
        const res = await fetch('/api/files/')
        const data = await res.json()
        setFileGroups(data.groups || [])

        // Check if activeDir still exists
        const rootStillExists = data.groups?.some((g: { root: { path: string } }) => g.root.path === activeDir)
        if (!rootStillExists && activeDir) {
          // Close all tabs
          tabOrder.forEach(p => closeTab(p))
          setActiveDir(data.groups?.[0]?.root.path || null)
        } else if (!activeDir && data.groups?.length > 0) {
          setActiveDir(data.groups[0].root.path)
        }
      } catch (e) {
        console.error('Failed to fetch files on config change:', e)
      }
    }
    window.addEventListener('config-changed', handleConfigChanged)
    return () => window.removeEventListener('config-changed', handleConfigChanged)
  }, [activeDir, tabOrder, closeTab])

  useWebSocket(useCallback((data) => {
    if (data.type === 'file:change') {
      const changedPath = data.path
      const rootPath = data.rootPath
      if (!changedPath) return

      // Check if the changed path belongs to the active directory
      if (rootPath && activeDir && rootPath !== activeDir) {
        return
      }

      handleWsFileChange(changedPath, rootPath, fetchFiles)
    }
  }, [fetchFiles, activeDir, handleWsFileChange]))

  const handleSelectFile = useCallback((selectedPath: string, type: 'file' | 'directory', rootPath?: string) => {
    if (type === 'file') {
      const parts = selectedPath.split('/').filter(Boolean)
      const dirs: string[] = []
      for (let i = 0; i < parts.length - 1; i++) {
        dirs.push('/' + parts.slice(0, i + 1).join('/'))
      }
      if (dirs.length > 0) {
        setExpandedPaths(prev => {
          const next = new Set(prev)
          dirs.forEach(d => next.add(d))
          return next
        })
      }

      const effectiveRoot = rootPath || activeDir
      openTab(selectedPath, effectiveRoot)
      const dir = selectedPath.substring(0, selectedPath.lastIndexOf('/'))
      setCurrentDir(dir)
      setDrawerVisible(false)
    } else {
      setCurrentDir(selectedPath)
    }
  }, [openTab, activeDir])

  const handleExpand = useCallback((path: string) => {
    setCurrentDir(path)
  }, [])

  const handleEditingChange = useCallback((type: 'file' | 'directory' | null) => {
    setEditingType(type)
    if (currentDir) {
      const parts = currentDir.split('/').filter(Boolean)
      const toExpand = new Set<string>()
      for (let i = 0; i < parts.length; i++) {
        toExpand.add('/' + parts.slice(0, i + 1).join('/'))
      }
      setExpandedPaths(prev => {
        const next = new Set(prev)
        toExpand.forEach(p => next.add(p))
        return next
      })
    }
  }, [currentDir])

  const handleCreateSubmit = useCallback(async (name: string, isDirectory: boolean) => {
    try {
      const fileName = isDirectory ? name : `${name}.md`
      await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'create', 
          parentPath: currentDir, 
          name: fileName, 
          isDirectory,
          root: activeDir 
        }),
      })
      setEditingType(null)
      fetchFiles()
    } catch (e) {
      console.error('Failed to create:', e)
    }
  }, [activeDir, currentDir, fetchFiles])

  const handleCreateRequest = useCallback((isDirectory: boolean, parentPath: string) => {
    setEditingType(isDirectory ? 'directory' : 'file')
    setCurrentDir(parentPath)
    const parts = parentPath.split('/').filter(Boolean)
    const toExpand = new Set<string>()
    for (let i = 0; i < parts.length; i++) {
      toExpand.add('/' + parts.slice(0, i + 1).join('/'))
    }
    setExpandedPaths(prev => {
      const next = new Set(prev)
      toExpand.forEach(p => next.add(p))
      return next
    })
  }, [])

  useEffect(() => {
    const handleHashChange = () => {
      const hash = decodeURIComponent(window.location.hash.slice(1))
      if (hash && loadingRef.current !== hash) {
        loadingRef.current = hash
        const colonIndex = hash.indexOf(':')
        let rootPath: string | null = null
        let filePath: string
        if (colonIndex > 0) {
          rootPath = hash.substring(0, colonIndex)
          filePath = hash.substring(colonIndex + 1)
        } else {
          filePath = hash
        }

        // Guard: treat "/" or empty filePath as "no file selected"
        if (!filePath || filePath === '/') {
          loadingRef.current = null
          return
        }

        openTab(filePath, rootPath)
        if (rootPath) {
          setActiveDir(rootPath)
        }
        const dir = filePath.substring(0, filePath.lastIndexOf('/'))
        setCurrentDir(dir)
        const parentDirs: string[] = []
        let currentPath = filePath
        while (currentPath.includes('/')) {
          currentPath = currentPath.substring(0, currentPath.lastIndexOf('/'))
          if (currentPath) parentDirs.push(currentPath)
        }
        setExpandedPaths(prev => {
          const newSet = new Set(prev)
          parentDirs.forEach(d => newSet.add(d))
          return newSet
        })
      }
    }

    handleHashChange()
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [openTab])

  const handleDeleteFile = useCallback(async (filePath: string) => {
    try {
      const url = activeDir
        ? `/api/files${filePath}?root=${encodeURIComponent(activeDir)}`
        : `/api/files${filePath}`
      await fetch(url, { method: 'DELETE' })
      // Close any open tabs for this file path (across all roots)
      for (const [key, tab] of tabs) {
        if (tab.path === filePath) {
          closeTab(key)
        }
      }
      fetchFiles()
    } catch (e) {
      console.error('Failed to delete:', e)
    }
  }, [fetchFiles, tabs, closeTab, activeDir])

  const handleRename = useCallback(async (filePath: string, newName: string) => {
    try {
      const parentPath = filePath.substring(0, filePath.lastIndexOf('/'))
      const oldName = filePath.split('/').pop() || ''
      const oldPath = filePath
      const isDirectory = !oldName.includes('.')
      const newFileName = isDirectory ? newName : `${newName}.md`
      const newPath = parentPath ? `${parentPath}/${newFileName}` : `/${newFileName}`

      await fetch('/api/files', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldPath,
          newPath,
          isDirectory,
          sourceRoot: activeDir,
          targetRoot: activeDir,
        }),
      })

      // If the renamed file is open, close old tab and open new one
      const tabKeyToRename = (() => {
        for (const [key, tab] of tabs) {
          if (tab.path === filePath && tab.rootPath === activeDir) return key
        }
        return null
      })()
      if (tabKeyToRename) {
        const wasActive = activeTabPath === tabKeyToRename
        closeTab(tabKeyToRename)
        if (wasActive) {
          openTab(newPath, activeDir)
        }
      }
      fetchFiles()
    } catch (e) {
      console.error('Failed to rename:', e)
    }
  }, [tabs, activeTabPath, closeTab, openTab, fetchFiles, activeDir])

  const handleMove = useCallback(async (oldPath: string, newPath: string, sourceRoot: string, targetRoot: string) => {
    try {
      const fileName = oldPath.split('/').pop() || ''
      const oldParentPath = oldPath.substring(0, oldPath.lastIndexOf('/'))
      const isDirectory = !fileName.includes('.')

      await fetch('/api/files', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldPath,
          newPath,
          isDirectory,
          sourceRoot,
          targetRoot,
        }),
      })

      // If the moved file is open, close old tab and open new one
      const tabKeyToMove = (() => {
        for (const [key, tab] of tabs) {
          if (tab.path === oldPath && tab.rootPath === sourceRoot) return key
        }
        return null
      })()
      if (tabKeyToMove) {
        const wasActive = activeTabPath === tabKeyToMove
        closeTab(tabKeyToMove)
        if (wasActive) {
          openTab(newPath, targetRoot)
        }
      }
      fetchFiles()
    } catch (e) {
      console.error('Failed to move:', e)
    }
  }, [tabs, activeTabPath, closeTab, openTab, fetchFiles])

  const handleCopy = useCallback(async (sourcePath: string, targetPath: string, sourceRoot: string, targetRoot: string) => {
    try {
      await fetch('/api/files/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourcePath,
          targetPath,
          sourceRoot,
          targetRoot,
        }),
      })
      fetchFiles()
    } catch (e) {
      console.error('Failed to copy:', e)
    }
  }, [fetchFiles])

  const handleCreateFile = useCallback(async (name: string, isDirectory: boolean, parentPath: string) => {
    try {
      const fileName = isDirectory ? name : `${name}.md`
      
      await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'create', 
          parentPath, 
          name: fileName, 
          isDirectory,
          root: activeDir 
        }),
      })
      fetchFiles()
    } catch (e) {
      console.error('Failed to create:', e)
    }
  }, [activeDir, fetchFiles])

  const handleSave = useCallback(() => {
    saveAllTabs()
  }, [saveAllTabs])

  const handleToggleEditorMode = useCallback(() => {
    setEditorMode(prev => {
      // 保存当前滚动位置
      const editorContainer = document.querySelector('.tiptap-editor, .editor-textarea')
      if (editorContainer) {
        scrollPositionRef.current = editorContainer.scrollTop || 0
      }
      return prev === 'wysiwyg' ? 'source' : 'wysiwyg'
    })
  }, [])

  const handleToggleTheme = useCallback(() => {
    setThemeMode(prev => {
      const next = prev === 'light' ? 'dark' : prev === 'dark' ? 'system' : 'light'
      return next
    })
  }, [])

  const handleDirChange = useCallback((newDir: string) => {
    if (activeDir) {
      dirExpandedPathsRef.current.set(activeDir, new Set(expandedPaths))
    }
    setActiveDir(newDir)
    const savedPaths = dirExpandedPathsRef.current.get(newDir)
    setExpandedPaths(savedPaths ?? new Set())
    setCurrentDir('')
  }, [activeDir, expandedPaths])

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isResizingRef.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  const handleResizeEnd = useCallback(() => {
    if (isResizingRef.current) {
      isResizingRef.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      setSidebarWidth(w => {
        localStorage.setItem('sidebar-width', w.toString())
        return w
      })
    }
  }, [])

  useEffect(() => {
    const handleResizeMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return
      const newWidth = Math.max(200, Math.min(600, e.clientX))
      setSidebarWidth(newWidth)
    }

    window.addEventListener('mousemove', handleResizeMove)
    window.addEventListener('mouseup', handleResizeEnd)

    return () => {
      window.removeEventListener('mousemove', handleResizeMove)
      window.removeEventListener('mouseup', handleResizeEnd)
    }
  }, [handleResizeEnd])

  const activeTab = getActiveTab()
  const fileName = activeTab ? activeTab.path.split('/').pop() : null

  const allFiles = fileGroups.flatMap(g => g.files)

  useEffect(() => {
    document.title = fileName ? `${fileName} - ColonyNote` : 'ColonyNote'
  }, [fileName])

  // beforeunload guard for dirty tabs
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasDirty = tabOrder.some(p => isTabDirty(p))
      if (hasDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [tabOrder, isTabDirty])

  return (
    <div className="flex flex-col h-full">
      {isMobile && (
        <header className="flex items-center px-4 py-3 border-b border-border bg-background md:hidden">
          <Button variant="ghost" size="icon" onClick={() => setDrawerVisible(true)} className="size-11 min-h-11 min-w-11">
            <List className="size-5" />
          </Button>
          <div className="flex-1 text-base font-semibold text-center truncate mx-4">
            {fileName || 'ColonyNote'}
          </div>
          <Button variant="ghost" size="icon" onClick={() => setSearchDialogOpen(true)} className="size-11 min-h-11 min-w-11">
            <Search className="size-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleToggleEditorMode} title={editorMode === 'wysiwyg' ? '源码模式' : '所见即所得'} className="size-11 min-h-11 min-w-11">
            {editorMode === 'wysiwyg' ? <Code className="size-5" /> : <Eye className="size-5" />}
          </Button>
        </header>
      )}

      <div className="flex flex-1 overflow-hidden">
        {isMobile && (
          <>
            {drawerVisible && (
              <div className="fixed inset-0 z-50 bg-black/80 animate-fade-in" onClick={() => setDrawerVisible(false)} />
            )}
            <aside
              className={cn(
                "fixed z-50 inset-0 w-full bg-sidebar p-0 transition-transform duration-150",
                drawerVisible ? "translate-x-0" : "-translate-x-full"
              )}
            >
              <SidebarContent
                groups={fileGroups}
                activePath={activeTab?.path || null}
                activeRoot={activeDir}
                currentDir={currentDir}
                expandedPaths={expandedPaths}
                setExpandedPaths={setExpandedPaths}
                onSelect={handleSelectFile}
                onDelete={handleDeleteFile}
                onRenameRequest={(item) => {
                  setRenameItem(item)
                  setRenameDialogOpen(true)
                }}
                onMoveRequest={(item) => {
                  setMoveItem(item)
                  setMoveModalOpen(true)
                }}
                onCopyRequest={(item) => {
                  setCopyItem(item)
                  setCopyModalOpen(true)
                }}
                onExpand={handleExpand}
                editingType={editingType}
                onEditingChange={handleEditingChange}
                onCreateSubmit={handleCreateSubmit}
                onCreateRequest={handleCreateRequest}
                onSettingsOpen={() => setSettingsDialogOpen(true)}
                onClose={() => setDrawerVisible(false)}
                onDirChange={handleDirChange}
                onAddDir={() => setAddDirDialogOpen(true)}
                onEditDir={() => { setEditDirPath(activeDir); setEditDirDialogOpen(true) }}
                onToggleTheme={handleToggleTheme}
                themeMode={themeMode}
              />
            </aside>
          </>
        )}

        {!isMobile && (
          <div className="hidden md:flex shrink-0">
            <aside style={{ width: sidebarWidth }} className="flex flex-col border-r border-border bg-sidebar">
              <SidebarContent
                groups={fileGroups}
                activePath={activeTab?.path || null}
                activeRoot={activeDir}
                currentDir={currentDir}
                expandedPaths={expandedPaths}
                setExpandedPaths={setExpandedPaths}
                onSelect={handleSelectFile}
                onDelete={handleDeleteFile}
                onRenameRequest={(item) => {
                  setRenameItem(item)
                  setRenameDialogOpen(true)
                }}
                onMoveRequest={(item) => {
                  setMoveItem(item)
                  setMoveModalOpen(true)
                }}
                onCopyRequest={(item) => {
                  setCopyItem(item)
                  setCopyModalOpen(true)
                }}
                onExpand={handleExpand}
                editingType={editingType}
                onEditingChange={handleEditingChange}
                onCreateSubmit={handleCreateSubmit}
                onCreateRequest={handleCreateRequest}
                onSettingsOpen={() => setSettingsDialogOpen(true)}
                onDirChange={handleDirChange}
                onAddDir={() => setAddDirDialogOpen(true)}
                onEditDir={() => { setEditDirPath(activeDir); setEditDirDialogOpen(true) }}
                onToggleTheme={handleToggleTheme}
                themeMode={themeMode}
              />
            </aside>
            <div
              onMouseDown={handleResizeStart}
              className="w-4 -ml-2 cursor-col-resize flex items-center justify-center group z-10"
              title="拖动调整侧边栏宽度"
            >
              <div className="w-1 h-8 rounded-full bg-border group-hover:bg-primary/50 transition-colors" />
            </div>
          </div>
        )}

        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Tab bar */}
          {tabOrder.length > 0 && (
            <TabBar
              tabOrder={tabOrder}
              tabs={tabs}
              activeTabKey={activeTabPath}
              onActivate={(key) => {
                const tab = tabs.get(key)
                if (tab) openTab(tab.path, tab.rootPath)
              }}
              onCloseRequest={(key) => {
                const dirty = isTabDirty(key)
                if (dirty) {
                  setClosingTabPath(key)
                } else {
                  closeTab(key)
                }
              }}
              isMobile={isMobile}
              rightContent={!isMobile && activeTabPath ? (
                <>
                  <span className={cn(
                    "px-2 py-0.5 rounded",
                    activeTab?.status === 'saving' && "text-muted-foreground bg-muted",
                    activeTab?.status === 'saved' && "text-primary bg-primary/10",
                    activeTab?.status === 'error' && "text-destructive bg-destructive/10"
                  )}>
                    {activeTab?.status === 'saving' ? '保存中...' : activeTab?.status === 'saved' ? '已保存' : activeTab?.status === 'error' ? '保存失败' : ''}
                  </span>
                  <Button variant="ghost" size="icon" className="size-7 min-h-7 min-w-7" onClick={() => setSearchDialogOpen(true)} title="搜索">
                    <Search className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-7 min-h-7 min-w-7" onClick={handleToggleEditorMode} title={editorMode === 'wysiwyg' ? '源码模式' : '所见即所得'}>
                    {editorMode === 'wysiwyg' ? <Code className="size-3.5" /> : <Eye className="size-3.5" />}
                  </Button>
                </>
              ) : undefined}
            />
          )}

          <div className="flex flex-1 overflow-hidden">
            {!activeTabPath ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm text-center p-6 flex-1">
                <FileText className="size-12 mb-4 opacity-50" />
                <div>选择一个文件开始编辑</div>
              </div>
            ) : activeTab && (
              <div className="flex flex-col flex-1 min-w-0">
                {isMobile && (
                  <header className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border text-xs text-muted-foreground">
                    <span>{editorMode === 'wysiwyg' ? '所见即所得' : '源码'}</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-xs",
                      activeTab.status === 'saving' && "text-muted-foreground bg-muted",
                      activeTab.status === 'saved' && "text-primary bg-primary/10"
                    )}>
                      {activeTab.status === 'saving' ? '保存中...' : activeTab.status === 'saved' ? '已保存' : ''}
                    </span>
                  </header>
                )}
                <div className="flex-1 overflow-hidden">
                  <TipTapEditor
                    key={activeTab.key}
                    value={activeTab.content}
                    onChange={(val) => updateTabContent(activeTab.key, val)}
                    mode={editorMode}
                    path={activeTab.path}
                    scrollPosition={scrollPositionRef.current}
                    onLinkClick={(linkPath) => openTab(linkPath, activeTab.rootPath)}
                  />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <CreateFileModal
        visible={createModalVisible}
        onClose={() => {
          setCreateModalVisible(false)
          setEditingType(null)
        }}
        onCreate={handleCreateFile}
        currentDir={currentDir}
      />

      <SearchDialog
        open={searchDialogOpen}
        onOpenChange={setSearchDialogOpen}
        activeRoot={activeDir}
        groups={fileGroups}
        onSelect={(path, rootPath) => {
          if (rootPath && activeDir !== rootPath) {
            setActiveDir(rootPath)
          }
          handleSelectFile(path, 'file', rootPath)
        }}
      />

      <RenameDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        item={renameItem}
        onRename={(oldPath, newName) => {
          setRenameItem(null)
          setRenameDialogOpen(false)
          handleRename(oldPath, newName)
        }}
      />

      <MoveFileModal
        open={moveModalOpen}
        onOpenChange={setMoveModalOpen}
        item={moveItem}
        groups={fileGroups}
        onMove={(oldPath, newPath, sourceRoot, targetRoot) => {
          setMoveItem(null)
          setMoveModalOpen(false)
          handleMove(oldPath, newPath, sourceRoot, targetRoot)
        }}
      />

      <CopyFileModal
        open={copyModalOpen}
        onOpenChange={setCopyModalOpen}
        item={copyItem}
        groups={fileGroups}
        onCopy={(sourcePath, targetPath, sourceRoot, targetRoot) => {
          setCopyItem(null)
          setCopyModalOpen(false)
          handleCopy(sourcePath, targetPath, sourceRoot, targetRoot)
        }}
      />

      <AlertDialog open={closingTabPath !== null} onOpenChange={(open) => { if (!open) setClosingTabPath(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>未保存的更改</AlertDialogTitle>
            <AlertDialogDescription>
              此文件有未保存的更改。确定要关闭吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setClosingTabPath(null)}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (closingTabPath) {
                closeTab(closingTabPath)
                setClosingTabPath(null)
              }
            }}>
              直接关闭
            </AlertDialogAction>
            <AlertDialogAction onClick={() => {
              if (closingTabPath) {
                saveTab(closingTabPath)
                // Wait a bit for save to complete, then close
                setTimeout(() => {
                  closeTab(closingTabPath)
                  setClosingTabPath(null)
                }, 500)
              }
            }}>
              保存并关闭
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
      />

      <AddDirDialog
        open={addDirDialogOpen}
        onOpenChange={setAddDirDialogOpen}
      />

      <EditDirDialog
        open={editDirDialogOpen}
        onOpenChange={setEditDirDialogOpen}
        dirPath={editDirPath}
        isCli={fileGroups.find(g => g.root.path === editDirPath)?.root.isCli}
      />
    </div>
  )
}

export default App