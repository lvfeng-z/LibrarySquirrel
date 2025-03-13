export default interface PluginInstallConfig {
  /**
   * 插件类型
   */
  type: string

  /**
   * 作者
   */
  author: string

  /**
   * 名称
   */
  name: string

  /**
   * 版本
   */
  version: string

  /**
   * 描述
   */
  description: string

  /**
   * 更新日志
   */
  changelog: string

  /**
   * 入口文件名
   */
  fileName: string

  /**
   * 域名列表
   */
  domains: { domain: string; homepage: string; site?: string }[]

  /**
   * 监听路径列表
   */
  listeners: string[]
}
