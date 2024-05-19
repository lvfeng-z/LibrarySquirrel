import LocalTagService from './LocalTagService'
import Electron from 'electron'
import SelectItem from '../model/utilModels/SelectItem'
import SiteTagService from './SiteTagService'
import SiteService from './SiteService'
import SiteTagQueryDTO from '../model/queryDTO/SiteTagQueryDTO'
import PageModel from '../model/utilModels/PageModel'
import SiteTag from '../model/SiteTag'
import InsertLocalTag from '../test/InsertLocalTag'

function exposeService() {
  // test
  Electron.ipcMain.handle('test-insertLocalTag10W', async () => {
    return await InsertLocalTag.insertLocalTag10W()
  })

  // LocalTagService
  Electron.ipcMain.handle('localTag-save', async (_event, args) => {
    return await LocalTagService.save(args)
  })
  Electron.ipcMain.handle('localTag-deleteById', async (_event, args) => {
    return await LocalTagService.deleteById(args)
  })
  Electron.ipcMain.handle('localTag-updateById', async (_event, args) => {
    return await LocalTagService.updateById(args)
  })
  Electron.ipcMain.handle('localTag-queryPage', async (_event, args) => {
    return await LocalTagService.queryPage(args)
  })
  Electron.ipcMain.handle('localTag-getById', async (_event, args) => {
    return await LocalTagService.getById(args)
  })
  Electron.ipcMain.handle('localTag-getTree', async (_event, args) => {
    return await LocalTagService.getTree(args)
  })
  Electron.ipcMain.handle('localTag-getSelectList', async (_event, args): Promise<SelectItem[]> => {
    return await LocalTagService.getSelectList(args)
  })

  // SiteService
  Electron.ipcMain.handle('site-insert', async (_event, args) => {
    return await SiteService.save(args)
  })
  Electron.ipcMain.handle('site-getSelectList', async (_event, args) => {
    return await SiteService.getSelectList(args)
  })

  // SiteTagService
  Electron.ipcMain.handle('siteTag-save', async (_event, args) => {
    return await SiteTagService.save(args)
  })
  Electron.ipcMain.handle('siteTag-updateById', async (_event, args) => {
    return await SiteTagService.updateById(args)
  })
  Electron.ipcMain.handle(
    'siteTag-updateBindLocalTag',
    async (_event, localTagId: string | null, siteTagIds: string[]) => {
      return await SiteTagService.updateBindLocalTag(localTagId, siteTagIds)
    }
  )
  Electron.ipcMain.handle(
    'siteTag-getBoundOrUnboundInLocalTag',
    async (_event, page: PageModel<SiteTagQueryDTO, SiteTag>) => {
      return await SiteTagService.getBoundOrUnboundInLocalTag(page)
    }
  )
  Electron.ipcMain.handle('siteTag-getSelectList', async (_event, args): Promise<SelectItem[]> => {
    return await SiteTagService.getSelectList(args)
  })
}

export default {
  exposeService
}
