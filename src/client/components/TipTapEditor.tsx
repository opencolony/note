import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Placeholder from '@tiptap/extension-placeholder'
import { Markdown } from 'tiptap-markdown'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableCell } from '@tiptap/extension-table-cell'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { Link } from '@tiptap/extension-link'
import { Image } from '@tiptap/extension-image'
import { Highlight } from '@tiptap/extension-highlight'
import { Underline } from '@tiptap/extension-underline'
import { Typography } from '@tiptap/extension-typography'
import { common, createLowlight } from 'lowlight'
import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import mermaid from 'mermaid'
import { NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react'
import { Maximize2 } from 'lucide-react'
import { MermaidFullscreenDialog } from './MermaidFullscreenDialog'
import { EditorToolbar } from './EditorToolbar'
import { FrontmatterPanel } from './FrontmatterPanel'
import { extractFrontmatter, parseFrontmatterData, type FrontmatterStorage } from '../extensions/frontmatter'

const isDarkMode = () => document.documentElement.classList.contains('dark')

mermaid.initialize({
  startOnLoad: false,
  theme: isDarkMode() ? 'dark' : 'default',
  suppressErrorRendering: true,
})

const lowlight = createLowlight(common)

interface TipTapEditorProps {
  value: string
  onChange: (value: string) => void
  mode: 'wysiwyg' | 'source'
  placeholder?: string
  readOnly?: boolean
  path?: string | null
  scrollPosition?: number
  onLinkClick?: (path: string) => void
}

function MermaidCodeBlock({ node, updateAttributes, selected, editor, getPos }: NodeViewProps) {
  const isMermaid = node.attrs.language === 'mermaid'
  const [svgContent, setSvgContent] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [themeKey, setThemeKey] = useState(0)
  
  const mermaidId = useMemo(() => `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, [])
  const mermaidSource = node.textContent

  useEffect(() => {
    const handleThemeChange = () => {
      setThemeKey(prev => prev + 1)
    }
    window.addEventListener('theme-change', handleThemeChange)
    return () => window.removeEventListener('theme-change', handleThemeChange)
  }, [])

  useEffect(() => {
    if (!isMermaid) {
      setSvgContent('')
      setError('')
      return
    }

    if (!mermaidSource) {
      setSvgContent('')
      setError('')
      return
    }

    let cancelled = false

    const updateMermaidTheme = () => {
      const currentTheme = isDarkMode() ? 'dark' : 'default'
      mermaid.initialize({
        startOnLoad: false,
        theme: currentTheme,
        suppressErrorRendering: true,
      })
    }

    updateMermaidTheme()
    
    mermaid.render(mermaidId, mermaidSource)
      .then(({ svg }) => {
        if (!cancelled) {
          setSvgContent(svg)
          setError('')
        }
      })
      .catch((err: any) => {
        if (!cancelled) {
          setError(err.message || 'Mermaid render error')
          setSvgContent('')
        }
      })

    return () => {
      cancelled = true
    }
  }, [isMermaid, mermaidSource, mermaidId, themeKey])

  return (
    <NodeViewWrapper className={`code-block-wrapper ${selected ? 'selected' : ''}`}>
      <div className="code-block-header">
        <select
          contentEditable={false}
          value={node.attrs.language || ''}
          onChange={(e) => updateAttributes({ language: e.target.value })}
        >
          <option value="">Plain Text</option>
          <option value="mermaid">Mermaid</option>
          <option value="javascript">JavaScript</option>
          <option value="typescript">TypeScript</option>
          <option value="html">HTML</option>
          <option value="css">CSS</option>
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="cpp">C++</option>
          <option value="go">Go</option>
          <option value="rust">Rust</option>
          <option value="json">JSON</option>
          <option value="markdown">Markdown</option>
          <option value="bash">Bash</option>
        </select>
        {isMermaid && (
          <button
            className="mermaid-fullscreen-btn"
            contentEditable={false}
            onClick={() => setIsFullscreen(true)}
            title="全屏预览"
          >
            <Maximize2 className="size-4" />
          </button>
        )}
      </div>
      {isMermaid ? (
        <div className="mermaid-preview" contentEditable={false}>
          {error ? (
            <div className="mermaid-error">Mermaid Error: {error}</div>
          ) : svgContent ? (
            <div className="mermaid-svg-container" dangerouslySetInnerHTML={{ __html: svgContent }} />
          ) : (
            <div className="mermaid-loading">渲染中...</div>
          )}
        </div>
      ) : (
        <pre className="code-block">
          <code>
            <NodeViewContent />
          </code>
        </pre>
      )}
      {isMermaid && (
        <MermaidFullscreenDialog
          source={mermaidSource}
          open={isFullscreen}
          onOpenChange={(open) => setIsFullscreen(open)}
          onSourceChange={(newSource) => {
            const pos = typeof getPos === 'function' ? getPos() : getPos
            if (pos == null) return
            editor.commands.command(({ tr }) => {
              const nodeStart = pos + 1
              const nodeEnd = nodeStart + newSource.length
              tr.replaceWith(nodeStart, nodeEnd, tr.doc.type.schema.text(newSource))
              return true
            })
          }}
        />
      )}
    </NodeViewWrapper>
  )
}

const CustomCodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(MermaidCodeBlock)
  },
}).configure({ lowlight })

export function TipTapEditor({ value, onChange, mode, placeholder, readOnly, path, scrollPosition, onLinkClick }: TipTapEditorProps) {
  const isInternalUpdateRef = useRef(false)
  const lastNotifiedValueRef = useRef<string>(value)
  const sourceScrollRef = useRef<number>(0)
  const frontmatterRef = useRef<string | null>(null)
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 768
  })

  // Extract frontmatter from value externally, so the editor only sees body content
  const { frontmatter: rawFrontmatter, body: bodyContent } = extractFrontmatter(value)
  const [displayFrontmatter, setDisplayFrontmatter] = useState<string | null>(rawFrontmatter)
  frontmatterRef.current = displayFrontmatter
  const editorRef = useRef<Editor | null>(null) as React.MutableRefObject<Editor | null>

  // Keep displayFrontmatter in sync when value changes externally
  useEffect(() => {
    setDisplayFrontmatter(rawFrontmatter)
  }, [rawFrontmatter])

  const handleFrontmatterChange = useCallback((newFm: string | null) => {
    setDisplayFrontmatter(newFm)
    frontmatterRef.current = newFm

    // Get current body from editor and rebuild full content
    const ed = editorRef.current
    if (!ed) return
    try {
      const storage = (ed.storage as Record<string, any>).markdown
      const bodyMarkdown = storage && typeof storage.getMarkdown === 'function'
        ? storage.getMarkdown()
        : ed.getText()

      let fullContent = bodyMarkdown
      if (newFm) {
        fullContent = `---\n${newFm}\n---\n${bodyMarkdown}`
      }

      if (fullContent !== lastNotifiedValueRef.current) {
        lastNotifiedValueRef.current = fullContent
        onChange(fullContent)
      }
    } catch (e) {
      console.error('Failed to rebuild content with frontmatter:', e)
    }
  }, [onChange])

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        link: false,
        underline: false,
      }),
      CustomCodeBlock,
      Placeholder.configure({
        placeholder: placeholder || '在这里输入 Markdown...',
      }),
      Markdown.configure({
        html: true,
        transformPastedText: true,
        transformCopiedText: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Link.configure({
        openOnClick: false,
      }),
      Image,
      Highlight.configure({
        multicolor: true,
      }),
      Underline,
      Typography,
    ],
    content: bodyContent,
    editable: !readOnly && mode === 'wysiwyg',
    onUpdate: ({ editor }) => {
      if (isInternalUpdateRef.current) {
        return
      }
      try {
        const storage = editor.storage as Record<string, any>
        const markdownStorage = storage.markdown
        let bodyMarkdown = markdownStorage && typeof markdownStorage.getMarkdown === 'function'
          ? markdownStorage.getMarkdown()
          : editor.getText()

        // Prepend frontmatter if present
        const fm = frontmatterRef.current
        let fullContent = bodyMarkdown
        if (fm) {
          fullContent = `---\n${fm}\n---\n${bodyMarkdown}`
        }

        if (fullContent !== lastNotifiedValueRef.current) {
          lastNotifiedValueRef.current = fullContent
          onChange(fullContent)
        }
      } catch (e) {
        console.error('Failed to get markdown:', e)
        const text = editor.getText()
        if (text !== lastNotifiedValueRef.current) {
          lastNotifiedValueRef.current = text
          onChange(text)
        }
      }
    },
  })
  editorRef.current = editor

  // Re-extract frontmatter when value changes (e.g. external file change, mode switch)
  // Sync external value changes to editor (body only, not frontmatter)
  useEffect(() => {
    if (!editor) return
    if (isInternalUpdateRef.current) return

    const { frontmatter: fm, body } = extractFrontmatter(value)
    frontmatterRef.current = fm

    let editorMarkdown = ''
    try {
      const markdownStorage = (editor.storage as Record<string, any>).markdown
      editorMarkdown = markdownStorage && typeof markdownStorage.getMarkdown === 'function'
        ? markdownStorage.getMarkdown()
        : editor.getText()
    } catch {
      editorMarkdown = editor.getText()
    }

    if (editorMarkdown === body) {
      lastNotifiedValueRef.current = value
      return
    }

    const { from, to } = editor.state.selection

    isInternalUpdateRef.current = true
    editor.commands.setContent(body)
    lastNotifiedValueRef.current = value

    requestAnimationFrame(() => {
      isInternalUpdateRef.current = false
      try {
        const maxPos = editor.state.doc.content.size
        const newFrom = Math.min(from, maxPos)
        const newTo = Math.min(to, maxPos)
        if (newFrom >= 0 && newTo >= 0) {
          editor.commands.setTextSelection({ from: newFrom, to: newTo })
        }
      } catch {
        editor.commands.setTextSelection({ from: 0, to: 0 })
      }
    })
  }, [editor, value])

  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly && mode === 'wysiwyg')
    }
  }, [editor, readOnly, mode])

  useEffect(() => {
    if (!path || !onLinkClick) return

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const anchor = target.closest('a')
      if (!anchor) return

      const editorContainer = document.querySelector('.tiptap-editor')
      if (!editorContainer || !editorContainer.contains(anchor)) return

      event.preventDefault()
      event.stopPropagation()

      const href = anchor.getAttribute('href')
      if (!href) return

      if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:') || href.startsWith('#')) {
        window.open(href, '_blank', 'noopener,noreferrer')
        return
      }

      const currentDir = path.substring(0, path.lastIndexOf('/'))
      let resolvedPath = href

      if (href.startsWith('./')) {
        resolvedPath = currentDir + href.slice(1)
      } else if (href.startsWith('../')) {
        let parentDir = currentDir
        let relative = href.slice(3)
        while (relative.startsWith('../')) {
          const lastSlash = parentDir.lastIndexOf('/')
          if (lastSlash <= 0) break
          parentDir = parentDir.substring(0, lastSlash)
          relative = relative.slice(3)
        }
        if (!relative.startsWith('../')) {
          resolvedPath = parentDir + '/' + relative
        } else {
          resolvedPath = href
        }
      } else if (!href.startsWith('/')) {
        resolvedPath = currentDir + '/' + href
      }

      resolvedPath = decodeURIComponent(resolvedPath)

      onLinkClick(resolvedPath)
    }

    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [path, onLinkClick])

  // 恢复切换模式时的滚动位置
  useEffect(() => {
    if (mode === 'source') {
      const textarea = document.querySelector('.editor-textarea')
      if (textarea) {
        const pos = sourceScrollRef.current || scrollPosition || 0
        if (pos > 0) {
          requestAnimationFrame(() => {
            textarea.scrollTop = pos
          })
        }
      }
    } else if (mode === 'wysiwyg') {
      // 切换到 wysiwyg 时保存 textarea 的滚动位置
      const textarea = document.querySelector('.editor-textarea')
      if (textarea) {
        sourceScrollRef.current = textarea.scrollTop
      }
      // 恢复滚动位置到编辑器
      const pos = sourceScrollRef.current || scrollPosition || 0
      if (pos > 0) {
        const editorContainer = document.querySelector('.tiptap-editor')
        if (editorContainer) {
          requestAnimationFrame(() => {
            editorContainer.scrollTop = pos
          })
        }
      }
    }
  }, [mode, scrollPosition])

  if (mode === 'source') {
    return (
      <textarea
        className="editor-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || '在这里输入 Markdown...'}
        readOnly={readOnly}
        spellCheck={false}
      />
    )
  }

  return (
    <div className="tiptap-editor-root">
      <div className="tiptap-editor-toolbar-area">
        {mode === 'wysiwyg' && !isMobile && <EditorToolbar editor={editor} variant="desktop" />}
      </div>
      <div className="tiptap-editor-scroll-area">
        <FrontmatterPanel rawFrontmatter={displayFrontmatter} onFrontmatterChange={handleFrontmatterChange} />
        <EditorContent editor={editor} className="tiptap-editor-content" />
      </div>
      {isMobile && mode === 'wysiwyg' && <EditorToolbar editor={editor} variant="mobile" />}
    </div>
  )
}
