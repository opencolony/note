import { useState, useMemo } from 'react'
import { ArrowLeft, FlaskConical, Sun, Moon } from 'lucide-react'
import { Button } from '@/client/components/ui/button'
import { cn } from '@/client/lib/utils'
import { playgroundCases } from '@/client/components/playground/registry'
import type { PlaygroundVariant } from '@/client/components/playground/types'

interface PlaygroundProps {
  onClose?: () => void
}

function VariantCard({ variant, index }: { variant: PlaygroundVariant; index: number }) {
  const [previewTheme, setPreviewTheme] = useState<'light' | 'dark'>('light')

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      {/* Card Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex items-center justify-center size-6 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">
            {String.fromCharCode(65 + index)}
          </span>
          <span className="text-sm font-medium truncate">{variant.name}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 min-h-7 min-w-7 shrink-0"
          onClick={() => setPreviewTheme(prev => prev === 'light' ? 'dark' : 'light')}
          title={previewTheme === 'light' ? '切换到深色预览' : '切换到浅色预览'}
        >
          {previewTheme === 'light' ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
        </Button>
      </div>

      {/* Description */}
      {variant.description && (
        <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border bg-muted/10">
          {variant.description}
        </div>
      )}

      {/* Preview Area */}
      <div
        className={cn(
          "p-6 flex items-center justify-center min-h-[120px]",
          previewTheme === 'dark' ? "bg-neutral-900" : "bg-white"
        )}
      >
        {variant.component}
      </div>
    </div>
  )
}

export default function Playground({ onClose }: PlaygroundProps) {
  const [selectedCaseId, setSelectedCaseId] = useState<string>(playgroundCases[0]?.id || '')

  const selectedCase = useMemo(() =>
    playgroundCases.find(c => c.id === selectedCaseId) || playgroundCases[0]
  , [selectedCaseId])

  return (
    <div className="flex flex-col h-full w-full bg-background">
      {/* Top Bar */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30 shrink-0">
        <Button variant="ghost" size="icon" className="size-8 min-h-8 min-w-8" onClick={onClose} title="返回编辑器">
          <ArrowLeft className="size-4" />
        </Button>
        <FlaskConical className="size-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold truncate">组件实验</h1>
        </div>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded shrink-0">
          DEV
        </span>
      </header>

      {/* Case Tabs */}
      {playgroundCases.length > 0 && (
        <div className="flex items-center gap-1 px-4 py-2 border-b border-border shrink-0 overflow-x-auto scrollbar-none"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {playgroundCases.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCaseId(c.id)}
              className={cn(
                "relative px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0",
                selectedCaseId === c.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {c.name}
              {selectedCaseId === c.id && c.variants.length > 0 && (
                <span className="ml-1.5 text-[10px] opacity-70">{c.variants.length}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Preview Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {selectedCase ? (
          <div className="space-y-4">
            {selectedCase.description && (
              <p className="text-sm text-muted-foreground">{selectedCase.description}</p>
            )}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {selectedCase.variants.map((variant, i) => (
                <VariantCard key={i} variant={variant} index={i} />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <FlaskConical className="size-12 mb-4 opacity-40" />
            <p className="text-sm">暂无实验</p>
            <p className="text-xs mt-1">在 playground/cases/ 目录下创建 case 文件</p>
          </div>
        )}
      </main>
    </div>
  )
}
