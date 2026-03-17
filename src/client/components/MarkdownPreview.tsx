import { memo, useMemo } from 'react'
import { XMarkdown } from '@ant-design/x-markdown'
import { Mermaid as AntdMermaid, CodeHighlighter } from '@ant-design/x'
import Latex from '@ant-design/x-markdown/plugins/Latex'
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useTheme } from '../hooks/useTheme'

interface MarkdownPreviewProps {
  content: string
}

type CodeBlockProps = React.HTMLAttributes<HTMLElement> & { lang?: string; block?: boolean }

function createCodeBlock(isDark: boolean) {
  return memo(function CodeBlock({ children, lang, block, ...props }: CodeBlockProps) {
    const highlightStyle = isDark ? oneDark : oneLight
    
    if (lang === 'mermaid' && block) {
      const code = typeof children === 'string' ? children : ''
      return <AntdMermaid key={isDark ? 'dark' : 'light'} config={{ theme: isDark ? 'dark' : 'default' }}>{code}</AntdMermaid>
    }
    if (block) {
      const code = typeof children === 'string' ? children : ''
      return <CodeHighlighter lang={lang} highlightProps={{ style: highlightStyle }}>{code}</CodeHighlighter>
    }
    return <code {...props}>{children}</code>
  })
}

const MarkdownPreview = memo(function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  
  const components = useMemo(() => ({
    code: createCodeBlock(isDark),
  }), [isDark])
  
  return (
    <div className="preview-pane">
      <XMarkdown 
        content={content} 
        components={components}
        config={{
          extensions: Latex()
        }}
      />
    </div>
  )
})

export default MarkdownPreview