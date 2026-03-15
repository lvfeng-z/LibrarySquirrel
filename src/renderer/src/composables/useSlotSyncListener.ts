import { useSlotRegistryStore } from '@renderer/store/SlotRegistryStore'
import type { ViewSlot, EmbedSlot, PanelSlot } from '@renderer/model/slot'
import type { MenuSlotItem } from '@renderer/store/SlotRegistryStore'

/**
 * 从主进程同步过来的位点配置类型
 * 与主进程的 SlotTypes 对应
 */
interface SyncSlotConfig {
  id: string
  pluginId: number
  name: string
  order?: number
  type: 'embed' | 'panel' | 'view'
  position?: string
  width?: number
  height?: number
  contentType: 'component' | 'code' | 'menuItem'
  content: string
  props?: Record<string, unknown>
  replaceViewId?: string
  icon?: string
  menuItem?: {
    label: string
    icon?: string
    order?: number
    children?: { label: string; icon?: string; order?: number }[]
  }
}

/**
 * 转换视图位点配置
 */
function convertToViewSlot(config: SyncSlotConfig): ViewSlot {
  const componentLoader = () => loadPluginComponent(config.contentType, config.content)
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
 * 转换微件位点配置
 */
function convertToEmbedSlot(config: SyncSlotConfig): EmbedSlot {
  return {
    id: config.id,
    position: config.position as 'topbar' | 'statusbar' | 'toolbar',
    component: () => loadPluginComponent(config.contentType, config.content),
    props: config.props,
    order: config.order ?? 100
  }
}

/**
 * 转换面板位点配置
 */
function convertToPanelSlot(config: SyncSlotConfig): PanelSlot {
  return {
    id: config.id,
    position: config.position as 'left-sidebar' | 'right-sidebar' | 'bottom',
    width: config.width,
    height: config.height,
    component: () => loadPluginComponent(config.contentType, config.content),
    props: config.props,
    order: config.order ?? 100
  }
}

/**
 * 转换菜单项配置
 */
function convertToMenuItem(config: SyncSlotConfig): MenuSlotItem | undefined {
  if (!config.menuItem) return undefined
  return {
    id: config.id,
    index: config.id,
    label: config.menuItem.label,
    icon: config.menuItem.icon,
    order: config.menuItem.order ?? config.order ?? 100,
    viewId: config.id
  }
}

/**
 * 根据内容类型加载插件组件
 */
async function loadPluginComponent(contentType: string, content: string): Promise<unknown> {
  if (contentType === 'component') {
    // Vue 组件文件: dynamic import
    // 插件组件通过 resource:// 协议访问
    return import(/* @vite-ignore */ content)
  }

  if (contentType === 'code') {
    // 代码片段: 执行代码并返回 Vue 组件
    return createCodeComponent(content)
  }

  if (contentType === 'menuItem') {
    // 约定接口: 菜单项不需要组件渲染
    return () => Promise.resolve(null)
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

/**
 * 初始化位点同步监听器
 * 监听主进程发来的位点注册/注销消息
 */
export function initSlotSyncListener() {
  const store = useSlotRegistryStore()

  // 监听位点注册
  window.electron.ipcRenderer.on('slot-register', (_event, config: SyncSlotConfig) => {
    console.log('[SlotSync] 收到位点注册:', config.id, config.type)

    if (config.type === 'view') {
      const slot = convertToViewSlot(config)
      store.registerViewSlot(slot)

      // 注册菜单项
      const menuItem = convertToMenuItem(config)
      if (menuItem) {
        store.registerMenuSlot(menuItem)
      }
    } else if (config.type === 'embed') {
      store.registerEmbedSlot(convertToEmbedSlot(config))
    } else if (config.type === 'panel') {
      store.registerPanelSlot(convertToPanelSlot(config))

      // 处理页面替换
      if (config.replaceViewId) {
        store.replaceView(config.id, config.replaceViewId)
      }
    }
  })

  // 监听位点注销
  window.electron.ipcRenderer.on('slot-unregister', (_event, data: { id: string; type: string }) => {
    console.log('[SlotSync] 收到位点注销:', data.id, data.type)

    if (data.type === 'view') {
      store.unregisterViewSlot(data.id)
      store.unregisterMenuSlot(data.id)
    } else if (data.type === 'embed') {
      store.unregisterEmbedSlot(data.id)
    } else if (data.type === 'panel') {
      store.unregisterPanelSlot(data.id)
    }
  })

  // 监听批量位点注册
  window.electron.ipcRenderer.on('slot-batch-register', (_event, configs: SyncSlotConfig[]) => {
    console.log('[SlotSync] 收到批量位点注册:', configs.length)

    configs.forEach((config) => {
      if (config.type === 'view') {
        const slot = convertToViewSlot(config)
        store.registerViewSlot(slot)

        const menuItem = convertToMenuItem(config)
        if (menuItem) {
          store.registerMenuSlot(menuItem)
        }
      } else if (config.type === 'embed') {
        store.registerEmbedSlot(convertToEmbedSlot(config))
      } else if (config.type === 'panel') {
        store.registerPanelSlot(convertToPanelSlot(config))
      }
    })
  })

  console.log('[SlotSync] 位点同步监听器已初始化')
}
