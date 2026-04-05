import path from 'path'
import fs from 'fs'
import { minimatch } from 'minimatch'

/**
 * 单条忽略规则
 */
interface IgnoreRule {
  pattern: string       // 原始模式字符串（已处理否定和目录标记）
  rawPattern: string    // 原始模式字符串
  isNegation: boolean   // 是否为否定模式（以 ! 开头）
  isDirectory: boolean  // 是否只匹配目录（以 / 结尾）
  basePath: string      // 规则所在 .ignore 文件的目录路径（用于相对模式）
  isAbsolute: boolean   // 是否为绝对路径模式（以 / 开头）
}

/**
 * 忽略规则集合（单个 .ignore 文件的内容）
 */
interface IgnoreFile {
  filePath: string      // .ignore 文件的绝对路径
  basePath: string      // .ignore 文件所在目录
  rules: IgnoreRule[]   // 解析后的规则列表
}

/**
 * 忽略匹配器配置
 */
export interface IgnoreConfig {
  /** 是否启用 .colonynoteignore 文件查找 */
  enableIgnoreFiles: boolean
  /** .ignore 文件名称列表（按优先级排序） */
  ignoreFileNames: string[]
  /** 全局忽略模式（来自配置文件） */
  globalPatterns: string[]
}

/**
 * 默认忽略配置
 */
export const defaultIgnoreConfig: IgnoreConfig = {
  enableIgnoreFiles: true,
  ignoreFileNames: ['.colonynoteignore', '.gitignore'],
  globalPatterns: [],
}

/**
 * 忽略匹配器 - 管理所有忽略规则并提供匹配功能
 */
export class IgnoreMatcher {
  private ignoreFiles: Map<string, IgnoreFile> = new Map()
  private globalRules: IgnoreRule[] = []
  private rootPath: string
  private config: IgnoreConfig

  constructor(rootPath: string, config: IgnoreConfig = defaultIgnoreConfig) {
    this.rootPath = path.resolve(rootPath)
    this.config = config
    this.globalRules = this.parsePatterns(config.globalPatterns, this.rootPath)
  }

  /**
   * 解析忽略模式字符串为规则对象
   */
  private parsePatterns(patterns: string[], basePath: string): IgnoreRule[] {
    const rules: IgnoreRule[] = []

    for (const rawPattern of patterns) {
      // 跳过空行和注释
      const trimmed = rawPattern.trim()
      if (!trimmed || trimmed.startsWith('#')) continue

      const isNegation = trimmed.startsWith('!')
      const isDirectory = trimmed.endsWith('/')

      // 处理模式字符串
      let pattern = trimmed

      // 处理否定模式：移除开头的 !
      if (isNegation) {
        pattern = pattern.slice(1)
      }

      // 处理目录标记：暂时保留，匹配时再处理
      const cleanPattern = isDirectory ? pattern.slice(0, -1) : pattern

      // 判断是否为绝对路径模式（以 / 开头）
      const isAbsolute = cleanPattern.startsWith('/')

      const rule: IgnoreRule = {
        pattern: cleanPattern,
        rawPattern: trimmed,
        isNegation,
        isDirectory,
        basePath,
        isAbsolute,
      }

      rules.push(rule)
    }

    return rules
  }

  /**
   * 加载指定路径的 .ignore 文件
   */
  loadIgnoreFile(filePath: string): boolean {
    try {
      if (!fs.existsSync(filePath)) return false

      const content = fs.readFileSync(filePath, 'utf-8')
      const lines = content.split(/\r?\n/)
      const basePath = path.dirname(filePath)

      const ignoreFile: IgnoreFile = {
        filePath,
        basePath,
        rules: this.parsePatterns(lines, basePath),
      }

      this.ignoreFiles.set(filePath, ignoreFile)
      return true
    } catch (e) {
      console.error(`Failed to load ignore file ${filePath}:`, e)
      return false
    }
  }

