import SettingsUtil from '../util/SettingsUtil.ts'
import { Settings } from '../model/utilModels/Settings.ts'

/**
 * 全量获取配置
 */
function getSettings(): Settings {
  return global.settings.get()
}

/**
 * 变更配置
 */
function saveSettings(settings: { path: string; value: unknown }[]) {
  for (const setting of settings) {
    global.settings.set(setting.path, setting.value)
  }
}

/**
 * 重置配置
 */
function resetSettings() {
  SettingsUtil.defaultSettings()
}
export default {
  getSettings,
  saveSettings,
  resetSettings
}
