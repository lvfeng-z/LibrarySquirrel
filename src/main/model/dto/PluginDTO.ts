import Plugin from '../entity/Plugin.ts'
import { IsNullish } from '../../util/CommonUtil.ts'

export default class PluginDTO extends Plugin {
  /**
   * 加载路径
   */
  loadPath: string | undefined | null

  constructor(pluginDTO?: PluginDTO | Plugin) {
    if (IsNullish(pluginDTO)) {
      super()
      this.loadPath = undefined
    } else if (pluginDTO instanceof PluginDTO) {
      super(pluginDTO)
      this.loadPath = pluginDTO.loadPath
    } else {
      super()
      this.loadPath = undefined
    }
  }
}
