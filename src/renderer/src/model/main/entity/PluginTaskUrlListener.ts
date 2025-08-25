import { NotNullish } from '@renderer/utils/CommonUtil.ts'
import BaseEntity from '@renderer/model/main/entity/BaseEntity.ts'

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
