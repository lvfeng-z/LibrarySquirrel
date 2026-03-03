import { PluginManifest } from './PluginManifest.ts'
import { PluginContext } from './PluginContext.ts'
import { BaseContribution, ContributionKey, ContributionMap } from './ContributionTypes.ts'

/**
 * 插件实例
 * 插件入口函数返回的对象结构
 */
export interface PluginInstance {
  /** 插件清单 */
  manifest: PluginManifest
  /** 已实现的贡献点映射 */
  implementations: Partial<ContributionMap>
  /** 激活函数 - 插件加载完成后调用 */
  activate?: (context: PluginContext) => Promise<void>
  /** 停用函数 - 插件卸载前调用 */
  deactivate?: (context: PluginContext) => Promise<void>
  getContribution: <T extends BaseContribution>(key: ContributionKey) => Promise<T>
}

/**
 * 插件入口点函数类型
 * 主程序通过 import() 加载插件后调用的函数
 */
export type PluginEntryPoint = (context: PluginContext) => PluginInstance | Promise<PluginInstance>
