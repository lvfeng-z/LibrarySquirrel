import Plugin from '../entity/Plugin.ts'
import { IsNullish } from '../../util/CommonUtil.ts'

export default class PluginLoadDTO extends Plugin {
  /**
   * 加载路径
   */
  loadPath: string | undefined | null

  constructor(pluginDTO?: PluginLoadDTO | Plugin) {
    super(pluginDTO)
    if (IsNullish(pluginDTO)) {
      this.loadPath = undefined
    } else if (pluginDTO instanceof PluginLoadDTO) {
      super(pluginDTO)
      this.loadPath = pluginDTO.loadPath
    } else {
      this.loadPath = undefined
    }
  }
}
