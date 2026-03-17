import React, { memo, useMemo } from 'react'
import { XMarkdown } from '@ant-design/x-markdown'
import { Mermaid as AntdMermaid, CodeHighlighter } from '@ant-design/x'
import Latex from '@ant-design/x-markdown/plugins/Latex'
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface MarkdownPreviewProps {
  content: string
}

const CodeBlock = memo(function CodeBlock({ children, lang, block, ...props }: React.HTMLAttributes<HTMLElement> & { lang?: string; block?: boolean }) {
  const isDark = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark'
  const [theme, setTheme] = React.useState(isDark)
  
  React.useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.getAttribute('data-theme') === 'dark')
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  const highlightStyle = useMemo(() => theme ? oneDark : oneLight, [theme])
  
  if (lang === 'mermaid' && block) {
    const code = typeof children === 'string' ? children : ''
    return <AntdMermaid key={theme ? 'dark' : 'light'} config={{ theme: theme ? 'dark' : 'default' }}>{code}</AntdMermaid>
  }
  if (block) {
    const code = typeof children === 'string' ? children : ''
    return <CodeHighlighter lang={lang} highlightProps={{ style: highlightStyle }}>{code}</CodeHighlighter>
  }
  return <code {...props}>{children}</code>
})

const MarkdownPreview = memo(function MarkdownPreview({ content }: MarkdownPreviewProps) {
  return (
    <div className="preview-pane">
      <XMarkdown 
        content={content} 
        components={{
          code: CodeBlock,
        }}
        config={{
          extensions: Latex()
        }}
      />
    </div>
  )
})

export default MarkdownPreview