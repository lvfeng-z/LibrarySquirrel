import { SettingsTemplate } from '../resources/settings/SettingsTemplate.js'
import LogUtil from './LogUtil.ts'
import { GVar, GVarEnum } from '../base/GVar.ts'

/**
 * 将设置全部重置到默认值
 */
export function DefaultSettings() {
  try {
    GVar.get(GVarEnum.SETTINGS).clear()
    GVar.get(GVarEnum.SETTINGS).set(SettingsTemplate)
    GVar.get(GVarEnum.SETTINGS).set('initialized', true)
  } catch (error) {
    GVar.get(GVarEnum.SETTINGS).set('initialized', false)
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
