import { PluginManifest } from './PluginManifest.ts'
import { PluginContext } from './PluginContext.ts'
import { BaseContribution, ContributionKey } from './ContributionTypes.ts'
import { InstallType } from '@shared/model/interface/PluginInstallType.ts'
import { GetContributionOptions } from './ContributionFilePathInfo.ts'

/**
 * 插件实例
 * 插件入口函数返回的对象结构
 */
export interface PluginInstance {
  /** 插件清单 */
  manifest: PluginManifest
  /** 激活函数 - 插件加载完成后调用 */
  activate: () => Promise<void>
  /** 停用函数 - 插件卸载前调用 */
  deactivate: () => Promise<void>
  /** 安装后钩子 */
  onInstall: (type: InstallType, oldManifest?: PluginManifest) => Promise<void>
  /**
   * 获取贡献点实例
   * @param key 贡献点键名
   * @param contributionId 贡献点id
   * @param options 选项
   * @param options.returnFilePath 是否返回文件路径信息（用于子线程加载）
   */
  getContribution: <T extends BaseContribution>(
    key: ContributionKey,
    contributionId: string,
    options?: GetContributionOptions
  ) => Promise<T | string>
}

/**
 * 插件入口点函数类型
 * 主程序通过 import() 加载插件后调用的函数
 */
export type PluginEntryPoint = (context: PluginContext) => PluginInstance | Promise<PluginInstance>
