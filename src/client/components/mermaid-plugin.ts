import mermaid from 'mermaid'
import { codeBlockConfig, type CodeBlockConfig } from '@milkdown/kit/component/code-block'
import { Editor } from '@milkdown/kit/core'
import { codeBlockSchema } from '@milkdown/kit/preset/commonmark'

let mermaidInitialized = false

function initMermaid() {
  if (!mermaidInitialized) {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
    })
    mermaidInitialized = true
  }
}

async function renderMermaid(content: string): Promise<string> {
  if (!content.trim()) {
    return '<div class="mermaid-placeholder" style="padding: 20px; text-align: center; color: #999;">Mermaid Diagram</div>'
  }

  try {
    initMermaid()
    const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const { svg } = await mermaid.render(id, content)
    return svg
  } catch (error) {
    return `<div class="mermaid-error" style="padding: 20px; color: #e74c3c;">Invalid Mermaid syntax</div>`
  }
}

const mermaidBlockSchema = codeBlockSchema.extendSchema((prev) => {
  return (ctx) => {
    const baseSchema = prev(ctx)
    return {
      ...baseSchema,
      toMarkdown: {
        match: baseSchema.toMarkdown.match,
        runner: (state, node) => {
          const language = node.attrs.language ?? ''
          if (language.toLowerCase() === 'mermaid') {
            const text = node.content.firstChild?.text || ''
            state.addNode('code', undefined, text, { lang: 'mermaid' })
          } else {
            return baseSchema.toMarkdown.runner(state, node)
          }
        },
      },
    }
  }
})

export const mermaidFeature = (editor: Editor) => {
  editor.config((ctx) => {
    ctx.update(codeBlockConfig.key, (prev): CodeBlockConfig => {
      const originalRenderPreview = prev.renderPreview
      return {
        ...prev,
        renderPreview: (language: string, content: string, applyPreview: (value: string | HTMLElement | null) => void) => {
          if (language.toLowerCase() === 'mermaid') {
            renderMermaid(content).then((svg) => {
              applyPreview(svg)
            })
            return null
          }
          return originalRenderPreview(language, content, applyPreview)
        },
      }
    })
  }).use(mermaidBlockSchema)
}