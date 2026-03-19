import { useSlotRegistryStore } from '@renderer/store/SlotRegistryStore'
import type { ViewSlot, EmbedSlot, PanelSlot } from '@renderer/model/slot'
import type { MenuSlotItem, SiteBrowserListSlotItem } from '@renderer/store/SlotRegistryStore'
import ApiUtil from '@renderer/utils/ApiUtil.ts'
import ApiResponse from '@renderer/model/util/ApiResponse.ts'
import { isNullish } from '@shared/util/CommonUtil.ts'

/**
 * 从主进程同步过来的插槽配置类型
 * 与主进程的 SlotTypes 对应
 */

/**
 * 组件内容类型 (仅用于 contentType 为 'component' 时)
 * - 字符串: 仅包含js路径 (向后兼容)
 * - 对象: 包含js路径和可选的css路径
 * - vue: 包含vue文件路径，用于运行时编译
 */
type SyncComponentContent =
  | string
  | {
      js: string
      css?: string
    }
  | {
      vue: string
    }

/**
 * 通用基础字段 - 所有插槽类型都有的字段
 */
interface BaseSlotConfig {
  id: string
  pluginId: number
  name: string
  order?: number
  position?: string
  width?: number
  height?: number
  contentType: 'component' | 'code'
  content: SyncComponentContent
  props?: Record<string, unknown>
  replaceViewId?: string
  icon?: string
}

/**
 * 菜单插槽配置 - type 为 'menu' 时使用
 */
interface MenuSlotConfig extends BaseSlotConfig {
  type: 'menu'
  viewId: string
  children: SyncMenuChildConfig[]
}

/** 子菜单配置 */
interface SyncMenuChildConfig {
  id: string
  name: string
  order?: number
  icon?: string
  viewId?: string
  children?: SyncMenuChildConfig[]
}

/**
 * 站点浏览器列表插槽配置 - type 为 'siteBrowserList' 时使用
 */
interface SiteBrowserListSlotConfig extends BaseSlotConfig {
  type: 'siteBrowserList'
  contributionId: string
  pluginPublicId: string
  imagePath: string
}

/**
 * 视图插槽配置 - type 为 'view' 时使用
 */
interface ViewTypeSlotConfig extends BaseSlotConfig {
  type: 'view'
}

/**
 * 嵌入插槽配置 - type 为 'embed' 时使用
 */
interface EmbedTypeSlotConfig extends BaseSlotConfig {
  type: 'embed'
}

/**
 * 面板插槽配置 - type 为 'panel' 时使用
 */
interface PanelTypeSlotConfig extends BaseSlotConfig {
  type: 'panel'
}

/**
 * 插槽配置联合类型 - 使用可辨识联合实现类型安全
 */
export type SyncSlotConfig =
  | MenuSlotConfig
  | SiteBrowserListSlotConfig
  | ViewTypeSlotConfig
  | EmbedTypeSlotConfig
  | PanelTypeSlotConfig

/**
 * 转换视图插槽配置
 */
function convertToViewSlot(config: ViewTypeSlotConfig): ViewSlot {
  const componentLoader = () => loadPluginComponent(config.contentType, config.content, config.pluginId)
  return {
    id: config.id,
    name: config.name,
    icon: config.icon,
    component: componentLoader,
    order: config.order ?? 100,
    isPlugin: true,
    props: config.props
  }
}

/**
 * 转换嵌入插槽配置
 */
function convertToEmbedSlot(config: EmbedTypeSlotConfig): EmbedSlot {
  return {
    id: config.id,
    position: config.position as 'topbar' | 'statusbar' | 'toolbar',
    component: () => loadPluginComponent(config.contentType, config.content, config.pluginId),
    props: config.props,
    order: config.order ?? 100
  }
}

/**
 * 转换面板插槽配置
 */
function convertToPanelSlot(config: PanelTypeSlotConfig): PanelSlot {
  return {
    id: config.id,
    position: config.position as 'left-sidebar' | 'right-sidebar' | 'bottom',
    width: config.width,
    height: config.height,
    component: () => loadPluginComponent(config.contentType, config.content, config.pluginId),
    props: config.props,
    order: config.order ?? 100
  }
}

/**
 * 转换菜单插槽配置
 */
