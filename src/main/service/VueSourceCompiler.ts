import fsPromise from 'fs/promises'
import path from 'path'
import { parse, compileScript, compileTemplate, SFCDescriptor } from '@vue/compiler-sfc'
import log from '../util/LogUtil.ts'
import { CreateDirIfNotExists, RootDir } from '../util/FileSysUtil.ts'
import { PLUGIN_ROOT } from '../constant/PluginConstant.ts'
import { isBlank } from '@shared/util/StringUtil.ts'
import { VueSourceContent } from '@shared/model/interface/SlotConfigs.ts'

/**
 * Vue 源码编译器
 * 将插件的 .vue 源码文件编译为可执行的 JavaScript 文件
 */
export default class VueSourceCompiler {
  private static instance: VueSourceCompiler
  private static PATH_DIR = 'plugin-cache'
  /** 插件缓存目录 */
  private readonly cacheDir: string

  private constructor() {
    this.cacheDir = path.join(PLUGIN_ROOT, VueSourceCompiler.PATH_DIR)
  }

  static getInstance(): VueSourceCompiler {
    if (!VueSourceCompiler.instance) {
      VueSourceCompiler.instance = new VueSourceCompiler()
    }
    return VueSourceCompiler.instance
  }

  /**
   * 编译 Vue 源码文件
   * @param vueFilePath .vue 文件的绝对路径
   * @param pluginPublicId 插件 ID
   * @param slotId 插槽 ID
   * @returns 编译结果包含 JS 和 CSS 文件路径
   */
  async compile(vueFilePath: string, pluginPublicId: string, slotId: string): Promise<VueSourceContent> {
    log.info('VueSourceCompiler', `开始编译 Vue 源码: ${vueFilePath}`)

    // 读取 Vue 文件内容
    const sourceCode = await fsPromise.readFile(vueFilePath, 'utf-8')

    // 解析 SFC
    const { descriptor, errors } = parse(sourceCode)
    if (errors && errors.length > 0) {
      const errorMsg = errors.map((e) => e.message).join('\n')
      log.error('VueSourceCompiler', `SFC 解析错误: ${errorMsg}`)
      throw new Error(`SFC 解析错误: ${errorMsg}`)
    }

    // 生成文件名
    const fileName = slotId.replace(/[^a-zA-Z0-9]/g, '_')

    const dirRelative = path.join(this.cacheDir, pluginPublicId)
    const dirFull = path.join(RootDir(), dirRelative)
    // 准备输出目录
    await CreateDirIfNotExists(dirFull)
    // 编译脚本和模板
    const { scriptCode, stylesCode } = await this.compileSFC(descriptor, pluginPublicId)

    // 写入 JS 文件
    const jsFileName = `${fileName}.js`
    const jsRelativePath = path.join(dirRelative, jsFileName)
    const jsFullPath = path.join(dirFull, jsFileName)

    await fsPromise.writeFile(jsFullPath, scriptCode, 'utf-8')
    log.info('VueSourceCompiler', `JS 文件已写入: ${jsFileName}`)

    // 写入 CSS 文件
    let cssRelativePath: string | undefined
    if (stylesCode) {
      const cssFileName = `${fileName}.css`
      cssRelativePath = path.join(dirRelative, cssFileName)
      const cssFullPath = path.join(dirFull, cssFileName)
      await fsPromise.writeFile(cssFullPath, stylesCode, 'utf-8')
      log.info('VueSourceCompiler', `CSS 文件已写入: ${cssFileName}`)
    }

    // 返回相对于 cacheDir 的路径
    return {
      js: jsRelativePath,
      css: isBlank(cssRelativePath) ? undefined : cssRelativePath,
      vue: vueFilePath
    }
  }

