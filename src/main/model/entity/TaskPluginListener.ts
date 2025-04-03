import BaseEntity from '../../base/BaseEntity.ts'
import { NotNullish } from '../../util/CommonUtil.js'

export default class TaskPluginListener extends BaseEntity {
  /**
   * 插件id
   */
  pluginId: number | undefined | null

  /**
   * 监听表达式
   */
  listener: string | undefined | null

  constructor(taskPluginListener?: TaskPluginListener) {
    super(taskPluginListener)
    if (NotNullish(taskPluginListener)) {
      this.pluginId = taskPluginListener.pluginId
      this.listener = taskPluginListener.listener
    }
  }
}
