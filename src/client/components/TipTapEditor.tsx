import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Placeholder from '@tiptap/extension-placeholder'
import { Markdown } from 'tiptap-markdown'
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
}

const MermaidZoom = memo(function MermaidZoom({ 
  svgContent,
  onControlsReady 
}: { 
  svgContent: string
  onControlsReady: (controls: { zoomIn: () => void; zoomOut: () => void; resetTransform: () => void }) => void
}) {
  return (
    <TransformWrapper
      initialScale={1}
      minScale={0.2}
      maxScale={5}
      wheel={{ step: 0.1 }}
      panning={{ disabled: false }}
    >
      {({ zoomIn, zoomOut, resetTransform }) => {
        onControlsReady({ zoomIn, zoomOut, resetTransform })
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

export function TipTapEditor({ value, onChange, mode, placeholder, readOnly }: TipTapEditorProps) {
  const isInternalChange = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
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
    ],
    content: value,
    editable: !readOnly && mode === 'wysiwyg',
    onUpdate: ({ editor }) => {
      if (!isInternalChange.current) {
        try {
          const storage = editor.storage as Record<string, any>
          const markdownStorage = storage.markdown
          if (markdownStorage && typeof markdownStorage.getMarkdown === 'function') {
            const markdown = markdownStorage.getMarkdown()
            onChange(markdown)
          } else {
            // Fallback: get text content
            const text = editor.getText()
            onChange(text)
          }
        } catch (e) {
          console.error('Failed to get markdown:', e)
          const text = editor.getText()
          onChange(text)
        }
      }
    },
  })

  const prevValueRef = useRef<string>(value)

  useEffect(() => {
    if (editor && value !== prevValueRef.current) {
      prevValueRef.current = value
      isInternalChange.current = true
      editor.commands.setContent(value)
      setTimeout(() => {
        isInternalChange.current = false
      }, 0)
    }
  }, [value, editor])

  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly && mode === 'wysiwyg')
    }
  }, [editor, readOnly, mode])

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
