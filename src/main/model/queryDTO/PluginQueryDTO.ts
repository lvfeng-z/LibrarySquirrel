import BaseQueryDTO from '../../base/BaseQueryDTO.js'
import { NotNullish } from '../../util/CommonUtil.js'

export default class PluginQueryDTO extends BaseQueryDTO {
  /**
   * 插件类型
   */
  type: string | undefined | null

  /**
   * 作者
   */
  author: string | undefined | null

  /**
   * 名称
   */
  name: string | undefined | null

  /**
   * 版本
   */
  version: string | undefined | null

  /**
   * 描述
   */
  description: string | undefined | null

  /**
   * 更新日志
   */
  changelog: string | undefined | null

  /**
   * 入口文件名
   */
  fileName: string | undefined | null

  /**
   * 安装包路径
   */
  packagePath: string | undefined | null

  /**
   * 排序号
   */
  sortNum: number | undefined | null

  constructor(plugin?: PluginQueryDTO) {
    super(plugin)
    if (NotNullish(plugin)) {
      this.type = plugin.type
      this.author = plugin.author
      this.name = plugin.name
      this.version = plugin.version
      this.fileName = plugin.fileName
      this.packagePath = plugin.packagePath
      this.sortNum = plugin.sortNum
    }
  }
}
