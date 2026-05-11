export interface OpenTab {
  key: string
  path: string
  rootPath: string | null
  content: string
  lastSavedContent: string
  status: 'idle' | 'saving' | 'saved' | 'error'
  saveSessionId: string | null
  lastSelfSaveTime: number | null
  /** 是否被手动固定（pin），固定的 tab 不会被自动替换 */
  isPinned: boolean
  /** 是否为预览 tab，预览 tab 打开新文件时会被替换 */
  isPreview: boolean
}
