import { useState, useCallback, useEffect, useRef, memo } from 'react'
import { Plus, Code, Eye, List, FileText, Folder, Search } from 'lucide-react'
import { useWebSocket } from './hooks/useWebSocket'
import { useFile } from './hooks/useFile'
import { FileTree } from './components/FileTree'
import { TipTapEditor } from './components/TipTapEditor'
import { CreateFileModal } from './components/CreateFileModal'
import { SearchDialog } from './components/SearchDialog'
import { Button } from './components/ui/button'
import { Sheet, SheetContent } from './components/ui/sheet'
import { cn } from './lib/utils'

interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

interface SidebarContentProps {
  files: FileNode[]
  activePath: string | null
  currentDir: string
  expandedPaths: Set<string>
  setExpandedPaths: React.Dispatch<React.SetStateAction<Set<string>>>
  onSelect: (path: string, type: 'file' | 'directory') => void
  onDelete: (path: string) => void
  onExpand?: (path: string) => void
  editingType?: 'file' | 'directory' | null
  onEditingChange?: (type: 'file' | 'directory' | null) => void
  onCreateSubmit?: (name: string, isDirectory: boolean) => void
  onSearchOpen?: () => void
}

const SidebarContent = memo(function SidebarContent({
  files,
  activePath,
  currentDir,
  expandedPaths,
  setExpandedPaths,
  onSelect,
  onDelete,
  onExpand,
  editingType,
  onEditingChange,
  onCreateSubmit,
  onSearchOpen,
}: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <span className="font-semibold text-sm">ColonyDoc</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={onSearchOpen} title="搜索">
            <Search className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onEditingChange?.('file')} title="新建文件">
            <FileText className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onEditingChange?.('directory')} title="新建文件夹">
            <Folder className="size-4" />
          </Button>
        </div>
      </div>
      <FileTree
        files={files}
        activePath={activePath}
        currentDir={currentDir}
        expandedPaths={expandedPaths}
        setExpandedPaths={setExpandedPaths}
        onSelect={onSelect}
        onDelete={onDelete}
        onExpand={onExpand}
        editingType={editingType}
        onEditingChange={onEditingChange}
        onCreateSubmit={onCreateSubmit}
      />
    </div>
  )
})

