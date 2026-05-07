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
import { Image as TipTapImage } from '@tiptap/extension-image'
import { Highlight } from '@tiptap/extension-highlight'
import { Underline } from '@tiptap/extension-underline'
import { Typography } from '@tiptap/extension-typography'
import { common, createLowlight } from 'lowlight'
import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react'
import { Maximize2, Copy, Check } from 'lucide-react'
import { MermaidFullscreenDialog } from './MermaidFullscreenDialog'
import { EditorToolbar } from './EditorToolbar'
import { FrontmatterPanel } from './FrontmatterPanel'
import { extractFrontmatter } from '../extensions/frontmatter'
import { MathInline, MathBlock, preprocessMathInMarkdown } from '../extensions/math'
import { mermaidQueue } from '../lib/mermaidQueue'

const lowlight = createLowlight(common)

/**
 * 将相对路径解析为基于当前文件路径的绝对路径
 */
function resolveRelativePath(href: string, currentFilePath: string): string {
  const currentDir = currentFilePath.substring(0, currentFilePath.lastIndexOf('/'))
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

  return decodeURIComponent(resolvedPath)
}

/**
 * 将图片 src 转换为服务端可访问的 URL
 */
function resolveImageSrc(src: string, currentFilePath: string | null | undefined, rootPath: string | null | undefined): string {
  // 外部 URL、data URI 保持不变
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
    return src
  }

  // 没有上下文信息，无法解析路径
  if (!currentFilePath || !rootPath) {
    return src
  }

  let resolvedPath: string
  if (src.startsWith('/')) {
    // 绝对路径：以根目录为基准
    resolvedPath = src
  } else {
    resolvedPath = resolveRelativePath(src, currentFilePath)
  }
  return `/api/files${resolvedPath}?root=${encodeURIComponent(rootPath)}`
}

/**
 * 图片渲染上下文，用于在 addNodeView 中访问当前文件路径信息
 * 避免在 renderHTML 中转换 src（会被 getHTMLFromFragment 调用，污染 Markdown 输出）
 */
const imageRenderContext = {
  path: null as string | null,
  rootPath: null as string | null,
}

interface TipTapEditorProps {
  value: string
  onChange: (value: string) => void
  mode: 'wysiwyg' | 'source'
  placeholder?: string
  readOnly?: boolean
  path?: string | null
  rootPath?: string | null
  scrollPosition?: number
  onLinkClick?: (path: string) => void
}

