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
  ipcMain.handle('localTag-query', (_event, args) => {
    LocalTagService.query(args)
  })
  ipcMain.handle('localTag-getSelectList', async (_event, args): Promise<SelectVO[]> => {
    console.log('ServiceExposer.ts', args)
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
  ipcMain.handle('siteTag-insert', (_event, args) => {
    SiteTagService.insert(args)
  })
  ipcMain.handle('siteTag-getSelectList', async (_event, args): Promise<SelectVO[]> => {
    return await SiteTagService.getSelectList(args)
  })
}
