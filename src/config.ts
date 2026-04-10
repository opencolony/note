import path from 'path'
import fs from 'fs'
import os from 'os'
import markdownExtensions from 'markdown-extensions'

export interface RootConfig {
  path: string
  exclude?: string[]
  isCli?: boolean
}

export interface ColonynoteConfig {
  roots: RootConfig[]
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

export const DEFAULT_PORT = 5787
export const DEFAULT_HOST = '0.0.0.0'

export const DEFAULT_SENSITIVE_PATHS = [
  '.env',
  '.env.local',
  '.env.*.local',
  '*.key',
  '*.pem',
  '*.p12',
  '*.pfx',
  'id_rsa',
  'id_dsa',
  'id_ecdsa',
  'id_ed25519',
  '.ssh/',
  '.aws/',
  '.docker/',
  '.kube/',
  'credentials',
  'secrets',
  '.htpasswd',
  '.netrc',
  '.npmrc',
  '.pypirc',
  'token',
  'password',
  'secret',
]

const defaultConfig: ColonynoteConfig = {
  roots: [{ path: process.cwd() }],
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

export async function loadConfig(): Promise<ColonynoteConfig> {
  const config = { ...defaultConfig }
  const homeDir = os.homedir()
  const colonynoteDir = path.join(homeDir, '.colonynote')
  const configPath = path.join(colonynoteDir, 'config.json')

  if (fs.existsSync(configPath)) {
    try {
      const content = fs.readFileSync(configPath, 'utf-8')
      const userConfig = JSON.parse(content)

      // Handle legacy 'root' field (singular) -> convert to 'roots' array
      if (userConfig.root && !userConfig.roots) {
        userConfig.roots = [{ path: userConfig.root }]
        delete userConfig.root
      }

      // Merge user config, filtering out invalid fields
      const validFields = ['roots', 'showHiddenFiles', 'allowedExtensions', 'theme', 'editor', 'ignore']
      for (const field of validFields) {
        if (field in userConfig) {
          if (field === 'roots' && Array.isArray(userConfig.roots)) {
            config.roots = userConfig.roots
          } else if (field === 'showHiddenFiles' && typeof userConfig.showHiddenFiles === 'boolean') {
            config.showHiddenFiles = userConfig.showHiddenFiles
          } else if (field === 'allowedExtensions' && Array.isArray(userConfig.allowedExtensions)) {
            config.allowedExtensions = userConfig.allowedExtensions
          } else if (field === 'theme' && typeof userConfig.theme === 'object') {
            config.theme = { ...defaultConfig.theme, ...userConfig.theme }
          } else if (field === 'editor' && typeof userConfig.editor === 'object') {
            config.editor = { ...defaultConfig.editor, ...userConfig.editor }
          } else if (field === 'ignore' && typeof userConfig.ignore === 'object') {
            config.ignore = { ...defaultConfig.ignore, ...userConfig.ignore }
          }
        }
      }

      // Auto-fix: save cleaned config
      saveConfig(config)
    } catch (e) {
      console.warn(`Failed to load config from ${configPath}:`, e)
      console.log('Using default configuration')
    }
  }

  config.roots = config.roots.map((root) => ({
    ...root,
    path: path.resolve(root.path),
  }))

  return config
}

export function saveConfig(config: ColonynoteConfig): void {
  const homeDir = os.homedir()
  const colonynoteDir = path.join(homeDir, '.colonynote')
  const configPath = path.join(colonynoteDir, 'config.json')
  try {
    if (!fs.existsSync(colonynoteDir)) {
      fs.mkdirSync(colonynoteDir, { recursive: true })
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
  } catch (e) {
    console.error(`Failed to save config to ${configPath}:`, e)
    throw e
  }
}

export { defaultConfig }