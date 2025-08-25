import BaseEntity from '../../base/BaseEntity.ts'
import { NotNullish } from '../../util/CommonUtil.js'

export default class PluginTaskUrlListener extends BaseEntity {
  /**
   * 插件id
   */
  pluginId: number | undefined | null

  /**
   * 监听表达式
   */
  listener: string | undefined | null

  constructor(pluginTaskUrlListener?: PluginTaskUrlListener) {
    super(pluginTaskUrlListener)
    if (NotNullish(pluginTaskUrlListener)) {
      this.pluginId = pluginTaskUrlListener.pluginId
      this.listener = pluginTaskUrlListener.listener
    }
  }
}
