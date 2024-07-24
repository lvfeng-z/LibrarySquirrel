import { dialog } from 'electron'
import SettingsService from '../service/SettingsService.ts'

export async function dirSelect(openFile: boolean): Promise<Electron.OpenDialogReturnValue> {
  const defaultPath = SettingsService.getSettings()['workdir']
  const properties: Array<'openFile' | 'openDirectory' | 'multiSelections'> = ['multiSelections']
  if (openFile) {
    properties.push('openFile')
  } else {
    properties.push('openDirectory')
  }
  return dialog.showOpenDialog({
    defaultPath: defaultPath,
    properties: properties
  })
}