function App() {
  const [files, setFiles] = useState<FileNode[]>([])
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [searchDialogOpen, setSearchDialogOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 768
  })
  const [editorMode, setEditorMode] = useState<'wysiwyg' | 'source'>('wysiwyg')
  const [currentDir, setCurrentDir] = useState('')
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
  const [editingType, setEditingType] = useState<'file' | 'directory' | null>(null)

  const [isSaving, setIsSaving] = useState(false)
  const fetchingRef = useRef(false)
  const loadingRef = useRef<string | null>(null)

  const {
    content,
    path,
    status,
    load,
    updateContent,
    save,
  } = useFile({
    onSaveStart: () => setIsSaving(true),
    onSave: () => setIsSaving(false),
    onError: (e) => {
      setIsSaving(false)
      console.error(e)
    },
  })

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
      const res = await fetch('/api/files')
      const data = await res.json()
      setFiles(data.files || [])
    } catch (e) {
      console.error('Failed to fetch files:', e)
    } finally {
      fetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  useWebSocket(useCallback((data) => {
    if (data.type === 'file:change' && !isSaving) {
      fetchFiles()
    }
  }, [fetchFiles, isSaving]))

  const handleSelectFile = useCallback((selectedPath: string, type: 'file' | 'directory') => {
    if (type === 'file') {
      load(selectedPath)
      window.location.hash = selectedPath
      const dir = selectedPath.substring(0, selectedPath.lastIndexOf('/'))
      setCurrentDir(dir)
      setDrawerVisible(false)
    } else {
      setCurrentDir(selectedPath)
    }
  }, [load])

  const handleExpand = useCallback((path: string) => {
    setCurrentDir(path)
  }, [])

  const handleEditingChange = useCallback((type: 'file' | 'directory' | null) => {
    setEditingType(type)
  }, [])

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
          isDirectory 
        }),
      })
      setEditingType(null)
      fetchFiles()
    } catch (e) {
      console.error('Failed to create:', e)
    }
  }, [currentDir, fetchFiles])

  useEffect(() => {
    const hash = decodeURIComponent(window.location.hash.slice(1))
    if (hash && loadingRef.current !== hash) {
      loadingRef.current = hash
      load(hash)
      const dir = hash.substring(0, hash.lastIndexOf('/'))
      setCurrentDir(dir)
    }
  }, [load])

  const handleDeleteFile = useCallback(async (filePath: string) => {
    try {
      await fetch(`/api/files${filePath}`, { method: 'DELETE' })
      fetchFiles()
    } catch (e) {
      console.error('Failed to delete:', e)
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
          isDirectory 
        }),
      })
      fetchFiles()
    } catch (e) {
      console.error('Failed to create:', e)
    }
  }, [fetchFiles])

  const handleSave = useCallback(() => {
    if (path && content) {
      save(content, path)
    }
  }, [save, content, path])

  const handleToggleEditorMode = useCallback(() => {
    setEditorMode(prev => prev === 'wysiwyg' ? 'source' : 'wysiwyg')
  }, [])

  const fileName = path ? path.split('/').pop() : null

  useEffect(() => {
    document.title = fileName ? `${fileName} - ColonyDoc` : 'ColonyDoc'
  }, [fileName])

  return (
    <div className="flex flex-col h-full">
      {isMobile && (
        <header className="flex items-center px-4 py-3 border-b border-border bg-background md:hidden">
          <Button variant="ghost" size="icon" onClick={() => setDrawerVisible(true)}>
            <List className="size-5" />
          </Button>
          <div className="flex-1 text-base font-semibold text-center truncate mx-4">
            {fileName || 'ColonyDoc'}
          </div>
          <Button variant="ghost" size="icon" onClick={() => setSearchDialogOpen(true)}>
            <Search className="size-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleToggleEditorMode} title={editorMode === 'wysiwyg' ? '源码模式' : '所见即所得'}>
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
                "fixed z-50 inset-y-0 left-0 w-[280px] bg-sidebar border-r border-sidebar-border p-0 transition-transform duration-150",
                drawerVisible ? "translate-x-0" : "-translate-x-full"
              )}
            >
              <SidebarContent
                files={files}
                activePath={path}
                currentDir={currentDir}
                expandedPaths={expandedPaths}
                setExpandedPaths={setExpandedPaths}
                onSelect={handleSelectFile}
                onDelete={handleDeleteFile}
                onExpand={handleExpand}
                editingType={editingType}
                onEditingChange={handleEditingChange}
                onCreateSubmit={handleCreateSubmit}
                onSearchOpen={() => setSearchDialogOpen(true)}
              />
            </aside>
          </>
        )}

        {!isMobile && (
          <aside className="hidden md:flex w-[260px] flex-col border-r border-border bg-sidebar">
            <SidebarContent
              files={files}
              activePath={path}
              currentDir={currentDir}
              expandedPaths={expandedPaths}
              setExpandedPaths={setExpandedPaths}
              onSelect={handleSelectFile}
              onDelete={handleDeleteFile}
              onExpand={handleExpand}
              editingType={editingType}
              onEditingChange={handleEditingChange}
              onCreateSubmit={handleCreateSubmit}
              onSearchOpen={() => setSearchDialogOpen(true)}
            />
          </aside>
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
                  />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <CreateFileModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onCreate={handleCreateFile}
        currentDir={currentDir}
      />

      <SearchDialog
        open={searchDialogOpen}
        onOpenChange={setSearchDialogOpen}
        files={files}
        onSelect={(path) => handleSelectFile(path, 'file')}
      />
    </div>
  )
}

export default App