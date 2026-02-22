import BaseQueryDTO from '../base/BaseQueryDTO.ts'
import { NotNullish } from '../../util/CommonUtil.ts'

export default class PluginTaskUrlListenerQueryDTO extends BaseQueryDTO {
  /**
   * 插件id
   */
  pluginId: number | undefined | null

  /**
   * 监听表达式
   */
  listener: string | undefined | null

  constructor(pluginTaskUrlListenerQueryDTO?: PluginTaskUrlListenerQueryDTO) {
    super(pluginTaskUrlListenerQueryDTO)
    if (NotNullish(pluginTaskUrlListenerQueryDTO)) {
      this.pluginId = pluginTaskUrlListenerQueryDTO.pluginId
      this.listener = pluginTaskUrlListenerQueryDTO.listener
    }
  }
}
