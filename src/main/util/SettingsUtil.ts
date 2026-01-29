import { SettingsTemplate } from '../resources/settings/SettingsTemplate.js'
import LogUtil from './LogUtil.ts'
import { getSettings } from '../core/settings.ts'

/**
 * 将设置全部重置到默认值
 */
export function DefaultSettings() {
  const settings = getSettings()
  try {
    settings.clear()
    settings.set(SettingsTemplate)
    settings.set('initialized', true)
  } catch (error) {
    settings.set('initialized', false)
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
