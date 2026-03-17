import React, { useState, useCallback, useEffect, lazy, Suspense, useRef } from 'react'
import { Popup } from 'antd-mobile'
import { PlusOutlined, EyeOutlined, EditOutlined, UnorderedListOutlined, FileTextOutlined } from '@ant-design/icons'
import { useTheme } from './hooks/useTheme'
import { useWebSocket } from './hooks/useWebSocket'
import { useFile } from './hooks/useFile'
import { FileTree } from './components/FileTree'
import { MarkdownEditor } from './components/MarkdownEditor'
import { ThemeToggle } from './components/ThemeToggle'
import { CreateFileModal } from './components/CreateFileModal'

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
  const [isMobile, setIsMobile] = useState(false)
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('split')
  const [currentDir, setCurrentDir] = useState('')

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
    const checkMobile = () => setIsMobile(window.innerWidth < 769)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (isMobile && viewMode === 'split') {
      setViewMode('preview')
    }
  }, [isMobile, viewMode])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme)
  }, [resolvedTheme])

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

  return (
    <div className="app">
      {isMobile && (
        <div className="mobile-header">
          <button className="icon-btn" onClick={() => setDrawerVisible(true)}>
            ☰
          </button>
          <div className="mobile-header-title">
            {fileName || 'ColonyDoc'}
          </div>
          <button 
            className="icon-btn view-toggle-btn" 
            onClick={handleToggleMobileView}
          >
            {viewMode === 'edit' ? <EyeOutlined /> : <EditOutlined />}
          </button>
        </div>
      )}

      <div className="app-main">
        {isMobile ? (
          <Popup
            visible={drawerVisible}
            onMaskClick={() => setDrawerVisible(false)}
            position="left"
            bodyStyle={{ width: '280px', padding: 0 }}
          >
            <div className="drawer-content">
              <div className="drawer-header">
                <span className="sidebar-title">ColonyDoc</span>
                <div className="sidebar-actions">
                  <button className="icon-btn" onClick={() => setCreateModalVisible(true)} title="新建">
                    <PlusOutlined />
                  </button>
                  <ThemeToggle />
                </div>
              </div>
              <FileTree
                files={files}
                activePath={path}
                currentDir={currentDir}
                onSelect={handleSelectFile}
                onDelete={handleDeleteFile}
              />
            </div>
          </Popup>
        ) : (
          <div className="sidebar">
            <div className="sidebar-header">
              <span className="sidebar-title">ColonyDoc</span>
              <div className="sidebar-actions">
                <button className="icon-btn" onClick={() => setCreateModalVisible(true)} title="新建">
                  <PlusOutlined />
                </button>
                <ThemeToggle />
              </div>
            </div>
            <FileTree
              files={files}
              activePath={path}
              currentDir={currentDir}
              onSelect={handleSelectFile}
              onDelete={handleDeleteFile}
            />
          </div>
        )}

        <div className="content">
          {!isMobile && path && (
            <div className="editor-header">
              <span>{fileName}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`save-status ${status}`}>
                  {status === 'saving' ? '保存中...' : status === 'saved' ? '已保存' : status === 'error' ? '保存失败' : ''}
                </span>
                <button className="icon-btn" onClick={() => {
                  setViewMode(prev => prev === 'split' ? 'edit' : prev === 'edit' ? 'preview' : 'split')
                }}>
                  {viewMode === 'split' ? <EyeOutlined /> : viewMode === 'edit' ? <UnorderedListOutlined /> : <EditOutlined />}
                </button>
              </div>
            </div>
          )}

          <div className="editor-container">
            {!path ? (
              <div className="empty-state">
                <div className="empty-state-icon"><FileTextOutlined /></div>
                <div>选择一个文件开始编辑</div>
              </div>
            ) : (
              <>
                {showEditor && (
                  <div className="editor-pane">
                    {isMobile && (
                      <div className="editor-header">
                        <span>编辑</span>
                        <span className={`save-status ${status}`}>
                          {status === 'saving' ? '保存中...' : status === 'saved' ? '已保存' : ''}
                        </span>
                      </div>
                    )}
                    <div className="editor-body">
                      <MarkdownEditor
                        value={content}
                        onChange={updateContent}
                      />
                    </div>
                  </div>
                )}
                {showPreview && (
                  <div className="editor-pane">
                    {isMobile && (
                      <div className="editor-header">
                        <span>预览</span>
                      </div>
                    )}
                    <Suspense fallback={<div className="preview-pane loading">加载中...</div>}>
                      <MarkdownPreview content={content} />
                    </Suspense>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
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