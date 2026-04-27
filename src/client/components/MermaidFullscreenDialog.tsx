import { useState, useMemo, memo, useEffect, useRef, useCallback } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw, X } from 'lucide-react'
import { cn } from '@/client/lib/utils'
import mermaid from 'mermaid'

const isDarkMode = () => document.documentElement.classList.contains('dark')

mermaid.initialize({
  startOnLoad: false,
  theme: isDarkMode() ? 'dark' : 'default',
  suppressErrorRendering: true,
})

interface MermaidFullscreenDialogProps {
  source: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSourceChange?: (source: string) => void
}

const MermaidChart = memo(function MermaidChart({
  svgContent,
  error,
  isLoading
}: {
  svgContent: string
  error: string
  isLoading: boolean
}) {
  return (
    <div className="mermaid-fullscreen-chart">
      {error ? (
        <div className="mermaid-error">{error}</div>
      ) : isLoading ? (
        <div className="mermaid-loading">渲染中...</div>
      ) : svgContent ? (
        <div className="mermaid-fullscreen-svg-container" dangerouslySetInnerHTML={{ __html: svgContent }} />
      ) : null}
    </div>
  )
})

export function MermaidFullscreenDialog({ source, open, onOpenChange, onSourceChange }: MermaidFullscreenDialogProps) {
  const [isSourceMode, setIsSourceMode] = useState(false)
  const [svgContent, setSvgContent] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [themeKey, setThemeKey] = useState(0)

  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 })

  const [touchStart, setTouchStart] = useState<{ x: number; y: number; distance: number } | null>(null)
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const mermaidIdRef = useRef(`mermaid-fullscreen-${Math.random().toString(36).substr(2, 9)}`)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isSourceModeRef = useRef(isSourceMode)
  isSourceModeRef.current = isSourceMode
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 取消正在进行的防抖渲染，重置 isLoading
  useEffect(() => {
    const handleThemeChange = () => {
      setThemeKey(prev => prev + 1)
    }
    window.addEventListener('theme-change', handleThemeChange)
    return () => window.removeEventListener('theme-change', handleThemeChange)
  }, [])

  const cancelTimeout = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (!open) return
    setScale(1)
    setPosition({ x: 0, y: 0 })
    setIsLoading(true)
    setError('')
    // 对话框打开时立即渲染
    const currentTheme = isDarkMode() ? 'dark' : 'default'
    mermaid.initialize({ startOnLoad: false, theme: currentTheme, suppressErrorRendering: true })
    mermaidIdRef.current = `mermaid-fullscreen-${Math.random().toString(36).substr(2, 9)}`
    mermaid.render(mermaidIdRef.current, source)
      .then(({ svg }) => { setSvgContent(svg); setIsLoading(false) })
      .catch((err: any) => { setError(err.message || 'Mermaid render error'); setIsLoading(false) })
  }, [open, themeKey])

  // 源码模式下停止输入后自动重新渲染
  useEffect(() => {
    if (!isSourceMode) return
    cancelTimeout()
    debounceTimerRef.current = setTimeout(() => {
      const currentSource = textareaRef.current?.value ?? source
      setIsLoading(true)
      mermaidIdRef.current = `mermaid-fullscreen-${Math.random().toString(36).substr(2, 9)}`
      mermaid.render(mermaidIdRef.current, currentSource)
        .then(({ svg }) => { setSvgContent(svg); setIsLoading(false) })
        .catch((err: any) => { setError(err.message || 'Mermaid render error'); setIsLoading(false) })
    }, 800)
    return () => cancelTimeout()
  }, [isSourceMode, source, cancelTimeout, themeKey])

  const getDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setScale(prev => Math.min(Math.max(prev + delta, 0.5), 5))
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale <= 1) return
    setIsDragging(true)
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y
    }
  }, [scale, position])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    setPosition({
      x: dragStart.current.posX + dx,
      y: dragStart.current.posY + dy
    })
  }, [isDragging])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleDoubleClick = useCallback(() => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      const distance = getDistance(e.touches)
      setTouchStart({ x: 0, y: 0, distance })
    } else if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true)
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
  }, [scale])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStart) {
      e.preventDefault()
      const newDistance = getDistance(e.touches)
      const scaleDelta = (newDistance - touchStart.distance) / 200
      setScale(prev => Math.min(Math.max(prev + scaleDelta, 0.5), 5))
      setTouchStart({ x: 0, y: 0, distance: newDistance })
    } else if (e.touches.length === 1 && isDragging && lastTouchRef.current) {
      const dx = e.touches[0].clientX - lastTouchRef.current.x
      const dy = e.touches[0].clientY - lastTouchRef.current.y
      setPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }))
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
  }, [touchStart, isDragging])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      setTouchStart(null)
    }
    if (e.touches.length === 0) {
      setIsDragging(false)
      lastTouchRef.current = null
    }
  }, [])

  const zoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.25, 5))
  }, [])

  const zoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - 0.25, 0.5))
  }, [])

  const resetTransform = useCallback(() => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }, [])

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 animate-fade-in" />
        <DialogPrimitive.Content
          className="mermaid-fullscreen-dialog"
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            maxWidth: '100vw',
            maxHeight: '100vh',
            transform: 'none',
            borderRadius: 0,
            margin: 0,
            padding: 0,
            zIndex: 51
          }}
        >
          <DialogPrimitive.Title className="sr-only">Mermaid 图表全屏预览</DialogPrimitive.Title>
          <div className="mermaid-fullscreen-header">
            <div className="mermaid-fullscreen-controls">
              <button
                type="button"
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                onClick={() => {
                  if (isSourceModeRef.current) {
                    // 从源码视图切换回渲染视图时，从 textarea 读取当前值
                    cancelTimeout()
                    const currentSource = textareaRef.current?.value ?? source
                    setIsLoading(true)
                    setError('')
                    mermaidIdRef.current = `mermaid-fullscreen-${Math.random().toString(36).substr(2, 9)}`
                    const currentTheme = isDarkMode() ? 'dark' : 'default'
                    mermaid.initialize({
                      startOnLoad: false,
                      theme: currentTheme,
                      suppressErrorRendering: true,
                    })
                    mermaid.render(mermaidIdRef.current, currentSource)
                      .then(({ svg }) => {
                        setSvgContent(svg)
                        setIsLoading(false)
                        if (currentSource !== source) {
                          onSourceChange?.(currentSource)
                        }
                      })
                      .catch((err: any) => {
                        setError(err.message || 'Mermaid render error')
                        setIsLoading(false)
                      })
                    setIsSourceMode(false)
                  } else {
                    setIsSourceMode(true)
                  }
                }}
              >
                {isSourceMode ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                {isSourceMode ? '预览图表' : '查看源码'}
              </button>
            </div>
            <DialogPrimitive.Close className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
              <X className="size-4" />
              <span className="sr-only">关闭</span>
            </DialogPrimitive.Close>
          </div>

          <div className="mermaid-fullscreen-body">
            <div
              ref={containerRef}
              className="mermaid-fullscreen-content"
              style={{ 
                cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                width: '100%',
                height: '100%',
                touchAction: 'none'
              }}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onDoubleClick={handleDoubleClick}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <MermaidChart
                  svgContent={svgContent}
                  error={error}
                  isLoading={isLoading}
                />
              </div>

              <div className="mermaid-fullscreen-zoom-controls">
                <button onClick={zoomIn} title="放大"><ZoomIn className="size-4" /></button>
                <button onClick={zoomOut} title="缩小"><ZoomOut className="size-4" /></button>
                <button onClick={resetTransform} title="重置"><RotateCcw className="size-4" /></button>
              </div>
            </div>

            {isSourceMode && (
              <div className="mermaid-fullscreen-source-panel source-edit-mode">
                <textarea
                  key={source}
                  ref={textareaRef}
                  defaultValue={source}
                  className="mermaid-fullscreen-source-editor"
                  spellCheck={false}
                  onChange={() => {
                    // 每次输入都取消上一次的防抖，重新计时
                    cancelTimeout()
                    debounceTimerRef.current = setTimeout(() => {
                      const currentSource = textareaRef.current?.value ?? ''
                      setIsLoading(true)
                      mermaidIdRef.current = `mermaid-fullscreen-${Math.random().toString(36).substr(2, 9)}`
                      mermaid.render(mermaidIdRef.current, currentSource)
                        .then(({ svg }) => { setSvgContent(svg); setIsLoading(false) })
                        .catch((err: any) => { setError(err.message || 'Mermaid render error'); setIsLoading(false) })
                    }, 800)
                  }}
                />
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
