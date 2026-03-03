import Plugin from '../entity/Plugin.ts'

export default class PluginInstallResultDTO {
  /**
   * 插件信息
   */
  plugin: Plugin

  /**
   * 域名列表
   */
  domains: { domain: string; homepage: string }[]

  constructor(plugin: Plugin, domains: { domain: string; homepage: string }[]) {
    this.plugin = plugin
    this.domains = domains
  }
}