function convertToMenuSlot(config: MenuSlotConfig): MenuSlotItem {
  // 递归转换子菜单
  const convertChildren = (children?: SyncMenuChildConfig[]): MenuSlotItem[] | undefined => {
    if (!children || children.length === 0) return undefined
    return children.map((child) => ({
      id: child.id,
      index: child.id,
      label: child.name,
      icon: child.icon,
      order: child.order ?? 100,
      viewId: child.viewId,
      children: convertChildren(child.children)
    }))
  }

  return {
    id: config.id,
    index: config.id,
    label: config.name,
    icon: config.icon,
    order: config.order ?? 100,
    viewId: config.viewId,
    children: convertChildren(config.children)
  }
}

/**
 * 转换站点浏览器列表插槽配置
 */
function convertToSiteBrowserListSlot(config: SiteBrowserListSlotConfig): SiteBrowserListSlotItem {
  return {
    id: config.id,
    pluginId: config.pluginId,
    name: config.name,
    order: config.order ?? 100,
    contributionId: config.contributionId ?? '',
    pluginPublicId: config.pluginPublicId ?? '',
    imagePath: config.imagePath ?? ''
  }
}

/**
 * 加载插件CSS样式
 * @param pluginId 插件ID，用于标识CSS
 * @param cssPath CSS文件路径
 */
async function loadPluginStyles(pluginId: number, cssPath: string): Promise<void> {
  // 检查CSS是否已加载
  const existingLink = document.querySelector(`link[data-plugin-id="${pluginId}"][data-css-path="${cssPath}"]`)
  if (existingLink) {
    return
  }

  return new Promise((resolve, reject) => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.type = 'text/css'
    link.href = cssPath
    link.setAttribute('data-plugin-id', String(pluginId))
    link.setAttribute('data-css-path', cssPath)

    link.onload = () => {
      resolve()
    }
    link.onerror = () => {
      reject(new Error(`CSS加载失败: ${cssPath}`))
    }

    document.head.appendChild(link)
  })
}

/**
 * 卸载插件CSS样式
 * @param pluginId 插件ID
 */
function unloadPluginStyles(pluginId: number): void {
  const links = document.querySelectorAll(`link[data-plugin-id="${pluginId}"]`)
  links.forEach((link) => {
    link.remove()
  })
}

/**
 * 根据内容类型加载插件组件
 * @param contentType 内容类型
 * @param content 内容(字符串或对象)
 * @param pluginId 插件ID
 */
async function loadPluginComponent(contentType: string, content: SyncComponentContent, pluginId: number): Promise<unknown> {
  if (contentType === 'component') {
    const protocolPrefix = 'resource://plugin/'
    // 如果content是对象且包含vue路径，运行时编译Vue源码
    if (typeof content === 'object' && 'vue' in content) {
      return loadVueSourceComponent(content.vue, pluginId)
    }
    // 如果content是对象且包含css路径，先加载CSS
    if (typeof content === 'object' && content.css) {
      await loadPluginStyles(pluginId, protocolPrefix + content.css)
    }

    // 获取js路径
    const jsPath = typeof content === 'string' ? content : protocolPrefix + content.js

    // Vue 组件文件: dynamic import
    // 插件组件通过 resource:// 协议访问
    return import(/* @vite-ignore */ jsPath)
  }

  if (contentType === 'code') {
    // 代码片段: 执行代码并返回 Vue 组件
    // content对于code类型应该是字符串
    let codeContent: string
    if (typeof content === 'string') {
      codeContent = content
    } else if ('js' in content) {
      codeContent = content.js
    } else {
      throw new Error('code 类型的内容需要提供 js 路径')
    }
    return createCodeComponent(codeContent)
  }

  throw new Error(`未知的内容类型: ${contentType}`)
}

/**
 * 创建代码片段组件
 * 注意: 代码片段需要返回一个 Vue 组件定义
 */
