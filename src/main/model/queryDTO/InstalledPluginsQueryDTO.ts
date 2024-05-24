import BaseQueryDTO from './BaseQueryDTO.ts'

export default class InstalledPluginsQueryDTO extends BaseQueryDTO {
  /**
   * 插件类型
   */
  type: number | undefined | null

  /**
   * 作者
   */
  author: string | undefined | null

  /**
   * 域名
   */
  domain: string | undefined | null

  /**
   * 版本
   */
  version: string | undefined | null

  /**
   * 类名+扩展名
   */
  className: string | undefined | null

  constructor(installedPlugins?: InstalledPluginsQueryDTO) {
    if (installedPlugins === undefined) {
      super()
      this.type = undefined
      this.author = undefined
      this.domain = undefined
      this.version = undefined
      this.className = undefined
    } else {
      super(installedPlugins)
      this.type = installedPlugins.type
      this.author = installedPlugins.author
      this.domain = installedPlugins.domain
      this.version = installedPlugins.version
      this.className = installedPlugins.className
    }
  }
}
