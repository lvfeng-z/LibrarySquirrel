import LocalTagService from '../service/LocalTagService.ts'
import Electron from 'electron'
import SiteTagService from '../service/SiteTagService.ts'
import SiteService from '../service/SiteService.ts'
import SiteTagQueryDTO from '../model/queryDTO/SiteTagQueryDTO.ts'
import Page from '../model/util/Page.ts'
import SiteTag from '../model/entity/SiteTag.ts'
import test from '../test/test.ts'
import SettingsService from '../service/SettingsService.ts'
import WorksService from '../service/WorksService.ts'
import ApiUtil from '../util/ApiUtil.ts'
import TaskService from '../service/TaskService.ts'
import LocalAuthorService from '../service/LocalAuthorService.ts'
import LogUtil from '../util/LogUtil.ts'
import SiteAuthorService from '../service/SiteAuthorService.ts'
import AutoExplainPathService from '../service/AutoExplainPathService.ts'
import { DirSelect } from '../util/FileSysUtil.ts'
import { ReWorksTagService } from '../service/ReWorksTagService.js'
import SearchService from '../service/SearchService.js'
import AppLauncherService from '../service/AppLauncherService.js'
import { OriginType } from '../constant/OriginType.js'
import SiteQueryDTO from '../model/queryDTO/SiteQueryDTO.js'
import Site from '../model/entity/Site.js'
import SiteDomainService from '../service/SiteDomainService.js'
import PluginService from '../service/PluginService.js'

