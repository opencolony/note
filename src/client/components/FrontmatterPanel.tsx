import { useState, useEffect, useCallback } from 'react'
import { Plus, X } from 'lucide-react'
import { load, dump } from 'js-yaml'

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

  if (fields.length === 0) return null

  return (
    <div className="frontmatter-panel">
      <div className="frontmatter-panel-header">Metadata</div>
      <div className="frontmatter-fields">
        {fields.map((field, index) => (
          <div key={index} className="frontmatter-field">
            <input
              className="frontmatter-key-input"
              value={field.key}
              onChange={(e) => updateFieldKey(index, e.target.value)}
              placeholder="key"
            />
            <span className="frontmatter-separator">:</span>
            <input
              className="frontmatter-value-input"
              value={field.value}
              onChange={(e) => updateFieldValue(index, e.target.value)}
              placeholder="value"
            />
            <button
              className="frontmatter-remove-btn"
              onClick={() => removeField(index)}
              title="删除字段"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
      <button className="frontmatter-add-btn" onClick={addField}>
        <Plus className="size-3.5" />
        添加字段
      </button>
    </div>
  )
}
