import { BasePlugin } from '../base/BasePlugin.js'
import { PluginContext } from './types/PluginContext.ts'
import PluginLoadDTO from '@shared/model/dto/PluginLoadDTO.js'

export default interface PluginFactory<T extends BasePlugin> {
  create(pluginLoadDTO: PluginLoadDTO, context?: PluginContext): Promise<T>
}
