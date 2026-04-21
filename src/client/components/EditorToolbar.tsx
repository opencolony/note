import { type Editor } from '@tiptap/react'
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Code,
} from 'lucide-react'

interface EditorToolbarProps {
  editor: Editor | null
  variant?: 'desktop' | 'mobile'
}

interface ToolbarButtonConfig {
  icon: React.ComponentType<{ className?: string }>
  label: string
  isActive: (editor: Editor) => boolean
  action: (editor: Editor) => void
}

const toolbarButtons: ToolbarButtonConfig[] = [
  {
    icon: Bold,
    label: '粗体',
    isActive: (editor) => editor.isActive('bold'),
    action: (editor) => editor.chain().focus().toggleBold().run(),
  },
  {
    icon: Italic,
    label: '斜体',
    isActive: (editor) => editor.isActive('italic'),
    action: (editor) => editor.chain().focus().toggleItalic().run(),
  },
  {
    icon: Heading1,
    label: '标题 1',
    isActive: (editor) => editor.isActive('heading', { level: 1 }),
    action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    icon: Heading2,
    label: '标题 2',
    isActive: (editor) => editor.isActive('heading', { level: 2 }),
    action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    icon: List,
    label: '无序列表',
    isActive: (editor) => editor.isActive('bulletList'),
    action: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    icon: ListOrdered,
    label: '有序列表',
    isActive: (editor) => editor.isActive('orderedList'),
    action: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    icon: Quote,
    label: '引用',
    isActive: (editor) => editor.isActive('blockquote'),
    action: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    icon: Code,
    label: '代码块',
    isActive: (editor) => editor.isActive('codeBlock'),
    action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
]

export function EditorToolbar({ editor, variant = 'mobile' }: EditorToolbarProps) {
  if (!editor) {
    return null
  }

  return (
    <div className={`editor-toolbar editor-toolbar-${variant}`}>
      {toolbarButtons.map((btn) => {
        const Icon = btn.icon
        const active = btn.isActive(editor)
        return (
          <button
            key={btn.label}
            type="button"
            contentEditable={false}
            className={`editor-toolbar-btn ${active ? 'active' : ''}`}
            onClick={() => btn.action(editor)}
            title={btn.label}
            aria-label={btn.label}
            aria-pressed={active}
          >
            <Icon className="size-5" />
          </button>
        )
      })}
    </div>
  )
}
