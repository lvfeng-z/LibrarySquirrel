import fsPromise from 'fs/promises'
import path from 'path'
import { parse, compileScript, compileTemplate, SFCDescriptor } from '@vue/compiler-sfc'
import LogUtil from '../util/LogUtil.ts'
import { CreateDirIfNotExists, RootDir } from '../util/FileSysUtil.ts'
import { PLUGIN_ROOT } from '../constant/PluginConstant.ts'
import { VueCompileResult } from '@shared/model/interface/SlotConfigs.ts'

/**
 * Vue 源码编译器
 * 将插件的 .vue 源码文件编译为可执行的 JavaScript 文件
 */
export default class VueSourceCompiler {
  private static instance: VueSourceCompiler

  /** 插件缓存目录 */
  private readonly cacheDir: string

  private constructor() {
    this.cacheDir = path.join(RootDir(), PLUGIN_ROOT, 'plugin-cache')
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
  async compile(vueFilePath: string, pluginPublicId: number, slotId: string): Promise<VueCompileResult> {
    LogUtil.info('VueSourceCompiler', `开始编译 Vue 源码: ${vueFilePath}`)

    // 读取 Vue 文件内容
    const sourceCode = await fsPromise.readFile(vueFilePath, 'utf-8')

    // 解析 SFC
    const { descriptor, errors } = parse(sourceCode)
    if (errors && errors.length > 0) {
      const errorMsg = errors.map((e) => e.message).join('\n')
      LogUtil.error('VueSourceCompiler', `SFC 解析错误: ${errorMsg}`)
      throw new Error(`SFC 解析错误: ${errorMsg}`)
    }

    // 准备输出目录
    const pluginCacheDir = path.join(this.cacheDir, String(pluginPublicId))
    await CreateDirIfNotExists(pluginCacheDir)

    // 生成文件名
    const fileName = slotId.replace(/[^a-zA-Z0-9]/g, '_')

    // 编译脚本和模板
    const { scriptCode, stylesCode } = await this.compileSFC(descriptor, pluginPublicId)

    // 写入 JS 文件
    const jsFileName = `${fileName}.js`
    const jsFullPath = path.join(pluginCacheDir, jsFileName)
    await fsPromise.writeFile(jsFullPath, scriptCode, 'utf-8')
    LogUtil.info('VueSourceCompiler', `JS 文件已写入: ${jsFileName}`)

    // 写入 CSS 文件
    let cssFullPath: string | undefined
    if (stylesCode) {
      const cssFileName = `${fileName}.css`
      cssFullPath = path.join(pluginCacheDir, cssFileName)
      await fsPromise.writeFile(cssFullPath, stylesCode, 'utf-8')
      LogUtil.info('VueSourceCompiler', `CSS 文件已写入: ${cssFileName}`)
    }

    // 返回相对于 cacheDir 的路径
    return {
      jsPath: path.relative(this.cacheDir, jsFullPath),
      cssPath: cssFullPath ? path.relative(this.cacheDir, cssFullPath) : undefined
    }
  }

  /**
   * 编译 SFC 描述符
   * @private
   */
  private async compileSFC(
    descriptor: SFCDescriptor,
    pluginId: number
  ): Promise<{ scriptCode: string; stylesCode: string | undefined }> {
    // 生成组件名称
    const componentName = `PluginComponent_${pluginId}_${Date.now()}`

    // 处理 script
    let scriptContent = ''
    let scriptSetupContent = ''

    if (descriptor.script) {
      scriptContent = descriptor.script.content
    }

    if (descriptor.scriptSetup) {
      scriptSetupContent = descriptor.scriptSetup.content
    }

    // 编译 script（关键修改点）
    let compiledScript = ''
    if (scriptContent || scriptSetupContent) {
      try {
        const sfc = compileScript(descriptor, {
          id: String(pluginId),
          inlineTemplate: false, // 不内联模板，分开处理
          genDefaultAs: '__componentOptions', // 自定义导出变量名
          propsDestructure: true
        })

        // 提取纯组件选项对象，移除 export default
        compiledScript = this.extractComponentOptions(sfc.content, '__componentOptions')
      } catch (error) {
        LogUtil.warn('VueSourceCompiler', `compileScript 失败，使用备用方案: ${error}`)
        compiledScript = this.generateFallbackScript(scriptContent, scriptSetupContent)
      }
    } else {
      compiledScript = this.generateFallbackScript(scriptContent, scriptSetupContent)
    }

    // 处理模板（关键修改点）
    let renderFunction = ''
    if (descriptor.template) {
      try {
        const { code } = compileTemplate({
          source: descriptor.template.content,
          filename: `plugin-${pluginId}.vue`,
          id: String(pluginId),
          compilerOptions: {
            prefixIdentifiers: true,
            bindingMetadata: {},
            hoistStatic: true,
            cacheHandlers: true
          },
          ssr: false
        })

        // 清理 import 语句，提取 render 函数体
        renderFunction = this.extractRenderFunction(code)
      } catch (error) {
        LogUtil.error('VueSourceCompiler', `模板编译失败: ${error}`)
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
          const scopeId = `data-v-${pluginId}`
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
   * 从编译后的脚本中提取组件选项对象
   * 移除 export default 包装，只保留对象内容
   */
  private extractComponentOptions(code: string, varName: string): string {
    return `setup: () => {${code}; return ${varName}.setup()}`
  }

  /**
   * 从编译后的模板代码中提取 render 函数
   * 移除 import 语句和 export 声明
   */
  private extractRenderFunction(code: string): string {
    let result = code.trim()

    // 1. 将 Vue 导入语句转换为变量赋值
    result = this.convertVueImports(result)

    // 2. 将 export function render 替换为 function render
    result = result.replace(/export\s+function\s+render/, 'function render')

    return result
  }

  /**
   * 将 Vue 导入语句转换为变量赋值
   * 例如: import { foo as _foo, bar } from "vue"
   * 转换为:
   *   const _foo = foo
   *   const _bar = bar
   */
  private convertVueImports(code: string): string {
    const importMatch = code.match(/import\s*\{([^}]+)\}\s*from\s*["']vue["']/)
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
        lines.push(`const ${alias} = ${original}`)
      } else {
        // 形式: xxx -> const _xxx = xxx
        lines.push(`const _${trimmed} = ${trimmed}`)
      }
    }

    const importsBlock = lines.join('\n  ')
    return code.replace(importMatch[0], importsBlock)
  }

  /**
   * 生成备用脚本代码
   * @private
   */
  private generateFallbackScript(scriptContent: string, scriptSetupContent: string): string {
    let scriptCode = scriptContent

    // 移除 export default 和 import 语句
    scriptCode = scriptCode.replace(/^import\s+.*from\s+['"].*['"];?\s*$/gm, '')
    scriptCode = scriptCode.replace(/^import\s+['"].*['"];?\s*$/gm, '')
    scriptCode = scriptCode.replace(/export\s+default\s+/, '')

    // 处理 script setup
    if (scriptSetupContent) {
      // 简化处理：将 setup 函数包装
      const setupFunc = `() => { ${scriptSetupContent} }`
      scriptCode = `{ setup: ${setupFunc} }`
    }

    // 如果没有内容，返回空对象
    if (!scriptCode.trim()) {
      scriptCode = '{}'
    }

    return scriptCode
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
    // 确定需要的 Vue API
    const vueImports = [
      'createElementVNode',
      'createTextVNode',
      'resolveComponent',
      'withCtx',
      'createVNode',
      'openBlock',
      'createElementBlock',
      'createBlock',
      'toDisplayString'
    ]

    return `export default function getBlueprint(Vue) {
  // 从注入的 Vue 对象中解构需要的 API
  const { ${vueImports.join(', ')} } = Vue || {}
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
   * @param pluginId 插件 ID
   */
  async clearCache(pluginId: number): Promise<void> {
    const pluginCacheDir = path.join(this.cacheDir, String(pluginId))
    try {
      await fsPromise.rm(pluginCacheDir, { recursive: true, force: true })
      LogUtil.info('VueSourceCompiler', `已清理插件缓存: ${pluginId}`)
    } catch (error) {
      LogUtil.warn('VueSourceCompiler', `清理缓存失败: ${error}`)
    }
  }
}

/**
 * 获取 Vue 源码编译器实例
 */
export const getVueSourceCompiler = () => VueSourceCompiler.getInstance()
