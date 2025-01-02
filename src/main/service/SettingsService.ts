import { defaultSettings } from '../util/SettingsUtil.ts'
import { Settings } from '../model/util/Settings.ts'
import { GlobalVar, GlobalVars } from '../global/GlobalVar.ts'
import LogUtil from '../util/LogUtil.js'

/**
 * 全量获取配置
 */
function getSettings(): Settings {
  return GlobalVar.get(GlobalVars.SETTINGS).store
}

/**
 * 变更配置
 */
function saveSettings(settings: { path: string; value: unknown }[]): boolean {
  try {
    for (const setting of settings) {
      GlobalVar.get(GlobalVars.SETTINGS).set(setting.path, setting.value)
    }
    return true
  } catch (e) {
    LogUtil.error('SettingsService', '修改设置失败，', e)
    return false
  }
}

/**
 * 重置配置
 */
function resetSettings() {
  try {
    defaultSettings()
    return true
  } catch (e) {
    LogUtil.error('SettingsService', '重置设置失败，', e)
    return false
  }
}

export default {
  getSettings,
  saveSettings,
  resetSettings
}
