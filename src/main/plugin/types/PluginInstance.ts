import { PluginManifest } from './PluginManifest.ts'
import { PluginContext } from './PluginContext.ts'
import { BaseContribution, ContributionKey } from './ContributionTypes.ts'

/**
 * 插件实例
 * 插件入口函数返回的对象结构
 */
export interface PluginInstance {
  /** 插件清单 */
  manifest: PluginManifest
  /** 激活函数 - 插件加载完成后调用 */
  activate?: () => Promise<void>
  /** 停用函数 - 插件卸载前调用 */
  deactivate?: () => Promise<void>
  getContribution: <T extends BaseContribution>(key: ContributionKey, contributionId: string) => Promise<T>
}

/**
 * 插件入口点函数类型
 * 主程序通过 import() 加载插件后调用的函数
 */
export type PluginEntryPoint = (context: PluginContext) => PluginInstance | Promise<PluginInstance>
