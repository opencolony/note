import { Extension } from '@tiptap/core'
import { dump, load } from 'js-yaml'

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

export interface FrontmatterStorage {
  raw: string
  data: Record<string, unknown>
  hasFrontmatter: boolean
}

export const Frontmatter = Extension.create({
  name: 'frontmatter',
  priority: 100,

  addStorage() {
    return {
      raw: '',
      data: {},
      hasFrontmatter: false,
    }
  },

  onBeforeCreate() {
    const content = this.editor.options.content
    if (typeof content === 'string') {
      const match = content.match(FRONTMATTER_REGEX)
      if (match) {
        const storage = (this.editor.storage as Record<string, any>).frontmatter as FrontmatterStorage
        storage.raw = match[1].trim()
        const parsed = load(match[1])
        storage.data = (typeof parsed === 'object' && parsed !== null) ? parsed as Record<string, unknown> : {}
        storage.hasFrontmatter = Object.keys(storage.data).length > 0
        // Strip frontmatter so Markdown parser only sees body content
        this.editor.options.content = content.slice(match[0].length)
      }
    }
  },
})

export function extractFrontmatter(content: string): { frontmatter: string | null; body: string } {
  const match = content.match(FRONTMATTER_REGEX)
  if (!match) return { frontmatter: null, body: content }
  return { frontmatter: match[1].trim(), body: content.slice(match[0].length) }
}

export function parseFrontmatterData(raw: string): Record<string, unknown> {
  try {
    const parsed = load(raw)
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as Record<string, unknown>
    }
  } catch {
    // ignore parse errors
  }
  return {}
}
