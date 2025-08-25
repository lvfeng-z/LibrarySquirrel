import Plugin from '../entity/Plugin.js'
import PluginTaskUrlListener from '@renderer/model/main/entity/PluginTaskUrlListener.ts'
import { NotNullish } from '@renderer/utils/CommonUtil.ts'
import lodash from 'lodash'

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
