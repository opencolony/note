import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, X, Tags } from 'lucide-react'
import { load, dump } from 'js-yaml'

function AutoResizeTextarea({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [value])

  return (
    <textarea
      ref={ref}
      className={className}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={1}
    />
  )
}

interface FrontmatterPanelProps {
  rawFrontmatter: string | null
  onFrontmatterChange: (raw: string | null) => void
}

interface Field {
  key: string
  value: string
}

function fieldsFromData(data: Record<string, unknown>): Field[] {
  return Object.entries(data).map(([key, value]) => ({
    key,
    value: value instanceof Date
      ? value.toISOString().split('T')[0]
      : Array.isArray(value)
        ? value.map(v => String(v ?? '')).join(', ')
        : typeof value === 'object' && value !== null
          ? JSON.stringify(value)
          : String(value ?? ''),
  }))
}

function dataFromFields(fields: Field[]): Record<string, unknown> {
  const data: Record<string, unknown> = {}
  for (const f of fields) {
    if (!f.key) continue
    data[f.key] = f.value
  }
  return data
}

function parseFmData(raw: string): Record<string, unknown> {
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

export function FrontmatterPanel({ rawFrontmatter, onFrontmatterChange }: FrontmatterPanelProps) {
  const [fields, setFields] = useState<Field[]>([])
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // Sync from rawFrontmatter prop
  useEffect(() => {
    if (!rawFrontmatter) {
      setFields([])
      return
    }
    const data = parseFmData(rawFrontmatter)
    setFields(fieldsFromData(data))
  }, [rawFrontmatter])

  const writeBack = useCallback((newFields: Field[]) => {
    const data = dataFromFields(newFields)
    const hasData = Object.keys(data).length > 0
    if (hasData) {
      const raw = (dump(data, { lineWidth: -1 }) as string).trim()
      onFrontmatterChange(raw)
    } else {
      onFrontmatterChange(null)
    }
  }, [onFrontmatterChange])

  const updateFieldKey = useCallback((index: number, newKey: string) => {
    setFields(prev => {
      const updated = prev.map((f, i) => i === index ? { ...f, key: newKey } : f)
      writeBack(updated)
      return updated
    })
  }, [writeBack])

  const updateFieldValue = useCallback((index: number, newValue: string) => {
    setFields(prev => {
      const updated = prev.map((f, i) => i === index ? { ...f, value: newValue } : f)
      writeBack(updated)
      return updated
    })
  }, [writeBack])

  const addField = useCallback(() => {
    setFields(prev => {
      const updated = [...prev, { key: '', value: '' }]
      writeBack(updated)
      return updated
    })
  }, [writeBack])

  const removeField = useCallback((index: number) => {
    setFields(prev => {
      const updated = prev.filter((_, i) => i !== index)
      writeBack(updated)
      return updated
    })
  }, [writeBack])

  return (
    <div className="frontmatter-panel">
      {/* Header */}
      <div className="frontmatter-panel-header">
        <div className="frontmatter-panel-header-left">
          <Tags className="frontmatter-panel-header-icon" />
          <span className="frontmatter-panel-header-title">文档属性</span>
        </div>
        <span className="frontmatter-panel-header-count">{fields.length} 项</span>
      </div>

      {/* Table Header */}
      <div className="frontmatter-table-header">
        <div className="frontmatter-table-header-cell frontmatter-table-header-key">属性</div>
        <div className="frontmatter-table-header-cell frontmatter-table-header-value">值</div>
        <div className="frontmatter-table-header-cell frontmatter-table-header-action" />
      </div>

      {/* Fields */}
      <div className="frontmatter-table-body">
        {fields.length === 0 ? (
          <div className="frontmatter-empty-state">
            暂无属性，点击下方添加
          </div>
        ) : (
          fields.map((field, index) => (
            <div
              key={index}
              className="frontmatter-table-row"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div className={`frontmatter-table-cell frontmatter-table-cell-key ${hoveredIndex === index ? 'hovered' : ''}`}>
                <input
                  className="frontmatter-key-input"
                  value={field.key}
                  onChange={(e) => updateFieldKey(index, e.target.value)}
                  placeholder="key"
                />
              </div>
              <div className={`frontmatter-table-cell frontmatter-table-cell-value ${hoveredIndex === index ? 'hovered' : ''}`}>
                <AutoResizeTextarea
                  className="frontmatter-value-input"
                  value={field.value}
                  onChange={(v) => updateFieldValue(index, v)}
                  placeholder="value"
                />
              </div>
              <div className={`frontmatter-table-cell frontmatter-table-cell-action ${hoveredIndex === index ? 'hovered' : ''}`}>
                <button
                  className="frontmatter-remove-btn"
                  onClick={() => removeField(index)}
                  title="删除字段"
                  style={{ opacity: hoveredIndex === index ? 1 : 0 }}
                >
                  <X className="size-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Button */}
      <button className="frontmatter-add-btn" onClick={addField}>
        <Plus className="size-3" />
        添加字段
      </button>
    </div>
  )
}
