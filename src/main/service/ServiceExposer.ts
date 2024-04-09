import TagLocalService from './TagLocalService'
import { ipcMain } from 'electron'
export function exposeService() {
  ipcMain.handle('TagService-insertTag', (_event, args) => {
    TagLocalService.insertTagLocalService(args)
  })
}
