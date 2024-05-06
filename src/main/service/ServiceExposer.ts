import LocalTagService from './LocalTagService'
import { ipcMain } from 'electron'
import SelectVO from '../model/utilModels/SelectVO'
import SiteTagService from './SiteTagService'
import SiteService from './SiteService'
import SiteTagQueryDTO from '../model/queryDTO/SiteTagQueryDTO'

export function exposeService() {
  // LocalTagService
  ipcMain.handle('localTag-save', async (_event, args) => {
    return await LocalTagService.save(args)
  })
  ipcMain.handle('localTag-deleteById', async (_event, args) => {
    return await LocalTagService.deleteById(args)
  })
  ipcMain.handle('localTag-updateById', async (_event, args) => {
    return await LocalTagService.updateById(args)
  })
  ipcMain.handle('localTag-query', async (_event, args) => {
    return await LocalTagService.query(args)
  })
  ipcMain.handle('localTag-getById', async (_event, args) => {
    return await LocalTagService.getById(args)
  })
  ipcMain.handle('localTag-getSelectList', async (_event, args): Promise<SelectVO[]> => {
    return await LocalTagService.getSelectList(args)
  })

  // SiteService
  ipcMain.handle('site-insert', async (_event, args) => {
    return await SiteService.save(args)
  })
  ipcMain.handle('site-getSelectList', async (_event, args) => {
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
  ipcMain.handle(
    'siteTag-getBoundOrUnboundInLocalTag',
    async (_event, queryDTO: SiteTagQueryDTO) => {
      return await SiteTagService.getBoundOrUnboundInLocalTag(queryDTO)
    }
  )
  ipcMain.handle('siteTag-getSelectList', async (_event, args): Promise<SelectVO[]> => {
    return await SiteTagService.getSelectList(args)
  })
}
