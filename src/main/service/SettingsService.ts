import { DefaultSettings } from '../util/SettingsUtil.ts'
import { Settings } from '../core/types/Settings.ts'
import LogUtil from '../util/LogUtil.js'
import { getTaskQueue } from '../core/taskQueue.ts'
import { getSettings as settingsGetSettings } from '../core/settings.ts'

/**
 * 全量获取配置
 */
function getSettings(): Settings {
  return settingsGetSettings().store
}

/**
 * 变更配置
 */
function saveSettings(settings: { path: string; value: unknown }[]): boolean {
  try {
    for (const setting of settings) {
      if (setting.path === 'importSettings.maxParallelImport') {
        // 读取设置中的最大并行数
        const maxParallelImport = settingsGetSettings().store.importSettings.maxParallelImport
        getTaskQueue().updateMaxParallel(maxParallelImport)
      }
      settingsGetSettings().set(setting.path, setting.value)
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
    DefaultSettings()
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
