/**
 * 插件插槽类型定义
 * 定义插件贡献UI插槽的配置类型
 */

/** 插槽内容类型 */
export type SlotContentType = 'component' | 'code'

/**
 * 组件内容类型 (仅用于 contentType 为 'component' 时)
 * - 字符串: 仅包含js路径 (向后兼容)
 * - 对象: 包含js路径和可选的css路径
 * - vue: 包含vue文件路径，用于运行时编译
 */
export type ComponentContent =
  | string
  | {
      js: string
      css?: string
    }
  | {
      vue: string
    }

/** 插槽基础配置 */
export interface BaseSlotConfig {
  /** 唯一标识: "plugin-{pluginId}-{name}" */
  id: string
  /** 所属插件ID */
  pluginId: number
  /** 显示名称 */
  name: string
  /** 排序权重 */
  order?: number
}

/** 嵌入插槽配置 (对应 EmbedSlot) */
export interface EmbedSlotConfig extends BaseSlotConfig {
  /** 插槽类型 */
  type: 'embed'
  /** 位置 */
  position: 'topbar' | 'statusbar' | 'toolbar'
  /** 内容类型 */
  contentType: SlotContentType
  /** 内容: 代码片段 / 组件内容对象(包含js和css路径) */
  content: ComponentContent
  /** 传递给组件的额外属性 */
  props?: Record<string, unknown>
}

/** 面板插槽配置 (对应 PanelSlot) */
export interface PanelSlotConfig extends BaseSlotConfig {
  /** 插槽类型 */
  type: 'panel'
  /** 位置 */
  position: 'left-sidebar' | 'right-sidebar' | 'bottom'
  /** 面板宽度 (仅 sidebar 生效) */
  width?: number
  /** 面板高度 (仅 bottom 生效) */
  height?: number
  /** 内容类型 */
  contentType: SlotContentType
  /** 内容: 代码片段 / 组件内容对象(包含js和css路径) */
  content: ComponentContent
  /** 传递给组件的额外属性 */
  props?: Record<string, unknown>
  /** 替换的主程序视图ID (可选) */
  replaceViewId?: string
}

/** 视图插槽配置 (对应 ViewSlot) */
export interface ViewSlotConfig extends BaseSlotConfig {
  /** 插槽类型 */
  type: 'view'
  /** 图标 (Element Plus 图标名) */
  icon?: string
  /** 内容类型 */
  contentType: SlotContentType
  /** 内容: 代码片段 / 组件内容对象(包含js和css路径) */
  content: ComponentContent
  /** 传递给组件的额外属性 */
  props?: Record<string, unknown>
}

/** 菜单插槽配置 (对应 MenuSlot) */
export interface MenuSlotConfig extends BaseSlotConfig {
  /** 插槽类型 */
  type: 'menu'
  /** 图标 (Element Plus 图标名) */
  icon?: string
  /** 关联的视图ID (点击菜单时打开的视图) */
  viewId?: string
  /** 子菜单项 */
  children?: MenuSlotConfig[]
}

/** 站点浏览器列表插槽配置 (对应 siteBrowserList) */
export interface SiteBrowserListSlotConfig extends BaseSlotConfig {
  /** 插槽类型 */
  type: 'siteBrowserList'
  /** 贡献点id（站点浏览器在插件内的唯一标识） */
  contributionId: string
  /** 插件公开ID */
  pluginPublicId: string
  /** 图片路径 */
  imagePath: string
}

/** 所有插槽配置的联合类型 */
export type SlotConfig = EmbedSlotConfig | PanelSlotConfig | ViewSlotConfig | MenuSlotConfig | SiteBrowserListSlotConfig
