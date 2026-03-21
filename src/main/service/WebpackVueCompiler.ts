import fs from 'fs'
import fsPromise from 'fs/promises'
import path from 'path'
import webpack from 'webpack'
import { VueLoaderPlugin } from 'vue-loader'
import log from '../util/LogUtil.ts'
import { CreateDirIfNotExists, RootDir } from '../util/FileSysUtil.ts'
import { PLUGIN_ROOT } from '../constant/PluginConstant.ts'
import { VueSourceContent } from '@shared/model/interface/SlotConfigs.ts'
import { isBlank } from '@shared/util/StringUtil.ts'

// 预解析 loader 路径，供 webpack 配置使用
const vueLoaderPath = require.resolve('vue-loader')
const styleLoaderPath = require.resolve('style-loader')
const cssLoaderPath = require.resolve('css-loader')

/**
 * 内存输出插件 - 捕获 webpack 编译结果到内存中
 */
class MemoryOutputPlugin {
  private jsContent: string | null = null
  private cssContent: string | null = null

  apply(compiler: webpack.Compiler): void {
    compiler.hooks.emit.tapAsync('MemoryOutputPlugin', (compilation, callback) => {
      try {
        // 获取编译产物
        const assets = compilation.assets

        for (const [name, asset] of Object.entries(assets)) {
          // 使用 buffer() 方法获取原始内容，更可靠
          let content: string
          if (typeof asset.buffer === 'function') {
            const buffer = asset.buffer()
            content = buffer.toString('utf-8')
          } else {
            const source = asset.source()
            content = typeof source === 'string' ? source : Buffer.from(source as Uint8Array).toString('utf-8')
          }

          if (name.endsWith('.js')) {
            this.jsContent = content
          } else if (name.endsWith('.css')) {
            this.cssContent = content
          }
        }
      } catch (error) {
        callback(error as Error)
        return
      }
      callback()
    })
  }

  getJsContent(): string | null {
    return this.jsContent
  }

  getCssContent(): string | null {
    return this.cssContent
  }
}

/**
 * Webpack Vue 源码编译器
 * 使用 webpack + vue-loader 将插件的 .vue 源码文件编译为可执行的 JavaScript 文件
 */
export default class WebpackVueCompiler {
  private static instance: WebpackVueCompiler
  private static PATH_DIR = 'plugin-cache'
  private static VUE_NAME = 'vue'
  /** 插件缓存目录 */
  private readonly cacheDir: string

  private constructor() {
    this.cacheDir = path.join(PLUGIN_ROOT, WebpackVueCompiler.PATH_DIR)
  }

  static getInstance(): WebpackVueCompiler {
    if (!WebpackVueCompiler.instance) {
      WebpackVueCompiler.instance = new WebpackVueCompiler()
    }
    return WebpackVueCompiler.instance
  }