function exposeService() {
  // test
  Electron.ipcMain.handle('test-insertLocalTag10W', async () => {
    LogUtil.info('MainProcessApi', 'test-insertLocalTag10W')
    return test.insertLocalTag10W()
  })
  Electron.ipcMain.handle('test-transactionTest', async () => {
    LogUtil.info('MainProcessApi', 'test-transactionTest')
    return test.transactionTest()
  })
  Electron.ipcMain.handle('test-pLimitTest', async () => {
    LogUtil.info('MainProcessApi', 'test-pLimitTest')
    return test.pLimitTest()
  })
  Electron.ipcMain.handle('test-installPluginTest', async () => {
    LogUtil.info('MainProcessApi', 'test-installPluginTest')
    return test.installPluginTest()
  })
  Electron.ipcMain.handle('test-mainWindowMsgTest', async () => {
    LogUtil.info('MainProcessApi', 'test-mainWindowMsgTest')
    return test.mainWindowMsgTest()
  })

  // AppLauncherService
  Electron.ipcMain.handle('appLauncher-openImage', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'appLauncher-openImage')
    const service = new AppLauncherService()
    try {
      service.openImage(args)
      return ApiUtil.response()
    } catch (error) {
      return returnError(error)
    }
  })

  //AutoExplainPathService
  Electron.ipcMain.handle('autoExplainPath-getListenerPage', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'autoExplainPath-getListenerPage')
    const service = new AutoExplainPathService()
    try {
      const page = await service.getListenerPage(args)
      return ApiUtil.response(page)
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('autoExplainPath-getListenerList', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'autoExplainPath-getListenerList')
    const service = new AutoExplainPathService()
    try {
      const page = await service.getListenerList(args)
      return ApiUtil.response(page)
    } catch (error) {
      return returnError(error)
    }
  })

  // LocalAuthorService
  Electron.ipcMain.handle('localAuthor-save', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'localAuthor-save')
    const service = new LocalAuthorService()
    try {
      const page = await service.save(args)
      return ApiUtil.response(page)
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('localAuthor-deleteById', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'localAuthor-deleteById')
    const service = new LocalAuthorService()
    try {
      const page = await service.deleteById(args)
      return ApiUtil.response(page)
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('localAuthor-updateById', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'localAuthor-updateById')
    const service = new LocalAuthorService()
    try {
      const page = await service.updateById(args)
      return ApiUtil.response(page)
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('localAuthor-getById', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'localAuthor-getById')
    const service = new LocalAuthorService()
    try {
      const page = await service.getById(args)
      return ApiUtil.response(page)
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('localAuthor-queryPage', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'localAuthor-queryPage')
    const service = new LocalAuthorService()
    args = new Page(args)
    try {
      const page = await service.queryPage(args)
      return ApiUtil.response(page)
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('localAuthor-listSelectItems', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'localAuthor-listSelectItems')
    const service = new LocalAuthorService()
    try {
      const result = await service.listSelectItems(args)
      return ApiUtil.response(result)
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('localAuthor-querySelectItemPage', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'localAuthor-querySelectItemPage')
    const service = new LocalAuthorService()
    try {
      const result = await service.querySelectItemPage(args)
      return ApiUtil.response(result)
    } catch (error) {
      return returnError(error)
    }
  })

  // LocalTagService
  Electron.ipcMain.handle('localTag-save', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'localTag-save')
    const localTagService = new LocalTagService()
    try {
      return ApiUtil.response(await localTagService.save(args))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('localTag-deleteById', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'localTag-deleteById')
    const localTagService = new LocalTagService()
    try {
      return ApiUtil.response(await localTagService.deleteById(args))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('localTag-updateById', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'localTag-updateById')
    const localTagService = new LocalTagService()
    try {
      return ApiUtil.response(await localTagService.updateById(args))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('localTag-queryPage', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'localTag-queryPage')
    const localTagService = new LocalTagService()
    try {
      return ApiUtil.response(await localTagService.queryPage(args))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('localTag-queryDTOPage', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'localTag-queryDTOPage')
    const localTagService = new LocalTagService()
    try {
      return ApiUtil.response(await localTagService.queryDTOPage(args))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('localTag-getById', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'localTag-getById')
    const localTagService = new LocalTagService()
    try {
      return ApiUtil.response(await localTagService.getById(args))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('localTag-getTree', async (_event, arg1, arg2?) => {
    LogUtil.info('MainProcessApi', 'localTag-getTree')
    const localTagService = new LocalTagService()
    try {
      return ApiUtil.response(await localTagService.getTree(arg1, arg2))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('localTag-listSelectItems', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'localTag-listSelectItems')
    const localTagService = new LocalTagService()
    try {
      return ApiUtil.response(await localTagService.listSelectItems(args))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('localTag-querySelectItemPage', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'localTag-querySelectItemPage')
    const localTagService = new LocalTagService()
    try {
      return ApiUtil.response(await localTagService.querySelectItemPage(args))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('localTag-listByWorksId', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'localTag-listByWorksId')
    const localTagService = new LocalTagService()
    try {
      return ApiUtil.response(await localTagService.listByWorksId(args))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('localTag-querySelectItemPageByWorksId', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'localTag-querySelectItemPageByWorksId')
    const localTagService = new LocalTagService()
    try {
      return ApiUtil.response(await localTagService.querySelectItemPageByWorksId(args))
    } catch (error) {
      return returnError(error)
    }
  })

  // PluginService
  Electron.ipcMain.handle('plugin-updateById', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'plugin-updateById')
    const pluginService = new PluginService()
    try {
      return ApiUtil.response(await pluginService.updateById(args))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('plugin-queryPage', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'plugin-queryPage')
    const pluginService = new PluginService()
    try {
      return ApiUtil.response(await pluginService.queryPage(args))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('plugin-reInstall', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'plugin-reInstall')
    const pluginService = new PluginService()
    try {
      return ApiUtil.response(await pluginService.reInstall(args))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('plugin-unInstall', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'plugin-unInstall')
    const pluginService = new PluginService()
    try {
      return ApiUtil.response(await pluginService.unInstall(args))
    } catch (error) {
      return returnError(error)
    }
  })

  // ReWorksTagService
  Electron.ipcMain.handle('reWorksTag-link', async (_event, type: OriginType, localTagIds: number[], worksId: number) => {
    LogUtil.info('MainProcessApi', 'reWorksTag-link')
    const reWorksTagService = new ReWorksTagService()
    try {
      return ApiUtil.response(await reWorksTagService.link(type, localTagIds, worksId))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('reWorksTag-unlink', async (_event, type: OriginType, localTagIds: number[], worksId: number) => {
    LogUtil.info('MainProcessApi', 'reWorksTag-unlink')
    const reWorksTagService = new ReWorksTagService()
    try {
      return ApiUtil.response(await reWorksTagService.unlink(type, localTagIds, worksId))
    } catch (error) {
      return returnError(error)
    }
  })

  // SearchService
  Electron.ipcMain.handle('search-querySearchConditionPage', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'search-querySearchConditionPage')
    const queryService = new SearchService()
    try {
      return ApiUtil.response(await queryService.querySearchConditionPage(args))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('search-queryWorksPage', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'search-queryWorksPage')
    const queryService = new SearchService()
    try {
      return ApiUtil.response(await queryService.queryWorksPage(args))
    } catch (error) {
      return returnError(error)
    }
  })

  //SettingsService
  Electron.ipcMain.handle('settings-getSettings', () => {
    try {
      return ApiUtil.response(SettingsService.getSettings())
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('settings-saveSettings', (_event, args) => {
    return ApiUtil.response(SettingsService.saveSettings(args))
  })
  Electron.ipcMain.handle('settings-resetSettings', () => {
    return ApiUtil.response(SettingsService.resetSettings())
  })

  // SiteService
  Electron.ipcMain.handle('site-deleteById', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'site-deleteById')
    const siteService = new SiteService()
    try {
      return ApiUtil.response(await siteService.deleteById(args))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('site-queryPage', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'site-queryPage')
    const siteService = new SiteService()
    try {
      args = new Page<SiteQueryDTO, Site>(args)
      return ApiUtil.response(await siteService.queryPage(args))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('site-querySelectItemPage', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'site-querySelectItemPage')
    const siteService = new SiteService()
    try {
      return ApiUtil.response(await siteService.querySelectItemPage(args))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('site-save', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'site-save')
    const siteService = new SiteService()
    try {
      return ApiUtil.response(await siteService.save(args))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('site-updateById', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'site-updateById')
    const siteService = new SiteService()
    try {
      return ApiUtil.response(await siteService.updateById(args))
    } catch (error) {
      return returnError(error)
    }
  })

  // SiteDomainService
  Electron.ipcMain.handle('siteDomain-deleteById', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'siteDomain-deleteById')
    const siteDomainService = new SiteDomainService()
    try {
      return ApiUtil.response(await siteDomainService.deleteById(args))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('siteDomain-queryPage', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'siteDomain-queryPage')
    const siteDomainService = new SiteDomainService()
    try {
      args = new Page<SiteQueryDTO, Site>(args)
      return ApiUtil.response(await siteDomainService.queryPage(args))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('siteDomain-save', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'siteDomain-save')
    const siteDomainService = new SiteDomainService()
    try {
      return ApiUtil.response(await siteDomainService.save(args))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('siteDomain-updateById', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'siteDomain-updateById')
    const siteDomainService = new SiteDomainService()
    try {
      return ApiUtil.response(await siteDomainService.updateById(args))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('siteDomain-queryDTOPage', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'siteDomain-queryDTOPage')
    const siteDomainService = new SiteDomainService()
    try {
      args = new Page(args)
      return ApiUtil.response(await siteDomainService.queryDTOPage(args))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('siteDomain-queryDTOPageBySite', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'siteDomain-queryDTOPageBySite')
    const siteDomainService = new SiteDomainService()
    try {
      args = new Page(args)
      return ApiUtil.response(await siteDomainService.queryDTOPageBySite(args))
    } catch (error) {
      return returnError(error)
    }
  })

  // SiteAuthorService
  Electron.ipcMain.handle('siteAuthor-updateBindLocalAuthor', async (_event, arg1, arg2) => {
    LogUtil.info('MainProcessApi', 'siteAuthor-updateBindLocalAuthor')
    const siteAuthorService = new SiteAuthorService()
    try {
      return ApiUtil.response(await siteAuthorService.updateBindLocalAuthor(arg1, arg2))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('siteAuthor-queryBoundOrUnboundInLocalAuthorPage', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'siteAuthor-queryBoundOrUnboundInLocalAuthorPage')
    const siteAuthorService = new SiteAuthorService()
    try {
      return ApiUtil.response(await siteAuthorService.queryBoundOrUnboundInLocalAuthorPage(args))
    } catch (error) {
      return returnError(error)
    }
  })

  // SiteTagService
  Electron.ipcMain.handle('siteTag-save', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'siteTag-save')
    try {
      const siteTagService = new SiteTagService()
      return ApiUtil.response(await siteTagService.save(args))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('siteTag-createAndBindSameNameLocalTag', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'siteTag-createAndBindSameNameLocalTag')
    try {
      const siteTagService = new SiteTagService()
      return ApiUtil.response(await siteTagService.createAndBindSameNameLocalTag(args))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('siteTag-updateById', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'siteTag-updateById')
    try {
      const siteTagService = new SiteTagService()
      return ApiUtil.response(await siteTagService.updateById(args))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('siteTag-deleteById', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'siteTag-deleteById')
    try {
      const siteTagService = new SiteTagService()
      return ApiUtil.response(await siteTagService.deleteById(args))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('siteTag-updateBindLocalTag', async (_event, localTagId: number, siteTagIds: number[]) => {
    LogUtil.info('MainProcessApi', 'siteTag-updateBindLocalTag')
    try {
      const siteTagService = new SiteTagService()
      return ApiUtil.response(await siteTagService.updateBindLocalTag(localTagId, siteTagIds))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('siteTag-queryPage', async (_event, page: Page<SiteTagQueryDTO, SiteTag>) => {
    LogUtil.info('MainProcessApi', 'siteTag-queryPage')
    try {
      const siteTagService = new SiteTagService()
      return ApiUtil.response(await siteTagService.queryPage(page))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('siteTag-queryBoundOrUnboundToLocalTagPage', async (_event, page: Page<SiteTagQueryDTO, SiteTag>) => {
    LogUtil.info('MainProcessApi', 'siteTag-queryBoundOrUnboundToLocalTagPage')
    try {
      const siteTagService = new SiteTagService()
      return ApiUtil.response(await siteTagService.queryBoundOrUnboundToLocalTagPage(page))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('siteTag-queryPageByWorksId', async (_event, page: Page<SiteTagQueryDTO, SiteTag>) => {
    LogUtil.info('MainProcessApi', 'siteTag-queryPageByWorksId')
    try {
      const siteTagService = new SiteTagService()
      return ApiUtil.response(await siteTagService.queryPageByWorksId(page))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('siteTag-queryLocalRelateDTOPage', async (_event, page: Page<SiteTagQueryDTO, SiteTag>) => {
    LogUtil.info('MainProcessApi', 'siteTag-queryLocalRelateDTOPage')
    try {
      const siteTagService = new SiteTagService()
      return ApiUtil.response(await siteTagService.queryLocalRelateDTOPage(page))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('siteTag-querySelectItemPageByWorksId', async (_event, page: Page<SiteTagQueryDTO, SiteTag>) => {
    LogUtil.info('MainProcessApi', 'siteTag-querySelectItemPageByWorksId')
    try {
      const siteTagService = new SiteTagService()
      return ApiUtil.response(await siteTagService.querySelectItemPageByWorksId(page))
    } catch (error) {
      return returnError(error)
    }
  })

  // TaskService
  Electron.ipcMain.handle('task-createTask', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'task-createTask')
    try {
      const taskService = new TaskService()
      return ApiUtil.response(await taskService.createTask(args))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('task-startTaskTree', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'task-startTaskTree')
    try {
      const taskService = new TaskService()
      return ApiUtil.response(await taskService.startTaskTree(args))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('task-retryTaskTree', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'task-retryTaskTree')
    try {
      const taskService = new TaskService()
      return ApiUtil.response(await taskService.retryTaskTree(args))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('task-deleteTask', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'task-deleteTask')
    try {
      const taskService = new TaskService()
      return ApiUtil.response(await taskService.deleteTask(args))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('task-queryPage', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'task-queryPage')
    try {
      const taskService = new TaskService()
      return ApiUtil.response(await taskService.queryPage(args))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('task-queryParentPage', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'task-queryParentPage')
    try {
      const taskService = new TaskService()
      return ApiUtil.response(await taskService.queryParentPage(args))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('task-queryTreeDataPage', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'task-queryTreeDataPage')
    try {
      const taskService = new TaskService()
      return ApiUtil.response(await taskService.queryTreeDataPage(args))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('task-listChildrenTask', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'task-listChildrenTask')
    try {
      const taskService = new TaskService()
      return ApiUtil.response(await taskService.listChildrenTask(args))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('task-queryChildrenTaskPage', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'task-queryChildrenTaskPage')
    try {
      const taskService = new TaskService()
      return ApiUtil.response(await taskService.queryChildrenTaskPage(args))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('task-listStatus', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'task-listStatus')
    try {
      const taskService = new TaskService()
      return ApiUtil.response(await taskService.listStatus(args))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('task-listSchedule', async (_event, args) => {
    // LogUtil.info('MainProcessApi', 'task-listSchedule')
    try {
      const taskService = new TaskService()
      return ApiUtil.response(await taskService.listSchedule(args))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('task-pauseTaskTree', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'task-pauseTaskTree')
    try {
      const taskService = new TaskService()
      return ApiUtil.response(await taskService.pauseTaskTree(args))
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('task-resumeTaskTree', async (_event, args) => {
    LogUtil.info('MainProcessApi', 'task-resumeTaskTree')
    try {
      const taskService = new TaskService()
      return ApiUtil.response(await taskService.resumeTaskTree(args))
    } catch (error) {
      return returnError(error)
    }
  })

  // WorksService
  Electron.ipcMain.handle('works-queryPage', async (_event, args): Promise<ApiUtil> => {
    const worksService = new WorksService()
    try {
      const result = await worksService.queryPage(args)
      return ApiUtil.response(result)
    } catch (error) {
      return returnError(error)
    }
  })
  Electron.ipcMain.handle('works-getFullWorksInfoById', async (_event, args): Promise<ApiUtil> => {
    const worksService = new WorksService()
    try {
      const result = await worksService.getFullWorksInfoById(args)
      return ApiUtil.response(result)
    } catch (error) {
      return returnError(error)
    }
  })

  // FileSysUtil
  Electron.ipcMain.handle('fileSysUtil-dirSelect', async (_event, openFile, isModal): Promise<ApiUtil> => {
    const result = await DirSelect(openFile, isModal)
    return ApiUtil.response(result)
  })
}

function returnError(error: unknown) {
  LogUtil.error('MainProcessApi', error)
  return ApiUtil.error(String(error))
}

export default {
  exposeService
}