function createCodeComponent(code: string): Promise<() => unknown> {
  return new Promise((resolve, reject) => {
    try {
      // 使用 Function 构造函数创建组件工厂函数
      // 注意: 这需要在渲染进程的安全上下文中执行
      const componentFactory = new Function('return ' + code)()
      resolve(componentFactory)
    } catch (error) {
      reject(new Error(`代码片段执行失败: ${error}`))
    }
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VueModule = any

/**
 * 加载并编译 Vue 源码
 * 插件可使用主程序的依赖
 * @param vuePath Vue 文件路径
 * @param pluginId 插件ID
 */
async function loadVueSourceComponent(vuePath: string, pluginId: number): Promise<unknown> {
  try {
    // 阶段 1: 文件获取 - 通过 IPC 读取 .vue 文件内容
    const response = (await window.electron.pluginReadVueFile(vuePath)) as ApiResponse
    if (ApiUtil.check(response)) {
      ApiUtil.failedMsg(response)
    }
    const sourceCode = response.data as string

    // 动态导入编译器
    const compilerSFC = await import('@vue/compiler-sfc')
    const compilerDOM: VueModule = await import('vue')
    const { compile } = await import('vue')

    // 阶段 2: SFC 解析 - 解析 Vue 单文件组件
    const parseResult = compilerSFC.parse(sourceCode)
    const errors = parseResult.errors as unknown[] | undefined
    if (errors && errors.length > 0) {
      throw new Error(`SFC 解析错误: ${errors.map((e) => String(e)).join(', ')}`)
    }

    const descriptor = parseResult.descriptor
    if (!descriptor) {
      throw new Error('无法解析 Vue 文件')
    }

    // 阶段 3: 模板编译 - 使用运行时编译器生成 render 函数
    if (isNullish(descriptor.template)) {
      throw new Error('未解析出 Vue 文件的模板')
    }
    const renderFunction: ((...args: unknown[]) => unknown) | undefined = compile(descriptor.template.content, {
      mode: 'function'
    })

    // 阶段 4: 脚本执行 - 执行 script 获取组件选项
    let componentOptions: Record<string, unknown> = {}
    if (descriptor.script) {
      let scriptCode = descriptor.script.content
      // 移除所有 import 语句，因为 eval/new Function 不能执行 import
      scriptCode = scriptCode.replace(/^import\s+.*from\s+['"].*['"];?\s*$/gm, '')
      // 移除独立的 import 语句（没有 from 的情况）
      scriptCode = scriptCode.replace(/^import\s+['"].*['"];?\s*$/gm, '')
      // 移除 export default
      scriptCode = scriptCode.replace(/export\s+default\s+/, '').replace(/^export\s+default\s+/, '')
      // 使用 eval 执行，因为 new Function 不能执行包含 const/let 的代码
      try {
        // 【关键修改 3】: 确保 eval 的结果是一个干净的对象
        // 使用 with 或者直接返回对象字面量
        // 注意：如果脚本里有 const handleClick = ...，它必须在返回的对象里暴露出来 (setup) 或在 methods 里
        const result = eval(`(function() { return (${scriptCode}) })()`)
        componentOptions = result || {}
      } catch (error) {
        console.error('Script 执行错误:', error)
        throw new Error(`Script 执行失败: ${error}`)
      }
    } else if (descriptor.scriptSetup) {
      // 处理 script setup
      const scriptSetupContent = descriptor.scriptSetup.content
      // 对于 script setup，需要额外处理 - 这里简化处理
      // 实际项目中可能需要使用 @vue/compiler-sfc 的 compileScript 方法
      try {
        componentOptions = eval(`(({ setup: () => { ${scriptSetupContent} } }))`) || {}
      } catch (error) {
        console.error('Script Setup 执行错误:', error)
        throw new Error(`Script Setup 执行失败: ${error}`)
      }
    }

    // 阶段 5: 样式注入 - 处理 scoped 样式
    if (descriptor.styles && descriptor.styles.length > 0) {
      for (const style of descriptor.styles) {
        const isScoped = style.scoped
        let cssContent = style.content

        if (isScoped) {
          // 使用 compilerSFC 生成的 CSS scope ID
          // 由于运行时编译，我们生成一个简单的 scope ID
          const scopeId = `data-v-${pluginId}-${Math.random().toString(36).slice(2, 8)}`
          // 为 scoped 样式添加属性选择器
          // 注意：这里简化处理，实际需要更复杂的 AST 转换
          cssContent = cssContent.replace(/([^}]+)\s*\{/g, (_, selector) => {
            // 避免重复添加属性选择器
            if (selector.includes(scopeId)) {
              return `${selector} {`
            }
            // 为选择器添加 scoped 属性
            const modifiedSelector = selector
              .split(',')
              .map((s: string) => {
                const trimmed = s.trim()
                if (trimmed.startsWith('.') || trimmed.startsWith('#') || trimmed.startsWith('[')) {
                  return `${trimmed}[${scopeId}]`
                }
                return `${trimmed}[${scopeId}]`
              })
              .join(', ')
            return `${modifiedSelector} {`
          })
        }

        // 注入 CSS 到页面
        injectStyle(cssContent, pluginId, isScoped ? String(pluginId) : undefined)
      }
    }

    // 阶段 6: 组件组装
    const componentDef: Record<string, unknown> = {
      ...componentOptions
    }

    if (renderFunction) {
      componentDef.render = renderFunction
      delete componentDef.template
    }

    return compilerDOM.defineComponent(componentDef)
  } catch (error) {
    console.error('Vue 源码编译失败:', error)
    throw error
  }
}

/**
 * 动态注入 CSS 样式
 */
function injectStyle(css: string, pluginId: number, scopeId?: string): void {
  const styleId = `plugin-style-${pluginId}${scopeId ? `-${scopeId}` : ''}`
  const existingStyle = document.getElementById(styleId)
  if (existingStyle) {
    return
  }

  const styleElement = document.createElement('style')
  styleElement.id = styleId
  styleElement.type = 'text/css'
  styleElement.textContent = css
  document.head.appendChild(styleElement)
}

/**
 * 初始化插槽同步监听器
 * 监听主进程发来的插槽注册/注销消息
 */
export function initSlotSyncListener() {
  const store = useSlotRegistryStore()

  // 监听插槽注册
  window.electron.onSlotRegister((...args: unknown[]) => {
    const config = args[0] as SyncSlotConfig

    if (config.type === 'view') {
      const slot = convertToViewSlot(config)
      store.registerViewSlot(slot)
    } else if (config.type === 'menu') {
      const menuItem = convertToMenuSlot(config)
      store.registerMenuSlot(menuItem)
    } else if (config.type === 'embed') {
      store.registerEmbedSlot(convertToEmbedSlot(config))
    } else if (config.type === 'panel') {
      store.registerPanelSlot(convertToPanelSlot(config))

      // 处理页面替换
      if (config.replaceViewId) {
        store.replaceView(config.id, config.replaceViewId)
      }
    } else if (config.type === 'siteBrowserList') {
      store.registerSiteBrowserSlot(convertToSiteBrowserListSlot(config))
    }
  })

  // 监听插槽注销
  window.electron.onSlotUnregister((...args: unknown[]) => {
    const data = args[0] as { id: string; type: string; pluginId: number }

    // 卸载插件CSS样式
    if (data.pluginId) {
      unloadPluginStyles(data.pluginId)
    }

    if (data.type === 'view') {
      store.unregisterViewSlot(data.id)
    } else if (data.type === 'menu') {
      store.unregisterMenuSlot(data.id)
    } else if (data.type === 'embed') {
      store.unregisterEmbedSlot(data.id)
    } else if (data.type === 'panel') {
      store.unregisterPanelSlot(data.id)
    } else if (data.type === 'siteBrowserList') {
      store.unregisterSiteBrowserSlot(data.id)
    }
  })

  // 监听批量插槽注册
  window.electron.onSlotBatchRegister((...args: unknown[]) => {
    const configs = args[0] as SyncSlotConfig[]

    configs.forEach((config) => {
      if (config.type === 'view') {
        store.registerViewSlot(convertToViewSlot(config))
      } else if (config.type === 'menu') {
        store.registerMenuSlot(convertToMenuSlot(config))
      } else if (config.type === 'embed') {
        store.registerEmbedSlot(convertToEmbedSlot(config))
      } else if (config.type === 'panel') {
        store.registerPanelSlot(convertToPanelSlot(config))
      } else if (config.type === 'siteBrowserList') {
        store.registerSiteBrowserSlot(convertToSiteBrowserListSlot(config))
      }
    })
  })

  // 同步所有已注册的插槽（用于处理插件激活时渲染进程还未准备好的情况）
  window.electron.getAllSlots().then((slots: unknown[]) => {
    slots.forEach((config: unknown) => {
      const syncConfig = config as SyncSlotConfig
      if (syncConfig.type === 'view') {
        store.registerViewSlot(convertToViewSlot(syncConfig))
      } else if (syncConfig.type === 'menu') {
        store.registerMenuSlot(convertToMenuSlot(syncConfig))
      } else if (syncConfig.type === 'embed') {
        store.registerEmbedSlot(convertToEmbedSlot(syncConfig))
      } else if (syncConfig.type === 'panel') {
        store.registerPanelSlot(convertToPanelSlot(syncConfig))
      } else if (syncConfig.type === 'siteBrowserList') {
        store.registerSiteBrowserSlot(convertToSiteBrowserListSlot(syncConfig))
      }
    })
  })
}
