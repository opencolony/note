import path from 'path'
import fs from 'fs'
import markdownExtensions from 'markdown-extensions'

export interface ColonydocConfig {
  root: string
  port: number
  host: string
  allowedExtensions: string[]
  showHiddenFiles: boolean
  theme: {
    default: 'light' | 'dark' | 'system'
  }
  editor: {
    autosave: boolean
    debounceMs: number
  }
}

const defaultConfig: ColonydocConfig = {
  root: process.cwd(),
  port: 5787,
  host: '0.0.0.0',
  allowedExtensions: markdownExtensions.map((ext) => `.${ext}`),
  showHiddenFiles: false,
  theme: {
    default: 'system',
  },
  editor: {
    autosave: true,
    debounceMs: 300,
  },
}

export async function loadConfig(configPath?: string): Promise<ColonydocConfig> {
  const config = { ...defaultConfig }

  const possiblePaths = configPath
    ? [configPath]
    : [
        path.join(process.cwd(), 'colonydoc.config.js'),
        path.join(process.cwd(), 'colonydoc.config.mjs'),
      ]

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        const module = await import(p)
        const userConfig = module.default || module
        Object.assign(config, userConfig)
        if (userConfig.theme) {
          config.theme = { ...defaultConfig.theme, ...userConfig.theme }
        }
        if (userConfig.editor) {
          config.editor = { ...defaultConfig.editor, ...userConfig.editor }
        }
        break
      } catch (e) {
        console.warn(`Failed to load config from ${p}:`, e)
      }
    }
  }

  const userConfigPath = path.join(config.root, 'colonydoc.user.json')
  if (fs.existsSync(userConfigPath)) {
    try {
      const userSettings = JSON.parse(fs.readFileSync(userConfigPath, 'utf-8'))
      if (typeof userSettings.showHiddenFiles === 'boolean') {
        config.showHiddenFiles = userSettings.showHiddenFiles
      }
      if (Array.isArray(userSettings.allowedExtensions)) {
        config.allowedExtensions = userSettings.allowedExtensions
      }
    } catch (e) {
      console.warn(`Failed to load user config from ${userConfigPath}:`, e)
    }
  }

  config.root = path.resolve(config.root)

  return config
}

export function saveUserConfig(root: string, settings: { showHiddenFiles?: boolean; allowedExtensions?: string[] }): void {
  const userConfigPath = path.join(root, 'colonydoc.user.json')
  try {
    let userSettings: Record<string, unknown> = {}
    if (fs.existsSync(userConfigPath)) {
      userSettings = JSON.parse(fs.readFileSync(userConfigPath, 'utf-8'))
    }
    if (typeof settings.showHiddenFiles === 'boolean') {
      userSettings.showHiddenFiles = settings.showHiddenFiles
    }
    if (Array.isArray(settings.allowedExtensions)) {
      userSettings.allowedExtensions = settings.allowedExtensions
    }
    fs.writeFileSync(userConfigPath, JSON.stringify(userSettings, null, 2), 'utf-8')
  } catch (e) {
    console.error(`Failed to save user config to ${userConfigPath}:`, e)
    throw e
  }
}

export { defaultConfig }