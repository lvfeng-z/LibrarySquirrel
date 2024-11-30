import BaseEntity from './BaseEntity.ts'

export default class Plugin extends BaseEntity {
  /**
   * 主键
   */
  id: number | null | undefined
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
  fileName: string | undefined | null

  /**
   * 排序号
   */
  sortNum: number | undefined | null

  constructor(plugin?: Plugin) {
    if (plugin === undefined) {
      super()
      this.id = undefined
      this.type = undefined
      this.author = undefined
      this.domain = undefined
      this.version = undefined
      this.fileName = undefined
      this.sortNum = undefined
    } else {
      super(plugin)
      this.id = plugin.id
      this.type = plugin.type
      this.author = plugin.author
      this.domain = plugin.domain
      this.version = plugin.version
      this.fileName = plugin.fileName
      this.sortNum = plugin.sortNum
    }
  }
}
