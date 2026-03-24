import { useEditor, EditorContent } from '@tiptap/react'
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
import { useEffect, useRef, useState, useMemo, memo } from 'react'
import mermaid from 'mermaid'
import { NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
})

const lowlight = createLowlight(common)

interface TipTapEditorProps {
  value: string
  onChange: (value: string) => void
  mode: 'wysiwyg' | 'source'
  placeholder?: string
  readOnly?: boolean
  path?: string | null
  onLinkClick?: (path: string) => void
}

const MermaidZoom = memo(function MermaidZoom({ 
  svgContent,
  onControlsReady 
}: { 
  svgContent: string
  onControlsReady: (controls: { zoomIn: () => void; zoomOut: () => void; resetTransform: () => void }) => void
}) {
  const [isZoomed, setIsZoomed] = useState(false)
  
  return (
    <TransformWrapper
      initialScale={1}
      minScale={1}
      maxScale={5}
      wheel={{ disabled: true }}
      panning={{ disabled: !isZoomed }}
      doubleClick={{ disabled: true }}
      onTransformed={(_, state) => {
        setIsZoomed(state.scale > 1)
      }}
    >
      {({ zoomIn, zoomOut, resetTransform }) => {
        onControlsReady({ 
          zoomIn, 
          zoomOut, 
          resetTransform: () => {
            resetTransform()
            setIsZoomed(false)
          }
        })
        return (
          <TransformComponent wrapperStyle={{ width: '100%' }}>
            <div dangerouslySetInnerHTML={{ __html: svgContent }} />
          </TransformComponent>
        )
      }}
    </TransformWrapper>
  )
})

function MermaidCodeBlock({ node, updateAttributes, selected }: NodeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isMermaid = node.attrs.language === 'mermaid'
  const [svgContent, setSvgContent] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [zoomControls, setZoomControls] = useState<{ zoomIn: () => void; zoomOut: () => void; resetTransform: () => void } | null>(null)
  
  const mermaidId = useMemo(() => `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, [])

  useEffect(() => {
    if (!isMermaid) {
      setSvgContent('')
      setError('')
      return
    }

    const code = node.textContent
    if (!code) {
      setSvgContent('')
      setError('')
      return
    }

    let cancelled = false

    const renderMermaid = async () => {
      try {
        const { svg } = await mermaid.render(mermaidId, code)
        if (!cancelled) {
          setSvgContent(svg)
          setError('')
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Mermaid render error')
          setSvgContent('')
        }
      }
    }

    renderMermaid()

    return () => {
      cancelled = true
    }
  }, [isMermaid, node.textContent, mermaidId])

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
        {isMermaid && zoomControls && (
          <div className="mermaid-zoom-controls" contentEditable={false}>
            <button onClick={() => zoomControls.zoomIn()} title="放大">+</button>
            <button onClick={() => zoomControls.zoomOut()} title="缩小">−</button>
            <button onClick={() => zoomControls.resetTransform()} title="重置">⟲</button>
          </div>
        )}
      </div>
      {isMermaid ? (
        <div ref={containerRef} className="mermaid-preview" contentEditable={false}>
          {error ? (
            <div className="mermaid-error">Mermaid Error: {error}</div>
          ) : svgContent ? (
            <MermaidZoom 
              svgContent={svgContent} 
              onControlsReady={setZoomControls}
            />
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
    </NodeViewWrapper>
  )
}

const CustomCodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(MermaidCodeBlock)
  },
}).configure({ lowlight })

export function TipTapEditor({ value, onChange, mode, placeholder, readOnly, path, onLinkClick }: TipTapEditorProps) {
  const isInternalUpdateRef = useRef(false)
  const lastNotifiedValueRef = useRef<string>(value)

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
        html: false,
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
    content: value,
    editable: !readOnly && mode === 'wysiwyg',
    onUpdate: ({ editor }) => {
      if (isInternalUpdateRef.current) {
        return
      }
      try {
        const storage = editor.storage as Record<string, any>
        const markdownStorage = storage.markdown
        const newValue = markdownStorage && typeof markdownStorage.getMarkdown === 'function'
          ? markdownStorage.getMarkdown()
          : editor.getText()
        
        if (newValue !== lastNotifiedValueRef.current) {
          lastNotifiedValueRef.current = newValue
          onChange(newValue)
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

  useEffect(() => {
    if (!editor) return

    if (isInternalUpdateRef.current) {
      return
    }

    let editorMarkdown = ''
    try {
      const storage = editor.storage as Record<string, any>
      const markdownStorage = storage.markdown
      editorMarkdown = markdownStorage && typeof markdownStorage.getMarkdown === 'function'
        ? markdownStorage.getMarkdown()
        : editor.getText()
    } catch {
      editorMarkdown = editor.getText()
    }

    if (editorMarkdown === value) {
      lastNotifiedValueRef.current = value
      return
    }

    const { from, to } = editor.state.selection

    isInternalUpdateRef.current = true
    editor.commands.setContent(value)
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
    <div className="tiptap-editor-wrapper">
      <EditorContent editor={editor} className="tiptap-editor" />
    </div>
  )
}
