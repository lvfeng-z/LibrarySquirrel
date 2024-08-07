import LocalTagService from './LocalTagService.ts'
import Electron from 'electron'
import SiteTagService from './SiteTagService.ts'
import SiteService from './SiteService.ts'
import SiteTagQueryDTO from '../model/queryDTO/SiteTagQueryDTO.ts'
import PageModel from '../model/utilModels/PageModel.ts'
import SiteTag from '../model/SiteTag.ts'
import test from '../test/test.ts'
import SettingsService from './SettingsService.ts'
import WorksService from './WorksService.ts'
import ApiUtil from '../util/ApiUtil.ts'
import TaskService from './TaskService.ts'
import LocalAuthorService from './LocalAuthorService.ts'
import LogUtil from '../util/LogUtil.ts'
import SiteAuthorService from './SiteAuthorService.ts'
import AutoExplainPathService from './AutoExplainPathService.ts'
import FileSysUtil from '../util/FileSysUtil.ts'

function exposeService(mainWindow: Electron.BrowserWindow) {
  // test
  Electron.ipcMain.handle('test-insertLocalTag10W', async () => {
    return test.insertLocalTag10W()
  })
  Electron.ipcMain.handle('test-transactionTest', async () => {
    return test.transactionTest()
  })
  Electron.ipcMain.handle('test-pLimitTest', async () => {
    return test.pLimitTest()
  })

  //AutoExplainPathService
  Electron.ipcMain.handle('autoExplainPath-getListenerPage', async (_event, args) => {
    const service = new AutoExplainPathService()
    try {
      const page = await service.getListenerPage(args)
      return ApiUtil.response(page)
    } catch (error) {
      LogUtil.error('ServiceExposer', error)
      return ApiUtil.error(String(error))
    }
  })
  Electron.ipcMain.handle('autoExplainPath-getListenerList', async (_event, args) => {
    const service = new AutoExplainPathService()
    try {
      const page = await service.getListenerList(args)
      return ApiUtil.response(page)
    } catch (error) {
      LogUtil.error('ServiceExposer', error)
      return ApiUtil.error(String(error))
    }
  })

  // LocalAuthorService
  Electron.ipcMain.handle('localAuthor-save', async (_event, args) => {
    const service = new LocalAuthorService()
    try {
      const page = await service.save(args)
      return ApiUtil.response(page)
    } catch (error) {
      LogUtil.error('ServiceExposer', error)
      return ApiUtil.error(String(error))
    }
  })
  Electron.ipcMain.handle('localAuthor-deleteById', async (_event, args) => {
    const service = new LocalAuthorService()
    try {
      const page = await service.deleteById(args)
      return ApiUtil.response(page)
    } catch (error) {
      LogUtil.error('ServiceExposer', error)
      return ApiUtil.error(String(error))
    }
  })
  Electron.ipcMain.handle('localAuthor-updateById', async (_event, args) => {
    const service = new LocalAuthorService()
    try {
      const page = await service.updateById(args)
      return ApiUtil.response(page)
    } catch (error) {
      LogUtil.error('ServiceExposer', error)
      return ApiUtil.error(String(error))
    }
  })
  Electron.ipcMain.handle('localAuthor-getById', async (_event, args) => {
    const service = new LocalAuthorService()
    try {
      const page = await service.getById(args)
      return ApiUtil.response(page)
    } catch (error) {
      LogUtil.error('ServiceExposer', error)
      return ApiUtil.error(String(error))
    }
  })
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

  // SiteAuthorService
  Electron.ipcMain.handle('siteAuthor-updateBindLocalAuthor', async (_event, arg1, arg2) => {
    const siteAuthorService = new SiteAuthorService()
    try {
      return ApiUtil.response(await siteAuthorService.updateBindLocalAuthor(arg1, arg2))
    } catch (error) {
      LogUtil.error('ServiceExposer', error)
      return ApiUtil.error(String(error))
    }
  })
  Electron.ipcMain.handle('siteAuthor-getBoundOrUnboundInLocalAuthor', async (_event, args) => {
    const siteAuthorService = new SiteAuthorService()
    try {
      return ApiUtil.response(await siteAuthorService.getBoundOrUnboundInLocalAuthor(args))
    } catch (error) {
      LogUtil.error('ServiceExposer', error)
      return ApiUtil.error(String(error))
    }
  })

  // SiteTagService
  Electron.ipcMain.handle('siteTag-save', async (_event, args) => {
    try {
      const siteTagService = new SiteTagService()
      return ApiUtil.response(await siteTagService.save(args))
    } catch (error) {
      LogUtil.error('ServiceExposer', error)
      return ApiUtil.error(String(error))
    }
  })
  Electron.ipcMain.handle('siteTag-updateById', async (_event, args) => {
    try {
      const siteTagService = new SiteTagService()
      return ApiUtil.response(await siteTagService.updateById(args))
    } catch (error) {
      LogUtil.error('ServiceExposer', error)
      return ApiUtil.error(String(error))
    }
  })
  Electron.ipcMain.handle(
    'siteTag-updateBindLocalTag',
    async (_event, localTagId: string | null, siteTagIds: string[]) => {
      try {
        const siteTagService = new SiteTagService()
        return ApiUtil.response(await siteTagService.updateBindLocalTag(localTagId, siteTagIds))
      } catch (error) {
        LogUtil.error('ServiceExposer', error)
        return ApiUtil.error(String(error))
      }
    }
  )
  Electron.ipcMain.handle(
    'siteTag-getBoundOrUnboundInLocalTag',
    async (_event, page: PageModel<SiteTagQueryDTO, SiteTag>) => {
      try {
        const siteTagService = new SiteTagService()
        return ApiUtil.response(await siteTagService.getBoundOrUnboundInLocalTag(page))
      } catch (error) {
        LogUtil.error('ServiceExposer', error)
        return ApiUtil.error(String(error))
      }
    }
  )
  Electron.ipcMain.handle('siteTag-getSelectList', async (_event, args) => {
    try {
      const siteTagService = new SiteTagService()
      return ApiUtil.response(await siteTagService.getSelectList(args))
    } catch (error) {
      LogUtil.error('ServiceExposer', error)
      return ApiUtil.error(String(error))
    }
  })

  // TaskService
  Electron.ipcMain.handle('task-startTask', async (_event, args) => {
    try {
      const taskService = new TaskService()
      return ApiUtil.response(await taskService.startTask(args, mainWindow))
    } catch (error) {
      LogUtil.error('ServiceExposer', error)
      return ApiUtil.error(String(error))
    }
  })
  Electron.ipcMain.handle('task-createTask', async (_event, args) => {
    try {
      const taskService = new TaskService()
      return ApiUtil.response(await taskService.createTask(args, mainWindow))
    } catch (error) {
      LogUtil.error('ServiceExposer', error)
      return ApiUtil.error(String(error))
    }
  })
  Electron.ipcMain.handle('task-selectPage', async (_event, args) => {
    try {
      const taskService = new TaskService()
      return ApiUtil.response(await taskService.selectPage(args))
    } catch (error) {
      LogUtil.error('ServiceExposer', error)
      return ApiUtil.error(String(error))
    }
  })
  Electron.ipcMain.handle('task-selectParentPage', async (_event, args) => {
    try {
      const taskService = new TaskService()
      return ApiUtil.response(await taskService.selectParentPage(args))
    } catch (error) {
      LogUtil.error('ServiceExposer', error)
      return ApiUtil.error(String(error))
    }
  })
  Electron.ipcMain.handle('task-selectTreeDataPage', async (_event, args) => {
    try {
      const taskService = new TaskService()
      return ApiUtil.response(await taskService.selectTreeDataPage(args))
    } catch (error) {
      LogUtil.error('ServiceExposer', error)
      return ApiUtil.error(String(error))
    }
  })
  Electron.ipcMain.handle('task-getChildrenTask', async (_event, args) => {
    try {
      const taskService = new TaskService()
      return ApiUtil.response(await taskService.getChildrenTask(args))
    } catch (error) {
      LogUtil.error('ServiceExposer', error)
      return ApiUtil.error(String(error))
    }
  })
  Electron.ipcMain.handle('task-selectScheduleList', async (_event, args) => {
    try {
      const taskService = new TaskService()
      return ApiUtil.response(await taskService.selectScheduleList(args))
    } catch (error) {
      LogUtil.error('ServiceExposer', error)
      return ApiUtil.error(String(error))
    }
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
  Electron.ipcMain.handle('works-saveWorks', async (_event, args): Promise<ApiUtil> => {
    const worksService = new WorksService()
    try {
      const result = await worksService.saveWorks(args)
      return ApiUtil.response(result)
    } catch (error) {
      LogUtil.error('ServiceExposer', error)
      return ApiUtil.error(String(error))
    }
  })

  // FileSysUtil
  Electron.ipcMain.handle('fileSysUtil-dirSelect', async (_event, args): Promise<ApiUtil> => {
    const result = await FileSysUtil.dirSelect(args)
    return ApiUtil.response(result)
  })
}

export default {
  exposeService
}
