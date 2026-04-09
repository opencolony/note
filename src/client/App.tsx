import { useState, useCallback, useEffect, useRef, memo } from 'react'
import { Plus, Code, Eye, List, FileText, Folder, Search, X, Settings, GripVertical, AlertCircle } from 'lucide-react'
import { useWebSocket } from './hooks/useWebSocket'
import { useFile } from './hooks/useFile'
import { useSearch } from './hooks/useSearch'
import { FileTree } from './components/FileTree'
import { TipTapEditor } from './components/TipTapEditor'
import { CreateFileModal } from './components/CreateFileModal'
import { SearchDialog } from './components/SearchDialog'
import { RenameDialog } from './components/RenameDialog'
import { MoveFileModal } from './components/MoveFileModal'
import { CopyFileModal } from './components/CopyFileModal'
import { SettingsDialog } from './components/SettingsDialog'
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

interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  rootPath: string
  children?: FileNode[]
}

interface FileGroup {
  root: { path: string; exclude?: string[] }
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
  onRootChange?: (rootPath: string) => void
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
  onRootChange,
}: SidebarContentProps) {
  // 获取当前活动组的文件列表
  const activeGroup = groups.find(g => g.root.path === activeRoot)
  const files = activeGroup?.files || []

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} title="关闭" className="md:hidden">
              <X className="size-4" />
            </Button>
          )}
          <img src="/logo.png" alt="logo" className="size-8 shrink-0" />
          <span className="font-semibold text-sm">ColonyNote</span>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={onSettingsOpen} title="设置">
            <Settings className="size-4" />
          </Button>
        </div>
      </div>
      {/* 多根目录切换 */}
      {groups.length > 1 && (
        <div className="flex gap-1 px-4 py-2 border-b border-border shrink-0 overflow-x-auto scrollbar-hide">
          {groups.map(group => (
            <Button
              key={group.root.path}
              variant={activeRoot === group.root.path ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onRootChange?.(group.root.path)}
              className={cn(
                "whitespace-nowrap relative group",
                group.error && "border-destructive text-destructive hover:text-destructive"
              )}
              title={group.error || group.root.path}
            >
              {group.error && (
                <AlertCircle className="size-3 mr-1 text-destructive shrink-0" />
              )}
              <span className="truncate max-w-[100px] md:max-w-[150px] min-w-0 flex-shrink-0">
                {group.root.path.split('/').pop() || group.root.path}
              </span>
              {/* Desktop tooltip */}
              <span className="hidden md:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                {group.error ? `${group.root.path} (${group.error})` : group.root.path}
              </span>
            </Button>
          ))}
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
      />
    </div>
  )
})

