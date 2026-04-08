import { useState, useCallback, useRef } from 'react'

interface UseFileOptions {
  onSave?: (filePath: string) => void
  onSaveStart?: (filePath: string, sessionId: string) => void
  onError?: (error: Error, filePath: string) => void
}

export function useFile(options: UseFileOptions = {}) {
  const [content, setContent] = useState('')
  const [path, setPath] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const saveTimeoutRef = useRef<number | null>(null)
  const lastSavedContentRef = useRef<string>('')
  // 用于区分自己保存和外部修改的会话标识
  const saveSessionRef = useRef<string | null>(null)

  const optionsRef = useRef(options)
  optionsRef.current = options

  const load = useCallback(async (filePath: string, rootPath?: string) => {
    try {
      const url = rootPath 
        ? `/api/files${filePath}?root=${encodeURIComponent(rootPath)}`
        : `/api/files${filePath}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to load file')
      const text = await res.text()
      setContent(text)
      setPath(filePath)
      lastSavedContentRef.current = text
      setStatus('idle')
    } catch (e) {
      optionsRef.current.onError?.(e instanceof Error ? e : new Error('Unknown error'), filePath)
    }
  }, [])

  const save = useCallback(async (newContent: string, filePath: string | null = path, rootPath?: string) => {
    if (!filePath) return

    // 生成保存会话标识，用于区分自己保存和外部修改
    const sessionId = `${filePath}:${Date.now()}`
    saveSessionRef.current = sessionId

    setStatus('saving')
    optionsRef.current.onSaveStart?.(filePath, sessionId)
    try {
      const url = rootPath
        ? `/api/files${filePath}?root=${encodeURIComponent(rootPath)}`
        : `/api/files${filePath}`
      const res = await fetch(url, {
        method: 'POST',
        body: newContent,
      })
      if (!res.ok) throw new Error('Failed to save')
      setStatus('saved')
      lastSavedContentRef.current = newContent
      optionsRef.current.onSave?.(filePath)
    } catch (e) {
      setStatus('error')
      optionsRef.current.onError?.(e instanceof Error ? e : new Error('Unknown error'), filePath)
    }
  }, [path])

  const updateContent = useCallback((newContent: string, debounceMs: number = 300) => {
    setContent(newContent)
    setStatus('idle')

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      save(newContent)
    }, debounceMs)
  }, [save])

  const isDirty = content !== lastSavedContentRef.current

  // 获取当前保存会话标识，用于验证 WebSocket 通知是否来自自己
  const getSaveSession = useCallback(() => saveSessionRef.current, [])

  return {
    content,
    path,
    status,
    isDirty,
    load,
    save,
    updateContent,
    setContent,
    setPath,
    getSaveSession,
  }
}