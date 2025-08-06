import { BasePlugin } from '../base/BasePlugin.js'
import PluginTool from './PluginTool.js'
import PluginLoadDTO from '../model/dto/PluginLoadDTO.js'

export default interface PluginFactory<T extends BasePlugin> {
  create(pluginLoadDTO: PluginLoadDTO, pluginTool?: PluginTool): Promise<T>
}
