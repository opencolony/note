import { useState, useCallback, useEffect, lazy, Suspense, useRef } from 'react'
import { Plus, Eye, Edit, List, FileText } from 'lucide-react'
import { useTheme } from './hooks/useTheme'
import { useWebSocket } from './hooks/useWebSocket'
import { useFile } from './hooks/useFile'
import { FileTree } from './components/FileTree'
import { MarkdownEditor } from './components/MarkdownEditor'
import { ThemeToggle } from './components/ThemeToggle'
import { CreateFileModal } from './components/CreateFileModal'
import { Button } from './components/ui/button'
import { Sheet, SheetContent } from './components/ui/sheet'
import { cn } from './lib/utils'

const MarkdownPreview = lazy(() => import('./components/MarkdownPreview'))

interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

function App() {
  const { resolvedTheme } = useTheme()
  const [files, setFiles] = useState<FileNode[]>([])
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 768
  })
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('split')
  const [currentDir, setCurrentDir] = useState('')
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())

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

  useEffect(() => {
    if (isMobile && viewMode === 'split') {
      setViewMode('preview')
    }
  }, [isMobile, viewMode])

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

  const handleCreateFile = useCallback(async (name: string, isDirectory: boolean) => {
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
      fetchFiles()
    } catch (e) {
      console.error('Failed to create:', e)
    }
  }, [currentDir, fetchFiles])

  const handleSave = useCallback(() => {
    if (path && content) {
      save(content, path)
    }
  }, [save, content, path])

  const showEditor = isMobile ? viewMode === 'edit' : (viewMode === 'edit' || viewMode === 'split')
  const showPreview = isMobile ? viewMode === 'preview' : (viewMode === 'preview' || viewMode === 'split')

  const handleToggleMobileView = useCallback(() => {
    setViewMode(prev => prev === 'edit' ? 'preview' : 'edit')
  }, [])

  const fileName = path ? path.split('/').pop() : null

  useEffect(() => {
    document.title = fileName ? `${fileName} - ColonyDoc` : 'ColonyDoc'
  }, [fileName])

  const SidebarContent = () => (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="font-semibold text-sm">ColonyDoc</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => setCreateModalVisible(true)} title="新建">
            <Plus className="size-4" />
          </Button>
          <ThemeToggle />
        </div>
      </div>
      <FileTree
        files={files}
        activePath={path}
        currentDir={currentDir}
        expandedPaths={expandedPaths}
        setExpandedPaths={setExpandedPaths}
        onSelect={handleSelectFile}
        onDelete={handleDeleteFile}
      />
    </>
  )

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
          <Button variant="ghost" size="icon" onClick={handleToggleMobileView}>
            {viewMode === 'edit' ? <Eye className="size-5" /> : <Edit className="size-5" />}
          </Button>
        </header>
      )}

      <div className="flex flex-1 overflow-hidden">
        {isMobile ? (
          <Sheet open={drawerVisible} onOpenChange={setDrawerVisible}>
            <SheetContent side="left" className="w-[280px] p-0 bg-sidebar">
              <SidebarContent />
            </SheetContent>
          </Sheet>
        ) : (
          <aside className="hidden md:flex w-[260px] flex-col border-r border-border bg-sidebar">
            <SidebarContent />
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
                <Button variant="ghost" size="icon" className="size-8" onClick={() => {
                  setViewMode(prev => prev === 'split' ? 'edit' : prev === 'edit' ? 'preview' : 'split')
                }}>
                  {viewMode === 'split' ? <Eye className="size-4" /> : viewMode === 'edit' ? <List className="size-4" /> : <Edit className="size-4" />}
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
              <>
                {showEditor && (
                  <div className={cn("flex flex-col flex-1 min-w-0 border-r border-border last:border-r-0")}>
                    {isMobile && (
                      <header className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border text-xs text-muted-foreground">
                        <span>编辑</span>
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
                      <MarkdownEditor
                        value={content}
                        onChange={updateContent}
                      />
                    </div>
                  </div>
                )}
                {showPreview && (
                  <div className={cn("flex flex-col flex-1 min-w-0 border-r border-border last:border-r-0")}>
                    {isMobile && (
                      <header className="px-4 py-2 bg-muted/30 border-b border-border text-xs text-muted-foreground">
                        <span>预览</span>
                      </header>
                    )}
                    <Suspense fallback={<div className="flex items-center justify-center text-muted-foreground flex-1">加载中...</div>}>
                      <MarkdownPreview content={content} />
                    </Suspense>
                  </div>
                )}
              </>
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
    </div>
  )
}

export default App