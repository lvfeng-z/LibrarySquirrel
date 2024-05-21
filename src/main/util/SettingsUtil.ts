import Store from 'electron-store'
import settingsTemplate from '../resources/settings/settingsTemplate.json'
import LogUtil from './LogUtil.ts'

/**
 * 根据配置状态初始化设置，并创建全局设置对象
 */
function initializeSettingsConfig() {
  const settings = new Store()
  global.settings = settings
  if (!settings.get('initialized', false)) {
    defaultSettings()
  }
}

/**
 * 将设置全部重置到默认值
 */
function defaultSettings() {
  try {
    global.settings.clear()
    global.settings.set(settingsTemplate)
    global.settings.set('initialized', true)
  } catch (error) {
    global.settings.set('initialized', false)
    LogUtil.error('SettingsUtil', String(error))
    throw error
  }
}

/**
 * 修复设置
 */
function fixSettings() {
  return true
}

export default {
  initializeSettingsConfig,
  defaultSettings,
  fixSettings
}
