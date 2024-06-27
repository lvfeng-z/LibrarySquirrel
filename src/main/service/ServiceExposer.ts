import LocalTagService from './LocalTagService.ts'
import Electron from 'electron'
import SelectItem from '../model/utilModels/SelectItem.ts'
import SiteTagService from './SiteTagService.ts'
import SiteService from './SiteService.ts'
import SiteTagQueryDTO from '../model/queryDTO/SiteTagQueryDTO.ts'
import PageModel from '../model/utilModels/PageModel.ts'
import SiteTag from '../model/SiteTag.ts'
import InsertLocalTag from '../test/InsertLocalTag.ts'
import SettingsService from './SettingsService.ts'
import WorksService from './WorksService.ts'
import ApiUtil from '../util/ApiUtil.ts'
import TaskService from './TaskService.ts'
import TaskPluginListenerService from './TaskPluginListenerService.ts'
import LocalAuthorService from './LocalAuthorService.ts'
import LogUtil from '../util/LogUtil.ts'

function exposeService(mainWindow: Electron.BrowserWindow) {
  // test
  Electron.ipcMain.handle('test-insertLocalTag10W', async () => {
    return InsertLocalTag.insertLocalTag10W()
  })
  Electron.ipcMain.handle('test-transactionTest', async () => {
    return InsertLocalTag.transactionTest()
  })
  Electron.ipcMain.handle('test-taskPluginListenerService-saveBatch', async (_event, args) => {
    return TaskPluginListenerService.saveBatch(args)
  })
  Electron.ipcMain.handle('test-taskPluginListenerService-getMonitored', async (_event, args) => {
    return TaskPluginListenerService.getMonitored(args)
  })

  // LocalAuthorService
  Electron.ipcMain.handle('localAuthor-selectPage', async (_event, args) => {
    const service = new LocalAuthorService()
    args = new PageModel(args)
    try {
      const page = await service.selectPage(args)
      return ApiUtil.response(page)
    } catch (error) {
      LogUtil.error('ServiceExposer', error)
      return ApiUtil.error(String(error))
    }
  })
  Electron.ipcMain.handle('localAuthor-getSelectItems', async (_event, args) => {
    const service = new LocalAuthorService()
    try {
      const result = await service.getSelectItems(args)
      return ApiUtil.response(result)
    } catch (error) {
      LogUtil.error('ServiceExposer', error)
      return ApiUtil.error(String(error))
    }
  })
  Electron.ipcMain.handle('localAuthor-getSelectItemPage', async (_event, args) => {
    const service = new LocalAuthorService()
    try {
      const result = await service.getSelectItemPage(args)
      return ApiUtil.response(result)
    } catch (error) {
      LogUtil.error('ServiceExposer', error)
      return ApiUtil.error(String(error))
    }
  })

  // LocalTagService
  Electron.ipcMain.handle('localTag-save', async (_event, args) => {
    const localTagService = new LocalTagService()
    try {
      return ApiUtil.response(await localTagService.save(args))
    } catch (error) {
      LogUtil.error('ServiceExposer', error)
      return ApiUtil.error(String(error))
    }
  })
  Electron.ipcMain.handle('localTag-deleteById', async (_event, args) => {
    const localTagService = new LocalTagService()
    try {
      return ApiUtil.response(await localTagService.deleteById(args))
    } catch (error) {
      LogUtil.error('ServiceExposer', error)
      return ApiUtil.error(String(error))
    }
  })
  Electron.ipcMain.handle('localTag-updateById', async (_event, args) => {
    const localTagService = new LocalTagService()
    try {
      return ApiUtil.response(await localTagService.updateById(args))
    } catch (error) {
      LogUtil.error('ServiceExposer', error)
      return ApiUtil.error(String(error))
    }
  })
  Electron.ipcMain.handle('localTag-selectPage', async (_event, args) => {
    const localTagService = new LocalTagService()
    try {
      return ApiUtil.response(await localTagService.selectPage(args))
    } catch (error) {
      LogUtil.error('ServiceExposer', error)
      return ApiUtil.error(String(error))
    }
  })
  Electron.ipcMain.handle('localTag-getById', async (_event, args) => {
    const localTagService = new LocalTagService()
    try {
      return ApiUtil.response(await localTagService.getById(args))
    } catch (error) {
      LogUtil.error('ServiceExposer', error)
      return ApiUtil.error(String(error))
    }
  })
  Electron.ipcMain.handle('localTag-getTree', async (_event, args) => {
    const localTagService = new LocalTagService()
    try {
      return ApiUtil.response(await localTagService.getTree(args))
    } catch (error) {
      LogUtil.error('ServiceExposer', error)
      return ApiUtil.error(String(error))
    }
  })
  Electron.ipcMain.handle('localTag-getSelectList', async (_event, args) => {
    const localTagService = new LocalTagService()
    try {
      return ApiUtil.response(await localTagService.getSelectList(args))
    } catch (error) {
      LogUtil.error('ServiceExposer', error)
      return ApiUtil.error(String(error))
    }
  })
  Electron.ipcMain.handle('localTag-getSelectItemPage', async (_event, args) => {
    const localTagService = new LocalTagService()
    try {
      return ApiUtil.response(await localTagService.getSelectItemPage(args))
    } catch (error) {
      LogUtil.error('ServiceExposer', error)
      return ApiUtil.error(String(error))
    }
  })

  //SettingsService
  Electron.ipcMain.handle('settings-getSettings', () => {
    return SettingsService.getSettings()
  })
  Electron.ipcMain.handle('settings-saveSettings', (_event, args) => {
    return SettingsService.saveSettings(args)
  })
  Electron.ipcMain.handle('settings-resetSettings', () => {
    return SettingsService.resetSettings()
  })

  // SiteService
  Electron.ipcMain.handle('site-getSelectItemPage', async (_event, args) => {
    const siteService = new SiteService()
    try {
      return ApiUtil.response(await siteService.getSelectItemPage(args))
    } catch (error) {
      LogUtil.error('ServiceExposer', error)
      return ApiUtil.error(String(error))
    }
  })

  // SiteTagService
  Electron.ipcMain.handle('siteTag-save', async (_event, args) => {
    return SiteTagService.save(args)
  })
  Electron.ipcMain.handle('siteTag-updateById', async (_event, args) => {
    return SiteTagService.updateById(args)
  })
  Electron.ipcMain.handle(
    'siteTag-updateBindLocalTag',
    async (_event, localTagId: string | null, siteTagIds: string[]) => {
      return SiteTagService.updateBindLocalTag(localTagId, siteTagIds)
    }
  )
  Electron.ipcMain.handle(
    'siteTag-getBoundOrUnboundInLocalTag',
    async (_event, page: PageModel<SiteTagQueryDTO, SiteTag>) => {
      return await SiteTagService.getBoundOrUnboundInLocalTag(page)
    }
  )
  Electron.ipcMain.handle('siteTag-getSelectList', async (_event, args): Promise<SelectItem[]> => {
    return SiteTagService.getSelectList(args)
  })

  // TaskService
  Electron.ipcMain.handle('taskService-startTask', async (_event, args) => {
    return TaskService.startTask(args, mainWindow)
  })
  Electron.ipcMain.handle('taskService-createTask', (_event, args) => {
    return TaskService.createTask(args, mainWindow)
  })

  // WorksService
  Electron.ipcMain.handle('works-queryPage', async (_event, args): Promise<ApiUtil> => {
    const worksService = new WorksService()
    try {
      const result = await worksService.queryPage(args)
      return ApiUtil.response(result)
    } catch (error) {
      LogUtil.error('ServiceExposer', error)
      return ApiUtil.error(String(error))
    }
  })
  Electron.ipcMain.handle('worksService-saveWorks', async (_event, args): Promise<ApiUtil> => {
    const worksService = new WorksService()
    try {
      const result = await worksService.saveWorks(args)
      return ApiUtil.response(result)
    } catch (error) {
      LogUtil.error('ServiceExposer', error)
      return ApiUtil.error(String(error))
    }
  })
}

export default {
  exposeService
}
