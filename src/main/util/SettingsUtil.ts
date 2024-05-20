import Store from 'electron-store'
import settingsTemplate from '../resources/settings/settingsTemplate.json'
import LogUtil from './LogUtil.ts'

function initializeSettingsConfig() {
  const settings = new Store()
  global.settings = settings
  if (!settings.get('initialized', false)) {
    try {
      settings.set(settingsTemplate)
      settings.set('initialized', true)
    } catch (error) {
      settings.set('initialized', false)
      LogUtil.error('SettingsUtil', String(error))
      throw error
    }
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
  fixSettings
}
