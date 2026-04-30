import { useState, memo, useEffect, useRef } from 'react'
import { Folder, FileText } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet'
import { Button } from './ui/button'
import { Input } from './ui/input'

interface CreateFileModalProps {
  visible: boolean
  onClose: () => void
  onCreate: (name: string, isDirectory: boolean, parentPath: string) => void
  currentDir: string
}

export const CreateFileModal = memo(function CreateFileModal({ visible, onClose, onCreate, currentDir }: CreateFileModalProps) {
  const [name, setName] = useState('')
  const [isDirectory, setIsDirectory] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (visible) {
      setIsDirectory(false)
      setName('.md')
      setTimeout(() => {
        inputRef.current?.setSelectionRange(0, 0)
        inputRef.current?.focus()
      }, 50)
    }
  }, [visible])

  const handleSubmit = () => {
    if (name.trim()) {
      onCreate(name.trim(), isDirectory, currentDir)
      setName('')
      onClose()
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  const displayPath = currentDir ? currentDir.split('/').filter(Boolean).join(' / ') : '目录'

  return (
    <Sheet open={visible} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl" noClose>
        <SheetHeader className="text-left">
          <SheetTitle>新建</SheetTitle>
          <SheetDescription>
            位置: {displayPath}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          <div className="flex gap-2">
            <Button
              variant={isDirectory ? 'outline' : 'default'}
              onClick={() => {
                setIsDirectory(false)
                if (!name) {
                  setName('.md')
                  setTimeout(() => {
                    inputRef.current?.setSelectionRange(0, 0)
                    inputRef.current?.focus()
                  }, 0)
                }
              }}
              className="flex-1 h-11"
            >
              <FileText className="size-4 mr-2" />
              Markdown
            </Button>
            <Button
              variant={isDirectory ? 'default' : 'outline'}
              onClick={() => {
                setIsDirectory(true)
                if (name === '.md') {
                  setName('')
                }
              }}
              className="flex-1 h-11"
            >
              <Folder className="size-4 mr-2" />
              文件夹
            </Button>
          </div>
          <Input
            ref={inputRef}
            placeholder={isDirectory ? '文件夹名称' : '文件名称，如 note.md'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-11"
            autoFocus
          />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={onClose}>取消</Button>
            <Button onClick={handleSubmit}>创建</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
})