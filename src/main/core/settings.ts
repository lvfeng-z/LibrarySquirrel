import { isNullish } from '@shared/util/CommonUtil.ts'
import ElectronStore from 'electron-store'
import { DefaultSettings } from '../util/SettingsUtil.ts'
import { Settings } from './types/Settings.ts'

let settings: ElectronStore<Settings> | undefined = undefined

function createSettings(): void {
  if (isNullish(settings)) {
    settings = new ElectronStore<Settings>()
    if (!settings.get('initialized')) {
      DefaultSettings()
    }
  }
}

function getSettings(): ElectronStore<Settings> {
  if (isNullish(settings)) {
    throw new Error('设置未初始化！')
  }
  return settings
}

export { createSettings, getSettings }
