import Plugin from '../entity/Plugin.ts'
import PluginTaskUrlListener from '../util/PluginTaskUrlListener.ts'
import lodash from 'lodash'
import { notNullish } from '../../util/CommonUtil.ts'

export default class PluginListenerDTO extends Plugin {
  /**
   * 任务创建监听器
   */
  pluginTaskUrlListeners: PluginTaskUrlListener[] | undefined | null

  constructor(pluginListenerDTO?: Plugin) {
    super(pluginListenerDTO)
    if (notNullish(pluginListenerDTO)) {
      lodash.assign(this, lodash.pick(pluginListenerDTO, ['pluginTaskUrlListeners']))
    }
  }
}