  /**
   * 编译 SFC 描述符
   * @private
   */
  private async compileSFC(
    descriptor: SFCDescriptor,
    slotId: string
  ): Promise<{ scriptCode: string; stylesCode: string | undefined }> {
    // 生成组件名称
    const componentName = `PluginComponent_${slotId}_${Date.now()}`

    // 处理 script
    let scriptContent = ''
    let scriptSetupContent = ''

    if (descriptor.script) {
      scriptContent = descriptor.script.content
    }

    if (descriptor.scriptSetup) {
      scriptSetupContent = descriptor.scriptSetup.content
    }

    // 编译 script
    let compiledScript: string = ''
    if (scriptContent || scriptSetupContent) {
      const sfc = compileScript(descriptor, {
        id: slotId,
        inlineTemplate: false, // 不内联模板，分开处理
        genDefaultAs: '__componentOptions', // 自定义导出变量名
        propsDestructure: true
      })

      // script代码转换为合适的形式
      compiledScript = this.convertScript(sfc.content, '__componentOptions')
    }

    // 处理模板（关键修改点）
    let renderFunction = ''
    if (descriptor.template) {
      try {
        const { code } = compileTemplate({
          source: descriptor.template.content,
          filename: `${slotId}.vue`,
          id: slotId,
          compilerOptions: {
            prefixIdentifiers: true,
            bindingMetadata: {},
            hoistStatic: true,
            cacheHandlers: true
          },
          ssr: false
        })

        // render代码转换为合适的形式
        renderFunction = this.convertRender(code)
      } catch (error) {
        log.error('VueSourceCompiler', `模板编译失败: ${error}`)
        throw new Error(`模板编译失败: ${error}`)
      }
    }

    // 处理样式
    let stylesCode: string | undefined
    if (descriptor.styles && descriptor.styles.length > 0) {
      const allStyles: string[] = []
      for (const style of descriptor.styles) {
        let cssContent = style.content

        // 处理 scoped 样式
        if (style.scoped) {
          const scopeId = `data-v-${slotId}`
          cssContent = this.processScopedStyles(cssContent, scopeId)
        }

        allStyles.push(cssContent)
      }
      stylesCode = allStyles.join('\n')
    }

    // 组装最终的 JS 代码
    const scriptCode = this.assembleComponentCode(componentName, compiledScript, renderFunction)

    return { scriptCode, stylesCode }
  }

  /**
   * 转换script代码
   * 包装编译后的script脚本为一个setup函数
   */
  private convertScript(code: string, varName: string): string {
    return `setup: () => {${code}; return ${varName}.setup()}`
  }

  /**
   * 转换render代码
   * 将 Vue 导入语句转换为变量赋值，将 export function render 替换为 function render
   */
  private convertRender(code: string): string {
    let result = code.trim()

    // 1. 将 Vue 导入语句转换为变量赋值
    result = this.convertVueImports(result)

    // 2. 将 export function render 替换为 function render
    result = result.replace(/export\s+function\s+render/, 'function render')

    return result
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
        lines.push(`const ${alias} = Vue.${original}`)
      } else {
        // 形式: xxx -> const _xxx = xxx
        lines.push(`const _${trimmed} = Vue.${trimmed}`)
      }
    }

    const importsBlock = lines.join('\n  ')
    return code.replace(importMatch[0], importsBlock)
  }

  /**
   * 处理 scoped 样式
   * @private
   */
  private processScopedStyles(css: string, scopeId: string): string {
    // 简单的 scoped 处理：为选择器添加属性选择器
    return css.replace(/([^}]+)\s*\{/g, (match, selector) => {
      // 避免重复添加
      if (selector.includes(scopeId)) {
        return match
      }

      // 为选择器添加 scoped 属性
      const modifiedSelector = selector
        .split(',')
        .map((s: string) => {
          const trimmed = s.trim()
          // 只为常见选择器添加属性
          if (trimmed.startsWith('.') || trimmed.startsWith('#') || trimmed.startsWith('[') || trimmed === '*') {
            return `${trimmed}[${scopeId}]`
          }
          // 其他选择器（如标签选择器）也添加
          return `${trimmed}[${scopeId}]`
        })
        .join(', ')

      return `${modifiedSelector} {`
    })
  }

  /**
   * 组装最终的组件代码
   * 通过参数注入 Vue 依赖
   */
  private assembleComponentCode(componentName: string, scriptCode: string, renderFunction: string): string {
    return `export default function getBlueprint(Vue) {
  // 渲染函数（已移除 import 语句）
  ${renderFunction}
  // 返回组件选项对象
  return {
    name: '${componentName}',
    ${scriptCode},
    ${renderFunction.includes('function render') ? 'render' : ''}
  }
}`
  }

  /**
   * 清理插件缓存
   * @param pluginPublicId 插件公开 ID
   */
  async clearCache(pluginPublicId: string): Promise<void> {
    const pluginCacheDir = path.join(this.cacheDir, pluginPublicId)
    try {
      await fsPromise.rm(pluginCacheDir, { recursive: true, force: true })
      log.info('VueSourceCompiler', `已清理插件缓存: ${pluginPublicId}`)
    } catch (error) {
      log.warn('VueSourceCompiler', `清理缓存失败: ${error}`)
    }
  }
}

/**
 * 获取 Vue 源码编译器实例
 */
export const getVueSourceCompiler = () => VueSourceCompiler.getInstance()
