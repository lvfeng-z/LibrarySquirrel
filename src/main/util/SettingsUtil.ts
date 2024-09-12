import settingsTemplate from '../resources/settings/settingsTemplate.json'
import LogUtil from './LogUtil.ts'
import { GlobalVarManager, GlobalVars } from '../GlobalVar.ts'

/**
 * 将设置全部重置到默认值
 */
export function defaultSettings() {
  try {
    GlobalVarManager.get(GlobalVars.SETTINGS).clear()
    GlobalVarManager.get(GlobalVars.SETTINGS).set(settingsTemplate)
    GlobalVarManager.get(GlobalVars.SETTINGS).set('initialized', true)
  } catch (error) {
    GlobalVarManager.get(GlobalVars.SETTINGS).set('initialized', false)
    LogUtil.error('SettingsUtil', String(error))
    throw error
  }
}

/**
 * 修复设置
 */
export function fixSettings() {
  return true
}
