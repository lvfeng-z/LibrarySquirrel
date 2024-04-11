import TagLocalService from './TagLocalService'
import { ipcMain } from 'electron'
import SelectVO from '../models/utilModels/SelectVO'

export function exposeService() {
  ipcMain.handle('tagLocal-insert', (_event, args) => {
    TagLocalService.insert(args)
  })
  ipcMain.handle('tagLocal-query', (_event, args) => {
    TagLocalService.query(args)
  })
  ipcMain.handle('tagLocal-getSelectList', async (_event, args): Promise<SelectVO[]> => {
    return await TagLocalService.getSelectList(args)
  })
}