  /**
   * 编译 Vue 源码文件
   * @param vueFilePath .vue 文件的绝对路径
   * @param pluginPublicId 插件 ID
   * @param slotId 插槽 ID
   * @returns 编译结果包含 JS 和 CSS 文件路径
   */
  async compile(vueFilePath: string, pluginPublicId: string, slotId: string): Promise<VueSourceContent> {
    log.info('WebpackVueCompiler', `开始编译 Vue 源码: ${vueFilePath}`)

    // 验证源文件存在
    if (!fs.existsSync(vueFilePath)) {
      throw new Error(`Vue 源文件不存在: ${vueFilePath}`)
    }

    // 确保缓存目录存在
    await CreateDirIfNotExists(path.join(RootDir(), this.cacheDir))

    // 缓存区的目标路径
    const fileName = slotId.replace(/[^a-zA-Z0-9]/g, '_')
    const dirRelative = path.join(this.cacheDir, pluginPublicId)
    const cachedJsPath = path.join(RootDir(), dirRelative, `${fileName}.js`)
    const cachedCssPath = path.join(RootDir(), dirRelative, `${fileName}.css`)

    // 创建内存输出插件
    const memoryPlugin = new MemoryOutputPlugin()

    // 配置 Webpack，使用内存插件捕获输出
    const compiler = webpack({
      mode: 'production',
      context: path.dirname(vueFilePath),
      entry: `./${path.basename(vueFilePath)}`,
      output: {
        filename: 'index.js',
        libraryTarget: 'module',
        globalObject: 'this'
      },
      target: 'web',
      externals: {
        vue: 'vue'
      },
      module: {
        rules: [
          {
            test: /\.vue$/,
            loader: vueLoaderPath
          },
          {
            test: /\.css$/,
            use: [styleLoaderPath, cssLoaderPath]
          },
          {
            test: /\.(png|jpe?g|gif|svg)$/i,
            type: 'asset/resource'
          }
        ]
      },
      plugins: [new VueLoaderPlugin(), memoryPlugin],
      resolve: {
        extensions: ['.js', '.vue', '.json'],
        alias: {
          vue: 'vue/dist/vue.esm.js'
        }
      },
      stats: 'errors-only',
      experiments: {
        outputModule: true
      }
    })

    // 执行编译
    await new Promise<void>((resolve, reject) => {
      compiler.run((err, stats) => {
        if (err) return reject(err)
        if (!stats) {
          return reject(new Error('编译返回结果为空'))
        }
        if (stats.hasErrors()) {
          return reject(new Error(stats.toString('errors-only')))
        }
        resolve()
      })
    })

    // 从内存中获取编译结果
    const jsContent = memoryPlugin.getJsContent()
    if (!jsContent) {
      throw new Error('编译成功但未获取到 JS 内容')
    }
    const convertedJs = this.convertVueImports(jsContent)
    const finalJs = this.convertToExportDefault(convertedJs)

    // 确保缓存子目录存在
    await CreateDirIfNotExists(path.dirname(cachedJsPath))

    // 将编译结果写入缓存
    fs.writeFileSync(cachedJsPath, finalJs)
    log.info('WebpackVueCompiler', `JS 产物已固化至缓存: ${cachedJsPath}`)

    // 处理 CSS 文件
    let cssRelativePath: string | undefined
    const cssContent = memoryPlugin.getCssContent()
    if (cssContent) {
      fs.writeFileSync(cachedCssPath, cssContent)
      cssRelativePath = path.join(dirRelative, `${fileName}.css`)
      log.info('WebpackVueCompiler', `CSS 产物已固化至缓存: ${cachedCssPath}`)
    }

    // 返回相对于 cacheDir 的路径
    return {
      js: path.join(dirRelative, `${fileName}.js`),
      css: isBlank(cssRelativePath) ? undefined : cssRelativePath,
      vue: vueFilePath
    }
  }

  /**
   * 清理插件缓存
   * @param pluginPublicId 插件公开 ID
   */
  async clearCache(pluginPublicId: string): Promise<void> {
    const pluginCacheDir = path.join(this.cacheDir, pluginPublicId)
    try {
      await fsPromise.rm(pluginCacheDir, { recursive: true, force: true })
      log.info('WebpackVueCompiler', `已清理插件缓存: ${pluginPublicId}`)
    } catch (error) {
      log.warn('WebpackVueCompiler', `清理缓存失败: ${error}`)
    }
  }

  /**
   * 将 Vue 导入语句转换为变量赋值
   * 例如: \import { foo as _foo, bar } from "vue"
   * 转换为:
   *   const _foo = foo
   *   const _bar = bar
   */
  private convertVueImports(code: string): string {
    const importMatch = code.match(/import\s*\{([^}]+)}\s*from\s*["']vue["']/)
    if (!importMatch) {
      return code
    }

    const imports = importMatch[1]
    const lines: string[] = []

    for (const item of imports.split(',')) {
      const trimmed = item.trim()
      const asIndex = trimmed.indexOf(' as ')

      if (asIndex !== -1) {
        // 形式: xxx as _xxx
        const original = trimmed.substring(0, asIndex).trim()
        const alias = trimmed.substring(asIndex + 4).trim()
        lines.push(`const ${alias} = ${WebpackVueCompiler.VUE_NAME}.${original}`)
      } else {
        // 形式: xxx -> const _xxx = xxx
        lines.push(`const _${trimmed} = ${WebpackVueCompiler.VUE_NAME}.${trimmed}`)
      }
    }

    const importsBlock = lines.join(';')
    return code.replace(importMatch[0], importsBlock)
  }

  /**
   * 包装为默认导出
   * @param code 代码字符串
   * @private
   */
  private convertToExportDefault(code: string) {
    let rawExportName = ''
    const nonExportCode = code.replace(/export\{(.*) as default};/, (_match, g1) => {
      rawExportName = g1
      return ''
    })
    return `export default function getBlueprint(${WebpackVueCompiler.VUE_NAME}) {${nonExportCode} return ${rawExportName}}`
  }
}

/**
 * 获取 Webpack Vue 源码编译器实例
 */
export const getWebpackVueCompiler = () => WebpackVueCompiler.getInstance()
