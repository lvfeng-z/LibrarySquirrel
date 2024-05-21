/**
 * 设置服务
 */

import SettingsUtil from '../util/SettingsUtil'

/**
 * 全量获取配置
 */
function getSettings(): object {
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
