import BaseModel from './BaseModel.ts'

export default class InstalledPlugins extends BaseModel {
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

  constructor(installedPlugins?: InstalledPlugins) {
    if (installedPlugins === undefined) {
      super()
      this.type = undefined
      this.author = undefined
      this.domain = undefined
      this.version = undefined
      this.fileName = undefined
      this.sortNum = undefined
    } else {
      super(installedPlugins)
      this.type = installedPlugins.type
      this.author = installedPlugins.author
      this.domain = installedPlugins.domain
      this.version = installedPlugins.version
      this.fileName = installedPlugins.fileName
      this.sortNum = installedPlugins.sortNum
    }
  }
}