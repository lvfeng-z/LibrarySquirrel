import LocalTagService from './LocalTagService'
import { ipcMain } from 'electron'
import SelectItem from '../model/utilModels/SelectItem'
import SiteTagService from './SiteTagService'
import SiteService from './SiteService'
import SiteTagQueryDTO from '../model/queryDTO/SiteTagQueryDTO'
import { PageModel } from '../model/utilModels/PageModel'
import SiteTag from '../model/SiteTag'

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
  ipcMain.handle('localTag-queryPage', async (_event, args) => {
    return await LocalTagService.queryPage(args)
  })
  ipcMain.handle('localTag-getById', async (_event, args) => {
    return await LocalTagService.getById(args)
  })
  ipcMain.handle('localTag-getTree', async (_event, args) => {
    return await LocalTagService.getTree(args)
  })
  ipcMain.handle('localTag-getSelectList', async (_event, args): Promise<SelectItem[]> => {
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
    async (_event, page: PageModel<SiteTagQueryDTO, SiteTag>) => {
      return await SiteTagService.getBoundOrUnboundInLocalTag(page)
    }
  )
  ipcMain.handle('siteTag-getSelectList', async (_event, args): Promise<SelectItem[]> => {
    return await SiteTagService.getSelectList(args)
  })
}
