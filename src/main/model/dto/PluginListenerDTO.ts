import Plugin from '../entity/Plugin.js'
import PluginTaskUrlListener from '../entity/PluginTaskUrlListener.js'
import lodash from 'lodash'
import { NotNullish } from '../../util/CommonUtil.js'

export default class PluginListenerDTO extends Plugin {
  /**
   * 任务创建监听器
   */
  pluginTaskUrlListeners: PluginTaskUrlListener[] | undefined | null

  constructor(pluginListenerDTO?: Plugin) {
    super(pluginListenerDTO)
    if (NotNullish(pluginListenerDTO)) {
      lodash.assign(this, lodash.pick(pluginListenerDTO, ['pluginTaskUrlListeners']))
    }
  }
}
