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
   * @param pluginId 插件 ID
   * @param slotId 插槽 ID
   * @returns 编译结果包含 JS 和 CSS 文件路径
   */
  async compile(vueFilePath: string, pluginId: number, slotId: string): Promise<VueCompileResult> {
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
    const pluginCacheDir = path.join(this.cacheDir, String(pluginId))
    await CreateDirIfNotExists(pluginCacheDir)

    // 生成文件名前缀
    const filePrefix = slotId.replace(/[^a-zA-Z0-9]/g, '_')
    const jsPath = `${filePrefix}.js`
    const cssPath = `${filePrefix}.css`

    // 编译脚本和模板
    const { scriptCode, stylesCode } = await this.compileSFC(descriptor, pluginId)

    // 写入 JS 文件
    await fsPromise.writeFile(path.join(pluginCacheDir, jsPath), scriptCode, 'utf-8')
    LogUtil.info('VueSourceCompiler', `JS 文件已写入: ${jsPath}`)

    // 写入 CSS 文件
    if (stylesCode) {
      await fsPromise.writeFile(path.join(pluginCacheDir, cssPath), stylesCode, 'utf-8')
      LogUtil.info('VueSourceCompiler', `CSS 文件已写入: ${cssPath}`)
    }

    return {
      jsPath: `plugin-cache/${pluginId}/${jsPath}`,
      cssPath: stylesCode ? `plugin-cache/${pluginId}/${cssPath}` : undefined
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
    return code.trim()
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
