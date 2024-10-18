import settingsTemplate from '../resources/settings/settingsTemplate.json'
import LogUtil from './LogUtil.ts'
import { GlobalVar, GlobalVars } from '../global/GlobalVar.ts'

/**
 * 将设置全部重置到默认值
 */
export function defaultSettings() {
  try {
    GlobalVar.get(GlobalVars.SETTINGS).clear()
    GlobalVar.get(GlobalVars.SETTINGS).set(settingsTemplate)
    GlobalVar.get(GlobalVars.SETTINGS).set('initialized', true)
  } catch (error) {
    GlobalVar.get(GlobalVars.SETTINGS).set('initialized', false)
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