function MermaidCodeBlock({ node, updateAttributes, selected, editor, getPos }: NodeViewProps) {
  const isMermaid = node.attrs.language === 'mermaid'
  const [svgContent, setSvgContent] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [themeKey, setThemeKey] = useState(0)
  const [copied, setCopied] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)
  const mermaidIdRef = useRef(`mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)

  const handleCopy = useCallback(async () => {
    const text = node.textContent
    if (!text) return

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [node.textContent])

  const mermaidSource = node.textContent

  // 监听主题变化
  useEffect(() => {
    const handleThemeChange = () => {
      setThemeKey(prev => prev + 1)
    }
    window.addEventListener('theme-change', handleThemeChange)
    return () => window.removeEventListener('theme-change', handleThemeChange)
  }, [])

  // Intersection Observer：检测图表是否进入视口
  useEffect(() => {
    if (!isMermaid) return
    const el = previewRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting)
      },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [isMermaid])

  // 通过渲染队列请求渲染
  useEffect(() => {
    if (!isMermaid) {
      setSvgContent('')
      setError('')
      setIsLoading(false)
      return
    }

    if (!mermaidSource) {
      setSvgContent('')
      setError('')
      setIsLoading(false)
      return
    }

    if (!isVisible) {
      // 不可见时清空结果（但保留已渲染的内容以优化滚动体验）
      // 如果已经渲染过，保留结果避免闪烁
      if (!svgContent) {
        setIsLoading(false)
      }
      return
    }

    const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'default'
    setIsLoading(true)
    mermaidIdRef.current = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    mermaidQueue.request(
      mermaidIdRef.current,
      mermaidSource,
      currentTheme,
      (result) => {
        setSvgContent(result.svg)
        setError(result.error)
        setIsLoading(false)
      }
    )

    return () => {
      mermaidQueue.cancel(mermaidIdRef.current)
    }
  }, [isMermaid, mermaidSource, isVisible, themeKey])

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
        <div className="flex items-center gap-1">
          <button
            className="code-block-copy-btn"
            contentEditable={false}
            onClick={handleCopy}
            title={copied ? '已复制' : '复制代码'}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </button>
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
      </div>
      {isMermaid ? (
        <div ref={previewRef} className="mermaid-preview" contentEditable={false}>
          {error ? (
            <div className="mermaid-error">Mermaid Error: {error}</div>
          ) : svgContent ? (
            <div className="mermaid-svg-container" dangerouslySetInnerHTML={{ __html: svgContent }} />
          ) : isLoading ? (
            <div className="mermaid-loading">渲染中...</div>
          ) : (
            <div className="mermaid-placeholder">滚动查看图表</div>
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

export function TipTapEditor({ value, onChange, mode, placeholder, readOnly, path, rootPath, scrollPosition, onLinkClick }: TipTapEditorProps) {
  // 同步更新图片渲染上下文，供 addNodeView 使用
  imageRenderContext.path = path ?? null
  imageRenderContext.rootPath = rootPath ?? null

  const isInternalUpdateRef = useRef(false)
  const lastNotifiedValueRef = useRef<string>(value)
  const sourceScrollRef = useRef<number>(0)
  const frontmatterRef = useRef<string | null>(null)
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 768
  })

  // Extract frontmatter from value externally, so the editor only sees body content
  const { frontmatter: rawFrontmatter, body: bodyContentRaw } = extractFrontmatter(value)
  const bodyContent = preprocessMathInMarkdown(bodyContentRaw)
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
      TipTapImage.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            style: { default: null },
            class: { default: null },
            htmlAttrs: { default: null },
          }
        },
        parseHTML() {
          return [
            {
              tag: this.options.allowBase64 ? 'img[src]' : 'img[src]:not([src^="data:"])',
              getAttrs: (element) => {
                const el = element as HTMLImageElement
                const known = ['src', 'alt', 'title', 'width', 'height', 'style', 'class', 'htmlAttrs', 'draggable']
                const extra: Record<string, string> = {}
                for (const attr of el.attributes) {
                  if (!known.includes(attr.name)) {
                    extra[attr.name] = attr.value
                  }
                }
                return {
                  src: el.getAttribute('src'),
                  alt: el.getAttribute('alt'),
                  title: el.getAttribute('title'),
                  width: el.getAttribute('width'),
                  height: el.getAttribute('height'),
                  style: el.getAttribute('style'),
                  class: el.getAttribute('class'),
                  htmlAttrs: Object.keys(extra).length > 0 ? JSON.stringify(extra) : null,
                }
              },
            },
          ]
        },
        addStorage() {
          return {
            markdown: {
              serialize(state: any, node: any) {
                const hasExtraAttrs =
                  node.attrs.width || node.attrs.height || node.attrs.style || node.attrs.class || node.attrs.htmlAttrs
                if (hasExtraAttrs) {
                  const attrs: Record<string, string> = { src: node.attrs.src }
                  if (node.attrs.alt) attrs.alt = node.attrs.alt
                  if (node.attrs.title) attrs.title = node.attrs.title
                  if (node.attrs.width) attrs.width = String(node.attrs.width)
                  if (node.attrs.height) attrs.height = String(node.attrs.height)
                  if (node.attrs.style) attrs.style = node.attrs.style
                  if (node.attrs.class) attrs.class = node.attrs.class
                  if (node.attrs.htmlAttrs) {
                    try {
                      const extra = JSON.parse(node.attrs.htmlAttrs)
                      Object.assign(attrs, extra)
                    } catch {}
                  }
                  const attrStr = Object.entries(attrs)
                    .map(([k, v]) => `${k}="${v.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`)
                    .join(' ')
                  state.write(`<img ${attrStr}>`)
                } else {
                  const alt = state.esc(node.attrs.alt || '')
                  const src = state.esc(node.attrs.src || '')
                  const title = node.attrs.title ? ` "${state.esc(node.attrs.title)}"` : ''
                  state.write(`![${alt}](${src}${title})`)
                }
                state.closeBlock(node)
              },
            },
          }
        },
        addNodeView() {
          return ({ node }) => {
            const img = document.createElement('img')

            const applyAttrs = (targetNode = node) => {
              img.src = resolveImageSrc(
                targetNode.attrs.src as string,
                imageRenderContext.path,
                imageRenderContext.rootPath
              )
              if (targetNode.attrs.alt) img.alt = targetNode.attrs.alt
              else img.removeAttribute('alt')
              if (targetNode.attrs.title) img.title = targetNode.attrs.title
              else img.removeAttribute('title')
              if (targetNode.attrs.width) img.setAttribute('width', String(targetNode.attrs.width))
              else img.removeAttribute('width')
              if (targetNode.attrs.height) img.setAttribute('height', String(targetNode.attrs.height))
              else img.removeAttribute('height')
              img.className = targetNode.attrs.class || ''
              img.style.cssText = targetNode.attrs.style || ''

              // 清除旧的额外属性
              const knownAttrs = ['src', 'alt', 'title', 'width', 'height', 'style', 'class', 'contenteditable', 'draggable']
              for (const attr of Array.from(img.attributes)) {
                if (!knownAttrs.includes(attr.name)) {
                  img.removeAttribute(attr.name)
                }
              }
              // 应用新的额外属性
              if (targetNode.attrs.htmlAttrs) {
                try {
                  const extra = JSON.parse(targetNode.attrs.htmlAttrs as string)
                  for (const [key, value] of Object.entries(extra)) {
                    if (value != null) {
                      img.setAttribute(key, String(value))
                    }
                  }
                } catch {}
              }
            }

            applyAttrs()

            return {
              dom: img,
              update: (updatedNode) => {
                if (updatedNode.type.name !== 'image') return false
                applyAttrs(updatedNode)
                return true
              },
            }
          }
        },
      }).configure({
        allowBase64: true,
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Underline,
      Typography,
      MathInline,
      MathBlock,
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

  // 当 path/rootPath 变化时，触发所有 image NodeView 更新 src
  useEffect(() => {
    if (editor) {
      editor.view.updateState(editor.state)
    }
  }, [path, rootPath, editor])

  // Re-extract frontmatter when value changes (e.g. external file change, mode switch)
  // Sync external value changes to editor (body only, not frontmatter)
  useEffect(() => {
    if (!editor) return
    if (isInternalUpdateRef.current) return

    const { frontmatter: fm, body } = extractFrontmatter(value)
    frontmatterRef.current = fm
    const processedBody = preprocessMathInMarkdown(body)

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
    editor.commands.setContent(processedBody)
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
    <div className="tiptap-editor-root tiptap-editor">
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
