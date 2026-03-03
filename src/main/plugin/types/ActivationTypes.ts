/**
 * 插件加载时机类型
 */
export enum ActivationType {
  /** 主程序启动时加载 */
  STARTUP = 'startup',
  /** 按需加载 - 首次使用时加载 */
  LAZY = 'lazy',
  /** 手动加载 - 需要显式调用激活 */
  MANUAL = 'manual'
}

/**
 * 激活配置
 */
export interface ActivationConfig {
  /** 加载时机 */
  type: ActivationType
  /** 依赖的其他贡献点（可选） */
  dependencies?: string[]
}
