import LocalTagService from './LocalTagService'
import { ipcMain } from 'electron'
import SelectVO from '../models/utilModels/SelectVO'
import SiteTagService from './SiteTagService'
import SiteService from './SiteService'

export function exposeService() {
  // LocalTagService
  ipcMain.handle('localTag-insert', (_event, args) => {
    LocalTagService.insert(args)
  })
  ipcMain.handle('localTag-query', async (_event, args) => {
    return await LocalTagService.query(args)
  })
  ipcMain.handle('localTag-getSelectList', async (_event, args): Promise<SelectVO[]> => {
    return await LocalTagService.getSelectList(args)
  })

  // SiteService
  ipcMain.handle('site-insert', (_event, args) => {
    SiteService.insert(args)
  })
  ipcMain.handle('site-getSelectList', async (_event, args): Promise<SelectVO[]> => {
    return await SiteService.getSelectList(args)
  })

  // SiteTagService
  ipcMain.handle('siteTag-save', async (_event, args) => {
    return await SiteTagService.save(args)
  })
  ipcMain.handle('siteTag-updateById', async (_event, args) => {
    return await SiteTagService.updateById(args)
  })
  ipcMain.handle(
    'siteTag-updateBindLocalTag',
    async (_event, localTagId: string | null, siteTagIds: string[]) => {
      return await SiteTagService.updateBindLocalTag(localTagId, siteTagIds)
    }
  )
  ipcMain.handle('siteTag-getSelectList', async (_event, args): Promise<SelectVO[]> => {
    return await SiteTagService.getSelectList(args)
  })
}