function App() {
  const [fileGroups, setFileGroups] = useState<FileGroup[]>([])
  const [activeRoot, setActiveRoot] = useState<string | null>(null)
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
  const rootExpandedPathsRef = useRef<Map<string, Set<string>>>(new Map())
  const [editingType, setEditingType] = useState<'file' | 'directory' | null>(null)
  const [refreshDialogOpen, setRefreshDialogOpen] = useState(false)
  const [pendingExternalChange, setPendingExternalChange] = useState<string | null>(null)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)

  const [isSaving, setIsSaving] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window === 'undefined') return 260
    const saved = localStorage.getItem('sidebar-width')
    return saved ? parseInt(saved, 10) : 260
  })
  const isResizingRef = useRef(false)
  const fetchingRef = useRef(false)
  const loadingRef = useRef<string | null>(null)
  // 用于跟踪自己发起的保存会话，避免在网络差时误判为外部修改
  // key: 文件路径, value: 保存会话ID集合
  const pendingSaveSessionsRef = useRef<Map<string, Set<string>>>(new Map())
  // 用于记录最近保存成功的时间戳，用于辅助判断是否是外部修改
  const lastSelfSaveTimeRef = useRef<Map<string, number>>(new Map())
  // 保存后忽略外部变更的缓冲时间（毫秒）
  const SAVE_IGNORE_BUFFER_MS = 5000

  const {
    content,
    path,
    status,
    load,
    updateContent,
    save,
    setPath,
    setContent,
  } = useFile({
    onSaveStart: (filePath: string, sessionId: string) => {
      setIsSaving(true)
      // 记录保存会话，用于区分自己保存和外部修改
      const sessions = pendingSaveSessionsRef.current.get(filePath) || new Set<string>()
      sessions.add(sessionId)
      pendingSaveSessionsRef.current.set(filePath, sessions)
      // 记录保存时间
      lastSelfSaveTimeRef.current.set(filePath, Date.now())
    },
    onSave: (filePath?: string) => {
      setIsSaving(false)
      const targetPath = filePath || path
      if (!targetPath) return
      // 延迟清除会话，以应对网络延迟导致的 WebSocket 消息延迟
      setTimeout(() => {
        const sessions = pendingSaveSessionsRef.current.get(targetPath)
        if (sessions) {
          // 保留较新的会话，只清除旧的
          const now = Date.now()
          const cutoffTime = now - SAVE_IGNORE_BUFFER_MS
          const savedTime = lastSelfSaveTimeRef.current.get(targetPath)
          if (savedTime && savedTime < cutoffTime) {
            pendingSaveSessionsRef.current.delete(targetPath)
            lastSelfSaveTimeRef.current.delete(targetPath)
          }
        }
      }, SAVE_IGNORE_BUFFER_MS)
    },
    onError: (e, filePath?: string) => {
      setIsSaving(false)
      const targetPath = filePath || path
      if (targetPath) {
        pendingSaveSessionsRef.current.delete(targetPath)
        lastSelfSaveTimeRef.current.delete(targetPath)
      }
      console.error(e)
    },
  })

  const { updateIndex, removeFromIndex } = useSearch()

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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
    if (!path) return
    const parts = path.split('/').filter(Boolean)
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
  }, [path])

  const fetchFiles = useCallback(async () => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    try {
      const res = await fetch('/api/files/')
      const data = await res.json()
      setFileGroups(data.groups || [])
      if (!activeRoot && data.groups?.length > 0) {
        const hash = decodeURIComponent(window.location.hash.slice(1))
        const colonIndex = hash.indexOf(':')
        const rootFromHash = colonIndex > 0 ? hash.substring(0, colonIndex) : null
        
        if (rootFromHash) {
          const rootExists = data.groups.some((g: { root: { path: string } }) => g.root.path === rootFromHash)
          setActiveRoot(rootExists ? rootFromHash : data.groups[0].root.path)
        } else {
          setActiveRoot(data.groups[0].root.path)
        }
      }
    } catch (e) {
      console.error('Failed to fetch files:', e)
    } finally {
      fetchingRef.current = false
    }
  }, [activeRoot])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  useEffect(() => {
    const handleConfigChanged = async () => {
      try {
        const res = await fetch('/api/files/')
        const data = await res.json()
        setFileGroups(data.groups || [])

        // Check if activeRoot still exists
        const rootStillExists = data.groups?.some((g: { root: { path: string } }) => g.root.path === activeRoot)
        if (!rootStillExists && activeRoot) {
          // Clear editor
          setPath(null)
          setContent('')
          window.location.hash = ''
          // Switch to first available root or null
          setActiveRoot(data.groups?.[0]?.root.path || null)
        } else if (!activeRoot && data.groups?.length > 0) {
          setActiveRoot(data.groups[0].root.path)
        }
      } catch (e) {
        console.error('Failed to fetch files on config change:', e)
      }
    }
    window.addEventListener('config-changed', handleConfigChanged)
    return () => window.removeEventListener('config-changed', handleConfigChanged)
  }, [activeRoot])

  useWebSocket(useCallback((data) => {
    if (data.type === 'file:change') {
      const changedPath = data.path
      const rootPath = data.rootPath
      if (!changedPath) return

      // 检查变更是否属于当前活动根目录
      if (rootPath && activeRoot && rootPath !== activeRoot) {
        return
      }

      // 检查是否是用户自己保存的文件
      // 双重验证机制：1. 检查会话ID集合  2. 检查最近保存时间戳
      const sessions = pendingSaveSessionsRef.current.get(changedPath)
      const lastSaveTime = lastSelfSaveTimeRef.current.get(changedPath)
      const now = Date.now()

      // 如果存在未过期的保存会话或最近保存时间在缓冲期内，则视为自己的保存
      if (sessions && sessions.size > 0) {
        // 有活动的保存会话，忽略此变更通知
        return
      }

      // 即使会话已清除，如果在缓冲期内有保存操作，也忽略
      if (lastSaveTime && (now - lastSaveTime) < SAVE_IGNORE_BUFFER_MS) {
        return
      }

      if (path && changedPath === path) {
        setPendingExternalChange(changedPath)
        setRefreshDialogOpen(true)
      }

      if (data.event === 'unlink') {
        removeFromIndex(changedPath)
      } else {
        fetch(`/api/files/content?paths=${encodeURIComponent(changedPath)}`)
          .then(res => res.json())
          .then(result => {
            if (result.files && result.files[0]) {
              const file = result.files[0]
              updateIndex(file.path, file.name, file.content)
            }
          })
          .catch(console.error)
      }

      fetchFiles()
    }
  }, [fetchFiles, path, updateIndex, removeFromIndex, activeRoot]))

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

      const effectiveRoot = rootPath || activeRoot
      load(selectedPath, effectiveRoot || undefined)
      window.location.hash = effectiveRoot ? `${effectiveRoot}:${selectedPath}` : selectedPath
      const dir = selectedPath.substring(0, selectedPath.lastIndexOf('/'))
      setCurrentDir(dir)
      setDrawerVisible(false)
    } else {
      setCurrentDir(selectedPath)
    }
  }, [load, activeRoot])

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
          root: activeRoot 
        }),
      })
      setEditingType(null)
      fetchFiles()
    } catch (e) {
      console.error('Failed to create:', e)
    }
  }, [activeRoot, currentDir, fetchFiles])

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
        let rootPath: string | undefined
        let filePath: string
        if (colonIndex > 0) {
          rootPath = hash.substring(0, colonIndex)
          filePath = hash.substring(colonIndex + 1)
        } else {
          filePath = hash
        }
        load(filePath, rootPath)
        if (rootPath) {
          setActiveRoot(rootPath)
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
  }, [load])

  const handleDeleteFile = useCallback(async (filePath: string) => {
    try {
      const url = activeRoot
        ? `/api/files${filePath}?root=${encodeURIComponent(activeRoot)}`
        : `/api/files${filePath}`
      await fetch(url, { method: 'DELETE' })
      if (path && (path === filePath || path.startsWith(filePath + '/'))) {
        loadingRef.current = null
        window.location.hash = ''
        setPath(null)
        setContent('')
        setRefreshDialogOpen(false)
        setPendingExternalChange(null)
      }
      fetchFiles()
    } catch (e) {
      console.error('Failed to delete:', e)
    }
  }, [fetchFiles, path, activeRoot])

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
          sourceRoot: activeRoot,
          targetRoot: activeRoot,
        }),
      })

      if (path && (path === filePath || path.startsWith(filePath + '/'))) {
        const updatedPath = path.replace(filePath, newPath)
        loadingRef.current = null
        window.location.hash = updatedPath
        load(updatedPath)
        setCurrentDir(parentPath ? parentPath : '')
      }
      fetchFiles()
    } catch (e) {
      console.error('Failed to rename:', e)
    }
  }, [path, load, fetchFiles])

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

      if (path && (path === oldPath || path.startsWith(oldPath + '/'))) {
        const updatedPath = path.replace(oldPath, newPath)
        loadingRef.current = null
        window.location.hash = updatedPath
        load(updatedPath)
        setCurrentDir(newPath.substring(0, newPath.lastIndexOf('/')))
      }
      fetchFiles()
    } catch (e) {
      console.error('Failed to move:', e)
    }
  }, [path, load, fetchFiles])

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
          root: activeRoot 
        }),
      })
      fetchFiles()
    } catch (e) {
      console.error('Failed to create:', e)
    }
  }, [activeRoot, fetchFiles])

  const handleSave = useCallback(() => {
    if (path && content) {
      save(content, path, activeRoot ?? undefined)
    }
  }, [save, content, path, activeRoot])

  const handleToggleEditorMode = useCallback(() => {
    setEditorMode(prev => prev === 'wysiwyg' ? 'source' : 'wysiwyg')
  }, [])

  const handleRootChange = useCallback((newRoot: string) => {
    if (activeRoot) {
      rootExpandedPathsRef.current.set(activeRoot, new Set(expandedPaths))
    }
    setActiveRoot(newRoot)
    const savedPaths = rootExpandedPathsRef.current.get(newRoot)
    setExpandedPaths(savedPaths ?? new Set())
    setCurrentDir('')
  }, [activeRoot, expandedPaths])

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isResizingRef.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const handleResizeMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return
      const newWidth = Math.max(200, Math.min(600, e.clientX))
      setSidebarWidth(newWidth)
    }

    const handleResizeEnd = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        localStorage.setItem('sidebar-width', sidebarWidth.toString())
      }
    }

    window.addEventListener('mousemove', handleResizeMove)
    window.addEventListener('mouseup', handleResizeEnd)

    return () => {
      window.removeEventListener('mousemove', handleResizeMove)
      window.removeEventListener('mouseup', handleResizeEnd)
    }
  }, [sidebarWidth])

  const fileName = path ? path.split('/').pop() : null

  const allFiles = fileGroups.flatMap(g => g.files)

  useEffect(() => {
    document.title = fileName ? `${fileName} - ColonyNote` : 'ColonyNote'
  }, [fileName])

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
                activePath={path}
                activeRoot={activeRoot}
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
                onRootChange={handleRootChange}
              />
            </aside>
          </>
        )}

        {!isMobile && (
          <div className="hidden md:flex shrink-0">
            <aside style={{ width: sidebarWidth }} className="flex flex-col border-r border-border bg-sidebar">
              <SidebarContent
              groups={fileGroups}
              activePath={path}
              activeRoot={activeRoot}
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
              onRootChange={handleRootChange}
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
          {!isMobile && path && (
            <header className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border text-xs text-muted-foreground">
              <span>{fileName}</span>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "px-2 py-0.5 rounded text-xs",
                  status === 'saving' && "text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950",
                  status === 'saved' && "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950",
                  status === 'error' && "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950"
                )}>
                  {status === 'saving' ? '保存中...' : status === 'saved' ? '已保存' : status === 'error' ? '保存失败' : ''}
                </span>
                <Button variant="ghost" size="icon" className="size-8" onClick={() => setSearchDialogOpen(true)} title="搜索">
                  <Search className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" className="size-8" onClick={handleToggleEditorMode} title={editorMode === 'wysiwyg' ? '源码模式' : '所见即所得'}>
                  {editorMode === 'wysiwyg' ? <Code className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </header>
          )}

          <div className="flex flex-1 overflow-hidden">
            {!path ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm text-center p-6 flex-1">
                <FileText className="size-12 mb-4 opacity-50" />
                <div>选择一个文件开始编辑</div>
              </div>
            ) : (
              <div className="flex flex-col flex-1 min-w-0">
                {isMobile && (
                  <header className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border text-xs text-muted-foreground">
                    <span>{editorMode === 'wysiwyg' ? '所见即所得' : '源码'}</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-xs",
                      status === 'saving' && "text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950",
                      status === 'saved' && "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950"
                    )}>
                      {status === 'saving' ? '保存中...' : status === 'saved' ? '已保存' : ''}
                    </span>
                  </header>
                )}
                <div className="flex-1 overflow-hidden">
                  <TipTapEditor
                    key={`${path}-${editorMode}`}
                    value={content}
                    onChange={updateContent}
                    mode={editorMode}
                    path={path}
                    onLinkClick={(linkPath) => handleSelectFile(linkPath, 'file')}
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
        files={allFiles}
        onSelect={(path) => handleSelectFile(path, 'file')}
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

      <AlertDialog open={refreshDialogOpen} onOpenChange={setRefreshDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>文件已更新</AlertDialogTitle>
            <AlertDialogDescription>
              当前文件已被外部修改。是否刷新内容？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setPendingExternalChange(null)
            }}>
              忽略
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (pendingExternalChange) {
                load(pendingExternalChange)
              }
              setPendingExternalChange(null)
            }}>
              刷新
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SettingsDialog
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
      />
    </div>
  )
}

export default App