export interface OpenTab {
  key: string
  path: string
  rootPath: string | null
  content: string
  lastSavedContent: string
  status: 'idle' | 'saving' | 'saved' | 'error'
  saveSessionId: string | null
  lastSelfSaveTime: number | null
}
