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
  type: 'embed' | 'panel' | 'view' | 'menu'
  position?: string
  width?: number
  height?: number
  contentType: 'component' | 'code'
  content: string
  props?: Record<string, unknown>
  replaceViewId?: string
  icon?: string
  // 菜单位点专用
  viewId?: string
  children?: SyncMenuChildConfig[]
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
 * 转换菜单位点配置
 */
function convertToMenuSlot(config: SyncSlotConfig): MenuSlotItem {
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
    }
  })

  // 监听位点注销
  window.electron.onSlotUnregister((...args: unknown[]) => {
    const data = args[0] as { id: string; type: string }

    if (data.type === 'view') {
      store.unregisterViewSlot(data.id)
    } else if (data.type === 'menu') {
      store.unregisterMenuSlot(data.id)
    } else if (data.type === 'embed') {
      store.unregisterEmbedSlot(data.id)
    } else if (data.type === 'panel') {
      store.unregisterPanelSlot(data.id)
    }
  })

  // 监听批量位点注册
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
      }
    })
  })

  // 同步所有已注册的位点（插件激活时可能渲染进程还未准备好）
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
      }
    })
  })
}
