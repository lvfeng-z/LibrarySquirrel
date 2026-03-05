import { isNullish } from '@shared/util/CommonUtil.ts'
import PluginManager from '../plugin/PluginManager.ts'

let pluginManager: PluginManager | undefined = undefined

function createPluginManager() {
  if (isNullish(pluginManager)) {
    pluginManager = new PluginManager()
  }
}

function getPluginManager() {
  if (isNullish(pluginManager)) {
    throw new Error('插件管理器未初始化！')
  }
  return pluginManager
}

export { createPluginManager, getPluginManager }
