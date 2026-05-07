import { Node, mergeAttributes } from '@tiptap/core'
import katex from 'katex'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * 在 Markdown 文本中预处理数学公式语法，将其转换为 HTML 标签
 * 以便 TipTap 的 parseHTML 能够识别并转换为 mathInline/mathBlock 节点
 *
 * - 行内公式: $...$  →  <span data-type="mathInline" data-latex="...">
 * - 块级公式: $$...$$ → <div data-type="mathBlock" data-latex="...">
 *
 * 代码块和行内代码中的 $ 符号会被保护，避免误替换
 */
export function preprocessMathInMarkdown(markdown: string): string {
  const codeBlocks: string[] = []
  const inlineCodes: string[] = []

  // 保护 fenced code blocks (```...```)
  let result = markdown.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match)
    return `\0CODEBLOCK${codeBlocks.length - 1}\0`
  })

  // 保护 inline code (`...`)
  result = result.replace(/`[^`]+`/g, (match) => {
    inlineCodes.push(match)
    return `\0INLINECODE${inlineCodes.length - 1}\0`
  })

  // 块级公式: 整段以 $$ 开头和结尾（支持多行）
  result = result.replace(/^\$\$([\s\S]*?)\$\$$/gm, (match, latex) => {
    return `<div data-type="mathBlock" data-latex="${escapeHtml(latex.trim())}"></div>`
  })

  // 行内公式: 单个 $ 包裹（不包含换行，不包含相邻的 $）
  result = result.replace(/(?<!\$)\$([^$\n]+?)\$(?!\$)/g, (match, latex) => {
    return `<span data-type="mathInline" data-latex="${escapeHtml(latex.trim())}"></span>`
  })

  // 恢复代码块和行内代码
  result = result.replace(/\0CODEBLOCK(\d+)\0/g, (_, i) => codeBlocks[+i])
  result = result.replace(/\0INLINECODE(\d+)\0/g, (_, i) => inlineCodes[+i])

  return result
}

export const MathInline = Node.create({
  name: 'mathInline',

  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      latex: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-latex') || '',
        renderHTML: (attributes) => {
          if (!attributes.latex) return {}
          return { 'data-latex': attributes.latex }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="mathInline"]',
        getAttrs: (element) => {
          const el = element as HTMLElement
          return { latex: el.getAttribute('data-latex') || '' }
        },
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes({ 'data-type': 'mathInline' }, HTMLAttributes),
      (node.attrs.latex as string) || '',
    ]
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('span')
      dom.className = 'math-inline'
      dom.contentEditable = 'false'

      const render = (latex: string) => {
        if (latex) {
          try {
            katex.render(latex, dom, {
              throwOnError: false,
              displayMode: false,
            })
            dom.classList.remove('math-error')
          } catch {
            dom.textContent = `$${latex}$`
            dom.classList.add('math-error')
          }
        } else {
          dom.textContent = '$$'
        }
      }

      render(node.attrs.latex as string)

      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'mathInline') return false
          render(updatedNode.attrs.latex as string)
          return true
        },
      }
    }
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          state.write(`$${node.attrs.latex}$`)
        },
      },
    }
  },
})

export const MathBlock = Node.create({
  name: 'mathBlock',

  group: 'block',
  atom: true,

  addAttributes() {
    return {
      latex: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-latex') || '',
        renderHTML: (attributes) => {
          if (!attributes.latex) return {}
          return { 'data-latex': attributes.latex }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="mathBlock"]',
        getAttrs: (element) => {
          const el = element as HTMLElement
          return { latex: el.getAttribute('data-latex') || '' }
        },
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes({ 'data-type': 'mathBlock' }, HTMLAttributes),
      (node.attrs.latex as string) || '',
    ]
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div')
      dom.className = 'math-block'
      dom.contentEditable = 'false'

      const render = (latex: string) => {
        if (latex) {
          try {
            katex.render(latex, dom, {
              throwOnError: false,
              displayMode: true,
            })
            dom.classList.remove('math-error')
          } catch {
            dom.textContent = `$$${latex}$$`
            dom.classList.add('math-error')
          }
        } else {
          dom.textContent = '$$$$'
        }
      }

      render(node.attrs.latex as string)

      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'mathBlock') return false
          render(updatedNode.attrs.latex as string)
          return true
        },
      }
    }
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          state.write('$$\n')
          state.write(node.attrs.latex)
          state.write('\n$$')
          state.closeBlock(node)
        },
      },
    }
  },
})
