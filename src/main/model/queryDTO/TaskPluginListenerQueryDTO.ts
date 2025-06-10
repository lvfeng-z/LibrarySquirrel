import BaseQueryDTO from '../../base/BaseQueryDTO.js'
import { NotNullish } from '../../util/CommonUtil.js'

export default class TaskPluginListenerQueryDTO extends BaseQueryDTO {
  /**
   * 插件id
   */
  pluginId: number | undefined | null

  /**
   * 监听表达式
   */
  listener: string | undefined | null

  constructor(taskPluginListenerQueryDTO?: TaskPluginListenerQueryDTO) {
    super(taskPluginListenerQueryDTO)
    if (NotNullish(taskPluginListenerQueryDTO)) {
      this.pluginId = taskPluginListenerQueryDTO.pluginId
      this.listener = taskPluginListenerQueryDTO.listener
    }
  }
}
