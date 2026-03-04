import { ContributionKey } from './ContributionTypes.ts'
import { ActivationConfig } from './ActivationTypes.ts'

/**
 * 插件清单
 * 定义插件的元数据和贡献点声明
 */
export interface PluginManifest {
  /** 插件唯一标识 - 格式: <开发者反向域名>.<插件名>.<UUID> */
  id: string
  /** 插件名称 */
  name: string
  /** 插件版本 */
  version: string
  /** 插件作者 */
  author: string
  /** 插件描述 */
  description: string
  /** 贡献点列表 - 声明插件提供的功能 */
  contributes: ContributionKey[]
  /** 加载配置 */
  activation: ActivationConfig
  /** 入口文件名 */
  entryFile: string
}