  /**
   * 就近查找并加载 .ignore 文件
   * 从 targetPath 向上查找，直到 rootPath
   */
  findAndLoadIgnoreFiles(targetPath: string): void {
    if (!this.config.enableIgnoreFiles) return

    let currentPath = path.resolve(targetPath)

    // 如果是文件，从其父目录开始查找
    try {
      const stat = fs.statSync(currentPath)
      if (stat.isFile()) {
        currentPath = path.dirname(currentPath)
      }
    } catch {
      // 路径不存在，假设是目录
    }

    while (currentPath.startsWith(this.rootPath) && currentPath.length >= this.rootPath.length) {
      for (const fileName of this.config.ignoreFileNames) {
        const ignoreFilePath = path.join(currentPath, fileName)

        // 避免重复加载
        if (!this.ignoreFiles.has(ignoreFilePath)) {
          this.loadIgnoreFile(ignoreFilePath)
        }
      }

      // 向上一级目录
      const parentPath = path.dirname(currentPath)
      if (parentPath === currentPath) break // 已到达根目录
      currentPath = parentPath
    }
  }

  /**
   * 检查单个规则是否匹配目标路径
   */
  private matchRule(rule: IgnoreRule, targetPath: string, isDirectory: boolean): boolean {
    const relativePath = path.relative(rule.basePath, targetPath)

    if (rule.isAbsolute) {
      const patternWithoutSlash = rule.pattern.replace(/^\//, '')

      if (relativePath === patternWithoutSlash ||
          relativePath.startsWith(patternWithoutSlash + path.sep)) {
        return true
      }

      return minimatch(relativePath, patternWithoutSlash, { dot: true })
    }

    if (!rule.pattern.includes('/')) {
      const basename = path.basename(targetPath)

      if (rule.isDirectory) {
        if (minimatch(basename, rule.pattern, { dot: true })) {
          return true
        }

        const parts = relativePath.split(path.sep)
        for (let i = 0; i < parts.length; i++) {
          if (minimatch(parts[i], rule.pattern, { dot: true })) {
            return true
          }
        }
      } else {
        if (minimatch(basename, rule.pattern, { dot: true })) {
          return true
        }
      }
      return false
    }

    return minimatch(relativePath, rule.pattern, { dot: true })
  }

  /**
   * 检查路径是否被忽略
   * 返回 true 表示应该忽略，false 表示不忽略
   */
  isIgnored(targetPath: string, isDirectory: boolean = false): boolean {
    const absolutePath = path.resolve(targetPath)

    // 确保路径在 root 内
    if (!absolutePath.startsWith(this.rootPath)) return false

    // 就近查找并加载 .ignore 文件
    this.findAndLoadIgnoreFiles(absolutePath)

    // 收集所有相关规则（按优先级排序）
    // 规则优先级：就近的 .ignore 文件 > 上层的 .ignore 文件 > 全局配置
    const allRules: IgnoreRule[] = []

    // 1. 添加全局规则（最低优先级）
    allRules.push(...this.globalRules)

    // 2. 添加 .ignore 文件规则（按目录层级从根到当前）
    const sortedIgnoreFiles = Array.from(this.ignoreFiles.values())
      .sort((a, b) => {
        // 按 basePath 深度排序：根目录优先级低，近目录优先级高
        const depthA = a.basePath.split(path.sep).length
        const depthB = b.basePath.split(path.sep).length
        return depthA - depthB
      })

    for (const ignoreFile of sortedIgnoreFiles) {
      // 只考虑影响当前路径的规则文件
      if (absolutePath.startsWith(ignoreFile.basePath)) {
        allRules.push(...ignoreFile.rules)
      }
    }

    // 3. 应用规则（后出现的规则优先级更高）
    let shouldIgnore = false

    for (const rule of allRules) {
      if (this.matchRule(rule, absolutePath, isDirectory)) {
        // 否定规则取消忽略
        if (rule.isNegation) {
          shouldIgnore = false
        } else {
          shouldIgnore = true
        }
      }
    }

    return shouldIgnore
  }

  /**
   * 清除缓存的 .ignore 文件（用于重新加载）
   */
  clearCache(): void {
    this.ignoreFiles.clear()
  }

  updateGlobalPatterns(patterns: string[]): void {
    this.globalRules = this.parsePatterns(patterns, this.rootPath)
  }

  /**
   * 获取已加载的 .ignore 文件列表
   */
  getLoadedIgnoreFiles(): string[] {
    return Array.from(this.ignoreFiles.keys())
  }
}
