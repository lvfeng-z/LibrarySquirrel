import { defaultSettings } from '../util/SettingsUtil.ts'
import { Settings } from '../model/utilModels/Settings.ts'
import { GlobalVarManager, GlobalVars } from '../GlobalVar.ts'

/**
 * 全量获取配置
 */
function getSettings(): Settings {
  return GlobalVarManager.get(GlobalVars.SETTINGS).store as Settings
}

/**
 * 变更配置
 */
function saveSettings(settings: { path: string; value: unknown }[]) {
  for (const setting of settings) {
    GlobalVarManager.get(GlobalVars.SETTINGS).set(setting.path, setting.value)
  }
}

/**
 * 重置配置
 */
function resetSettings() {
  defaultSettings()
}
export default {
  getSettings,
  saveSettings,
  resetSettings
}
