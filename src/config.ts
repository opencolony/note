import path from 'path'
import fs from 'fs'
import markdownExtensions from 'markdown-extensions'

export interface ColonynoteConfig {
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
  ignore: {
    enableIgnoreFiles: boolean
    ignoreFileNames: string[]
    patterns: string[]
  }
}

const defaultConfig: ColonynoteConfig = {
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
  ignore: {
    enableIgnoreFiles: true,
    ignoreFileNames: ['.colonynoteignore', '.gitignore'],
    patterns: [],
  },
}

export async function loadConfig(configPath?: string): Promise<ColonynoteConfig> {
  const config = { ...defaultConfig }

  const possiblePaths = configPath
    ? [configPath]
    : [
        path.join(process.cwd(), 'colonynote.config.js'),
        path.join(process.cwd(), 'colonynote.config.mjs'),
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
      if (userConfig.ignore) {
        config.ignore = { ...defaultConfig.ignore, ...userConfig.ignore }
      }
      break
      } catch (e) {
        console.warn(`Failed to load config from ${p}:`, e)
      }
    }
  }

  const userConfigPath = path.join(config.root, 'colonynote.user.json')
  if (fs.existsSync(userConfigPath)) {
    try {
      const userSettings = JSON.parse(fs.readFileSync(userConfigPath, 'utf-8'))
      if (typeof userSettings.showHiddenFiles === 'boolean') {
        config.showHiddenFiles = userSettings.showHiddenFiles
      }
      if (Array.isArray(userSettings.allowedExtensions)) {
        config.allowedExtensions = userSettings.allowedExtensions
      }
      if (userSettings.ignore) {
        if (typeof userSettings.ignore.enableIgnoreFiles === 'boolean') {
          config.ignore.enableIgnoreFiles = userSettings.ignore.enableIgnoreFiles
        }
        if (Array.isArray(userSettings.ignore.ignoreFileNames)) {
          config.ignore.ignoreFileNames = userSettings.ignore.ignoreFileNames
        }
        if (Array.isArray(userSettings.ignore.patterns)) {
          config.ignore.patterns = userSettings.ignore.patterns
        }
      }
    } catch (e) {
      console.warn(`Failed to load user config from ${userConfigPath}:`, e)
    }
  }

  config.root = path.resolve(config.root)

  return config
}

export function saveUserConfig(root: string, settings: { showHiddenFiles?: boolean; allowedExtensions?: string[]; ignore?: { enableIgnoreFiles?: boolean; ignoreFileNames?: string[]; patterns?: string[] } }): void {
  const userConfigPath = path.join(root, 'colonynote.user.json')
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
    if (settings.ignore) {
      const existingIgnore = (userSettings.ignore as Record<string, unknown> | undefined) || {}
      if (typeof settings.ignore.enableIgnoreFiles === 'boolean') {
        existingIgnore.enableIgnoreFiles = settings.ignore.enableIgnoreFiles
      }
      if (Array.isArray(settings.ignore.ignoreFileNames)) {
        existingIgnore.ignoreFileNames = settings.ignore.ignoreFileNames
      }
      if (Array.isArray(settings.ignore.patterns)) {
        existingIgnore.patterns = settings.ignore.patterns
      }
      userSettings.ignore = existingIgnore
    }
    fs.writeFileSync(userConfigPath, JSON.stringify(userSettings, null, 2), 'utf-8')
  } catch (e) {
    console.error(`Failed to save user config to ${userConfigPath}:`, e)
    throw e
  }
}

export { defaultConfig }