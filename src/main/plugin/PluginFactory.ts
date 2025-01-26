import { BasePlugin } from '../base/BasePlugin.js'
import PluginTool from './PluginTool.js'

export default interface PluginFactory<T extends BasePlugin> {
  create(pluginId: number, pluginTool?: PluginTool): Promise<T>
}
