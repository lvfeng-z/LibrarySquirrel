import LocalTagService from '../service/LocalTagService.ts'
import Electron from 'electron'
import SiteTagService from '../service/SiteTagService.ts'
import SiteService from '../service/SiteService.ts'
import SiteTagQueryDTO from '@shared/model/queryDTO/SiteTagQueryDTO.ts'
import Page from '@shared/model/util/Page.ts'
import SiteTag from '@shared/model/entity/SiteTag.ts'
import test from '../test/test.ts'
import SettingsService from '../service/SettingsService.ts'
import WorkService from '../service/WorkService.ts'
import ApiUtil from '../util/ApiUtil.ts'
import TaskService from '../service/TaskService.ts'
import LocalAuthorService from '../service/LocalAuthorService.ts'
import LogUtil from '../util/LogUtil.ts'
import SiteAuthorService from '../service/SiteAuthorService.ts'
import AutoExplainPathService from '../service/AutoExplainPathService.ts'
import { DirSelect } from '../util/FileSysUtil.ts'
import { ReWorkTagService } from '../service/ReWorkTagService.ts'
import ReWorkWorkSetService from '../service/ReWorkWorkSetService.ts'
import SearchService from '../service/SearchService.ts'
import AppLauncherService from '../service/AppLauncherService.ts'
import { OriginType } from '../constant/OriginType.ts'
import SiteQueryDTO from '@shared/model/queryDTO/SiteQueryDTO.ts'
import Site from '@shared/model/entity/Site.ts'
import SiteDomainService from '../service/SiteDomainService.ts'
import PluginService from '../service/PluginService.ts'
import { GetBrowserWindow } from '../util/MainWindowUtil.ts'
import ForeignKeyDeleteError from '../error/ForeignKeyDeleteError.ts'
import WorkSetService from '../service/WorkSetService.ts'
import SecureStorageService, { SecureStorageErrorCode } from '../service/SecureStorageService.ts'
import { IsNullish } from '@shared/util/CommonUtil.ts'
import { getPluginTaskUrlListenerManager } from './pluginTaskUrlListener.ts'

function returnError(error: unknown) {
  LogUtil.error('MainProcessApi', error)
  return ApiUtil.error(String(error))
}

/**
 * 创建通用 IPC 处理器 - 自动处理日志记录和错误捕获
 */
function createHandler<T>(
  channel: string,
  handler: (...args: any[]) => T | Promise<T>,
  options?: {
    /** 是否禁用日志记录 */
    silent?: boolean
    /** 自定义错误处理 */
    onError?: (error: unknown) => ApiUtil | undefined
    /** 自定义响应处理 */
    transformResponse?: (result: T) => ApiUtil
  }
) {
  return async (_event: Electron.IpcMainInvokeEvent, ...args: any[]) => {
    if (!options?.silent) {
      LogUtil.info('MainProcessApi', channel)
    }
    try {
      const result = await handler(...args)
      if (options?.transformResponse) {
        return options.transformResponse(result)
      }
      return ApiUtil.response(result)
    } catch (error) {
      if (options?.onError) {
        const customResult = options.onError(error)
        if (customResult) return customResult
      }
      return returnError(error)
    }
  }
}

function exposeService() {
  // test
  Electron.ipcMain.handle(
    'test-insertLocalTag10W',
    createHandler('test-insertLocalTag10W', () => test.insertLocalTag10W())
  )
  Electron.ipcMain.handle(
    'test-transactionTest',
    createHandler('test-transactionTest', () => test.transactionTest())
  )
  Electron.ipcMain.handle(
    'test-pLimitTest',
    createHandler('test-pLimitTest', () => test.pLimitTest())
  )
  Electron.ipcMain.handle(
    'test-installPluginTest',
    createHandler('test-installPluginTest', () => test.installPluginTest())
  )
  Electron.ipcMain.handle(
    'test-mainWindowMsgTest',
    createHandler('test-mainWindowMsgTest', () => test.mainWindowMsgTest())
  )
  Electron.ipcMain.handle(
    'test-gotoPageSiteManage',
    createHandler('test-gotoPageSiteManage', () => test.gotoPageSiteManage())
  )
  Electron.ipcMain.handle(
    'test-listWorkSetWithWorkByIds',
    createHandler('test-listWorkSetWithWorkByIds', (args) => test.listWorkSetWithWorkByIds(args))
  )

  // AppLauncher
  Electron.ipcMain.handle(
    'appLauncher-openImage',
    createHandler('appLauncher-openImage', (args) => {
      const service = new AppLauncherService()
      service.openImage(args)
    })
  )

  // AutoExplainPath
  Electron.ipcMain.handle(
    'autoExplainPath-getListenerPage',
    createHandler('autoExplainPath-getListenerPage', (args) => {
      const service = new AutoExplainPathService()
      return service.getListenerPage(args)
    })
  )
  Electron.ipcMain.handle(
    'autoExplainPath-getListenerList',
    createHandler('autoExplainPath-getListenerList', (args) => {
      const service = new AutoExplainPathService()
      return service.getListenerList(args)
    })
  )

  // LocalAuthor
  Electron.ipcMain.handle(
    'localAuthor-save',
    createHandler('localAuthor-save', (args) => {
      const service = new LocalAuthorService()
      return service.save(args)
    })
  )
  Electron.ipcMain.handle(
    'localAuthor-deleteById',
    createHandler('localAuthor-deleteById', (args) => {
      const service = new LocalAuthorService()
      return service.deleteById(args)
    })
  )
  Electron.ipcMain.handle(
    'localAuthor-updateById',
    createHandler('localAuthor-updateById', (args) => {
      const service = new LocalAuthorService()
      return service.updateById(args)
    })
  )
  Electron.ipcMain.handle(
    'localAuthor-getById',
    createHandler('localAuthor-getById', (args) => {
      const service = new LocalAuthorService()
      return service.getById(args)
    })
  )
  Electron.ipcMain.handle(
    'localAuthor-queryPage',
    createHandler('localAuthor-queryPage', (args) => {
      const service = new LocalAuthorService()
      args = new Page(args)
      return service.queryPage(args)
    })
  )
  Electron.ipcMain.handle(
    'localAuthor-listSelectItems',
    createHandler('localAuthor-listSelectItems', (args) => {
      const service = new LocalAuthorService()
      return service.listSelectItems(args)
    })
  )
  Electron.ipcMain.handle(
    'localAuthor-querySelectItemPage',
    createHandler('localAuthor-querySelectItemPage', (args) => {
      const service = new LocalAuthorService()
      return service.querySelectItemPage(args)
    })
  )

  // LocalTag
  Electron.ipcMain.handle(
    'localTag-save',
    createHandler('localTag-save', (args) => {
      const service = new LocalTagService()
      return service.save(args)
    })
  )
  Electron.ipcMain.handle(
    'localTag-deleteById',
    createHandler('localTag-deleteById', (args) => {
      const service = new LocalTagService()
      return service.deleteById(args)
    })
  )
  Electron.ipcMain.handle(
    'localTag-updateById',
    createHandler('localTag-updateById', (args) => {
      const service = new LocalTagService()
      return service.updateById(args)
    })
  )
  Electron.ipcMain.handle(
    'localTag-queryPage',
    createHandler('localTag-queryPage', (args) => {
      const service = new LocalTagService()
      return service.queryPage(args)
    })
  )
  Electron.ipcMain.handle(
    'localTag-queryDTOPage',
    createHandler('localTag-queryDTOPage', (args) => {
      const service = new LocalTagService()
      return service.queryDTOPage(args)
    })
  )
  Electron.ipcMain.handle(
    'localTag-getById',
    createHandler('localTag-getById', (args) => {
      const service = new LocalTagService()
      return service.getById(args)
    })
  )
  Electron.ipcMain.handle(
    'localTag-getTree',
    createHandler('localTag-getTree', (arg1, arg2) => {
      const service = new LocalTagService()
      return service.getTree(arg1, arg2)
    })
  )
  Electron.ipcMain.handle(
    'localTag-listSelectItems',
    createHandler('localTag-listSelectItems', (args) => {
      const service = new LocalTagService()
      return service.listSelectItems(args)
    })
  )
  Electron.ipcMain.handle(
    'localTag-querySelectItemPage',
    createHandler('localTag-querySelectItemPage', (args) => {
      const service = new LocalTagService()
      return service.querySelectItemPage(args)
    })
  )
  Electron.ipcMain.handle(
    'localTag-listByWorkId',
    createHandler('localTag-listByWorkId', (args) => {
      const service = new LocalTagService()
      return service.listByWorkId(args)
    })
  )
  Electron.ipcMain.handle(
    'localTag-querySelectItemPageByWorkId',
    createHandler('localTag-querySelectItemPageByWorkId', (args) => {
      const service = new LocalTagService()
      return service.querySelectItemPageByWorkId(args)
    })
  )

  // GetBrowserWindow
  Electron.ipcMain.handle(
    'getBrowserWindow',
    createHandler('getBrowserWindow', (args) => {
      GetBrowserWindow(args)
    })
  )

  // PluginTaskUrlListenerManager
  Electron.ipcMain.handle(
    'pluginTaskUrlListenerManager',
    createHandler('pluginTaskUrlListenerManager-listListener', (args) => {
      return getPluginTaskUrlListenerManager().listListener(args)
    })
  )

  // Plugin
  Electron.ipcMain.handle(
    'plugin-updateById',
    createHandler('plugin-updateById', (args) => {
      const service = new PluginService()
      return service.updateById(args)
    })
  )
  Electron.ipcMain.handle(
    'plugin-queryPage',
    createHandler('plugin-queryPage', (args) => {
      const service = new PluginService()
      return service.queryPage(args)
    })
  )
  Electron.ipcMain.handle(
    'plugin-installFromPath',
    createHandler('plugin-installFromPath', (args) => {
      const service = new PluginService()
      return service.installFromPath(args)
    })
  )
  Electron.ipcMain.handle(
    'plugin-reinstall',
    createHandler('plugin-reinstall', (args) => {
      const service = new PluginService()
      return service.reinstall(args)
    })
  )
  Electron.ipcMain.handle(
    'plugin-reinstallFromPath',
    createHandler('plugin-reinstallFromPath', (arg1, arg2) => {
      const service = new PluginService()
      return service.reinstallFromPath(arg1, arg2)
    })
  )
  Electron.ipcMain.handle(
    'plugin-unInstall',
    createHandler('plugin-unInstall', (args) => {
      const service = new PluginService()
      return service.uninstall(args)
    })
  )

  // ReWorkTag
  Electron.ipcMain.handle(
    'reWorkTag-link',
    createHandler('reWorkTag-link', (type: OriginType, localTagIds: number[], workId: number) => {
      const service = new ReWorkTagService()
      return service.link(type, localTagIds, workId)
    })
  )
  Electron.ipcMain.handle(
    'reWorkTag-unlink',
    createHandler('reWorkTag-unlink', (type: OriginType, localTagIds: number[], workId: number) => {
      const service = new ReWorkTagService()
      return service.unlink(type, localTagIds, workId)
    })
  )

  // Search
  Electron.ipcMain.handle(
    'search-querySearchConditionPage',
    createHandler('search-querySearchConditionPage', (args) => {
      const service = new SearchService()
      return service.querySearchConditionPage(args)
    })
  )
  Electron.ipcMain.handle(
    'search-queryWorkPage',
    createHandler('search-queryWorkPage', (args) => {
      const service = new SearchService()
      return service.queryWorkPage(args)
    })
  )
  Electron.ipcMain.handle(
    'search-queryWorkSetPage',
    createHandler('search-queryWorkSetPage', (args) => {
      const service = new SearchService()
      return service.queryWorkSetPage(args)
    })
  )

  //SettingsService
  Electron.ipcMain.handle(
    'settings-getSettings',
    createHandler('settings-getSettings', () => SettingsService.getSettings())
  )
  Electron.ipcMain.handle(
    'settings-saveSettings',
    createHandler('settings-saveSettings', (args) => SettingsService.saveSettings(args))
  )
  Electron.ipcMain.handle(
    'settings-resetSettings',
    createHandler('settings-resetSettings', () => SettingsService.resetSettings())
  )

  // Site
  Electron.ipcMain.handle(
    'site-deleteById',
    createHandler(
      'site-deleteById',
      (args) => {
        const service = new SiteService()
        return service.deleteById(args)
      },
      {
        onError: (error) => {
          if (error instanceof ForeignKeyDeleteError) {
            return ApiUtil.error('无法删除站点，此站点正在被其他数据引用')
          }
          return undefined
        }
      }
    )
  )
  Electron.ipcMain.handle(
    'site-queryPage',
    createHandler('site-queryPage', (args) => {
      const service = new SiteService()
      args = new Page<SiteQueryDTO, Site>(args)
      return service.queryPage(args)
    })
  )
  Electron.ipcMain.handle(
    'site-querySelectItemPage',
    createHandler('site-querySelectItemPage', (args) => {
      const service = new SiteService()
      return service.querySelectItemPage(args)
    })
  )
  Electron.ipcMain.handle(
    'site-save',
    createHandler('site-save', (args) => {
      const service = new SiteService()
      return service.save(args)
    })
  )
  Electron.ipcMain.handle(
    'site-updateById',
    createHandler('site-updateById', (args) => {
      const service = new SiteService()
      return service.updateById(args)
    })
  )

  // SiteDomain
  Electron.ipcMain.handle(
    'siteDomain-deleteById',
    createHandler('siteDomain-deleteById', (args) => {
      const service = new SiteDomainService()
      return service.deleteById(args)
    })
  )
  Electron.ipcMain.handle(
    'siteDomain-queryPage',
    createHandler('siteDomain-queryPage', (args) => {
      const service = new SiteDomainService()
      args = new Page<SiteQueryDTO, Site>(args)
      return service.queryPage(args)
    })
  )
  Electron.ipcMain.handle(
    'siteDomain-save',
    createHandler('siteDomain-save', (args) => {
      const service = new SiteDomainService()
      return service.save(args)
    })
  )
  Electron.ipcMain.handle(
    'siteDomain-updateById',
    createHandler('siteDomain-updateById', (args) => {
      const service = new SiteDomainService()
      return service.updateById(args)
    })
  )
  Electron.ipcMain.handle(
    'siteDomain-queryDTOPage',
    createHandler('siteDomain-queryDTOPage', (args) => {
      const service = new SiteDomainService()
      args = new Page(args)
      return service.queryDTOPage(args)
    })
  )
  Electron.ipcMain.handle(
    'siteDomain-queryDTOPageBySite',
    createHandler('siteDomain-queryDTOPageBySite', (args) => {
      const service = new SiteDomainService()
      args = new Page(args)
      return service.queryDTOPageBySite(args)
    })
  )

  // SiteAuthor
  Electron.ipcMain.handle(
    'siteAuthor-deleteById',
    createHandler('siteAuthor-deleteById', (args) => {
      const service = new SiteAuthorService()
      return service.deleteById(args)
    })
  )
  Electron.ipcMain.handle(
    'siteAuthor-save',
    createHandler('siteAuthor-save', (args) => {
      const service = new SiteAuthorService()
      return service.save(args)
    })
  )
  Electron.ipcMain.handle(
    'siteAuthor-updateById',
    createHandler('siteAuthor-updateById', (args) => {
      const service = new SiteAuthorService()
      return service.updateById(args)
    })
  )
  Electron.ipcMain.handle(
    'siteAuthor-updateBindLocalAuthor',
    createHandler('siteAuthor-updateBindLocalAuthor', (arg1, arg2) => {
      const service = new SiteAuthorService()
      return service.updateBindLocalAuthor(arg1, arg2)
    })
  )
  Electron.ipcMain.handle(
    'siteAuthor-createAndBindSameNameLocalAuthor',
    createHandler('siteAuthor-createAndBindSameNameLocalAuthor', (args) => {
      const service = new SiteAuthorService()
      return service.createAndBindSameNameLocalAuthor(args)
    })
  )
  Electron.ipcMain.handle(
    'siteAuthor-queryBoundOrUnboundInLocalAuthorPage',
    createHandler('siteAuthor-queryBoundOrUnboundInLocalAuthorPage', (args) => {
      const service = new SiteAuthorService()
      return service.queryBoundOrUnboundInLocalAuthorPage(args)
    })
  )
  Electron.ipcMain.handle(
    'siteAuthor-queryLocalRelateDTOPage',
    createHandler('siteAuthor-queryLocalRelateDTOPage', (args) => {
      const service = new SiteAuthorService()
      return service.queryLocalRelateDTOPage(args)
    })
  )

  // SiteTag
  Electron.ipcMain.handle(
    'siteTag-save',
    createHandler('siteTag-save', (args) => {
      const service = new SiteTagService()
      return service.save(args)
    })
  )
  Electron.ipcMain.handle(
    'siteTag-createAndBindSameNameLocalTag',
    createHandler('siteTag-createAndBindSameNameLocalTag', (args) => {
      const service = new SiteTagService()
      return service.createAndBindSameNameLocalTag(args)
    })
  )
  Electron.ipcMain.handle(
    'siteTag-updateById',
    createHandler('siteTag-updateById', (args) => {
      const service = new SiteTagService()
      return service.updateById(args)
    })
  )
  Electron.ipcMain.handle(
    'siteTag-deleteById',
    createHandler('siteTag-deleteById', (args) => {
      const service = new SiteTagService()
      return service.deleteById(args)
    })
  )
  Electron.ipcMain.handle(
    'siteTag-updateBindLocalTag',
    createHandler('siteTag-updateBindLocalTag', (localTagId: number, siteTagIds: number[]) => {
      const service = new SiteTagService()
      return service.updateBindLocalTag(localTagId, siteTagIds)
    })
  )
  Electron.ipcMain.handle(
    'siteTag-queryPage',
    createHandler('siteTag-queryPage', (page: Page<SiteTagQueryDTO, SiteTag>) => {
      const service = new SiteTagService()
      return service.queryPage(page)
    })
  )
  Electron.ipcMain.handle(
    'siteTag-queryBoundOrUnboundToLocalTagPage',
    createHandler('siteTag-queryBoundOrUnboundToLocalTagPage', (page: Page<SiteTagQueryDTO, SiteTag>) => {
      const service = new SiteTagService()
      return service.queryBoundOrUnboundToLocalTagPage(page)
    })
  )
  Electron.ipcMain.handle(
    'siteTag-queryPageByWorkId',
    createHandler('siteTag-queryPageByWorkId', (page: Page<SiteTagQueryDTO, SiteTag>) => {
      const service = new SiteTagService()
      return service.queryPageByWorkId(page)
    })
  )
  Electron.ipcMain.handle(
    'siteTag-queryLocalRelateDTOPage',
    createHandler('siteTag-queryLocalRelateDTOPage', (page: Page<SiteTagQueryDTO, SiteTag>) => {
      const service = new SiteTagService()
      return service.queryLocalRelateDTOPage(page)
    })
  )
  Electron.ipcMain.handle(
    'siteTag-querySelectItemPageByWorkId',
    createHandler('siteTag-querySelectItemPageByWorkId', (page: Page<SiteTagQueryDTO, SiteTag>) => {
      const service = new SiteTagService()
      return service.querySelectItemPageByWorkId(page)
    })
  )

  // Task
  Electron.ipcMain.handle(
    'task-createTask',
    createHandler('task-createTask', (args) => {
      const service = new TaskService()
      return service.createTask(args)
    })
  )
  Electron.ipcMain.handle(
    'task-startTaskTree',
    createHandler('task-startTaskTree', (args) => {
      const service = new TaskService()
      return service.startTaskTree(args)
    })
  )
  Electron.ipcMain.handle(
    'task-retryTaskTree',
    createHandler('task-retryTaskTree', (args) => {
      const service = new TaskService()
      return service.retryTaskTree(args)
    })
  )
  Electron.ipcMain.handle(
    'task-deleteTask',
    createHandler('task-deleteTask', (args) => {
      const service = new TaskService()
      return service.deleteTask(args)
    })
  )
  Electron.ipcMain.handle(
    'task-queryPage',
    createHandler('task-queryPage', (args) => {
      const service = new TaskService()
      return service.queryPage(args)
    })
  )
  Electron.ipcMain.handle(
    'task-queryParentPage',
    createHandler('task-queryParentPage', (args) => {
      const service = new TaskService()
      return service.queryParentPage(args)
    })
  )
  Electron.ipcMain.handle(
    'task-queryTreeDataPage',
    createHandler('task-queryTreeDataPage', (args) => {
      const service = new TaskService()
      return service.queryTreeDataPage(args)
    })
  )
  Electron.ipcMain.handle(
    'task-listChildrenTask',
    createHandler('task-listChildrenTask', (args) => {
      const service = new TaskService()
      return service.listChildrenTask(args)
    })
  )
  Electron.ipcMain.handle(
    'task-queryChildrenTaskPage',
    createHandler('task-queryChildrenTaskPage', (args) => {
      const service = new TaskService()
      return service.queryChildrenTaskPage(args)
    })
  )
  Electron.ipcMain.handle(
    'task-listStatus',
    createHandler('task-listStatus', (args) => {
      const service = new TaskService()
      return service.listStatus(args)
    })
  )
  Electron.ipcMain.handle(
    'task-listSchedule',
    createHandler(
      'task-listSchedule',
      (args) => {
        const service = new TaskService()
        return service.listSchedule(args)
      },
      { silent: true }
    )
  )
  Electron.ipcMain.handle(
    'task-stopTaskTree',
    createHandler('task-stopTaskTree', (args) => {
      const service = new TaskService()
      return service.stopTaskTree(args)
    })
  )
  Electron.ipcMain.handle(
    'task-pauseTaskTree',
    createHandler('task-pauseTaskTree', (args) => {
      const service = new TaskService()
      return service.pauseTaskTree(args)
    })
  )
  Electron.ipcMain.handle(
    'task-resumeTaskTree',
    createHandler('task-resumeTaskTree', (args) => {
      const service = new TaskService()
      return service.resumeTaskTree(args)
    })
  )

  // Work
  Electron.ipcMain.handle(
    'work-deleteWorkAndSurroundingData',
    createHandler(
      'work-deleteWorkAndSurroundingData',
      (args) => {
        const service = new WorkService()
        return service.deleteWorkAndSurroundingData(args)
      },
      { transformResponse: (result) => ApiUtil.check(result) }
    )
  )
  Electron.ipcMain.handle(
    'work-queryPage',
    createHandler('work-queryPage', (args) => {
      const service = new WorkService()
      return service.queryPage(args)
    })
  )
  Electron.ipcMain.handle(
    'work-getFullWorkInfoById',
    createHandler('work-getFullWorkInfoById', (args) => {
      if (IsNullish(args)) {
        throw new Error('作品id不能为空')
      }
      const service = new WorkService()
      return service.getFullWorkInfoById(args)
    })
  )

  // WorkSet
  Electron.ipcMain.handle(
    'workSet-listWorkSetWithWorkByIds',
    createHandler('workSet-listWorkSetWithWorkByIds', (args) => {
      const service = new WorkSetService()
      return service.listWorkSetWithWorkByIds(args)
    })
  )

  Electron.ipcMain.handle(
    'workSet-queryPageWithCover',
    createHandler('workSet-queryPageWithCover', (args) => {
      const service = new WorkSetService()
      return service.queryPageWithCover(args)
    })
  )

  // ReWorkWorkSet
  Electron.ipcMain.handle(
    'reWorkWorkSet-linkBatchToWorkSet',
    createHandler('reWorkWorkSet-linkBatchToWorkSet', (args) => {
      const service = new ReWorkWorkSetService()
      const { workIds, workSetId } = args
      return service.linkBatchToWorkSet(workIds, workSetId)
    })
  )

  Electron.ipcMain.handle(
    'reWorkWorkSet-removeBatchFromWorkSet',
    createHandler('reWorkWorkSet-removeBatchFromWorkSet', (args) => {
      const service = new ReWorkWorkSetService()
      const { workIds, workSetId } = args
      return service.removeBatchFromWorkSet(workIds, workSetId)
    })
  )

  Electron.ipcMain.handle(
    'reWorkWorkSet-updateSortOrders',
    createHandler('reWorkWorkSet-updateSortOrders', (args) => {
      const service = new ReWorkWorkSetService()
      const { workSetId, workIds } = args
      return service.updateSortOrders(workSetId, workIds)
    })
  )

  Electron.ipcMain.handle(
    'reWorkWorkSet-setCover',
    createHandler('reWorkWorkSet-setCover', (args) => {
      const service = new ReWorkWorkSetService()
      const { workSetId, workId } = args
      return service.setCover(workSetId, workId)
    })
  )

  Electron.ipcMain.handle(
    'reWorkWorkSet-unsetCover',
    createHandler('reWorkWorkSet-unsetCover', (args) => {
      const service = new ReWorkWorkSetService()
      const { workSetId, workId } = args
      return service.unsetCover(workSetId, workId)
    })
  )

  Electron.ipcMain.handle(
    'reWorkWorkSet-getCoverWorkId',
    createHandler('reWorkWorkSet-getCoverWorkId', (args) => {
      const service = new ReWorkWorkSetService()
      const { workSetId } = args
      return service.getCoverWorkId(workSetId)
    })
  )

  // FileSysUtil
  Electron.ipcMain.handle(
    'fileSysUtil-dirSelect',
    createHandler('fileSysUtil-dirSelect', (openFile, isModal) => {
      return DirSelect(openFile, isModal)
    })
  )

  // SecureStorage
  Electron.ipcMain.handle(
    'secureStorage-set',
    createHandler(
      'secureStorage-set',
      (args) => {
        const service = new SecureStorageService()
        const { storageKey, plainValue, description } = args
        return service.set(storageKey, plainValue, description)
      },
      {
        onError: (error) => {
          const errorMsg = String(error)
          if (errorMsg === SecureStorageErrorCode.NOT_AVAILABLE) {
            return ApiUtil.error('安全存储不可用，请检查系统加密设置')
          }
          if (errorMsg === SecureStorageErrorCode.ENCRYPT_FAILED) {
            return ApiUtil.error('加密失败，请重试')
          }
          if (errorMsg === SecureStorageErrorCode.INVALID_KEY) {
            return ApiUtil.error('存储键无效')
          }
          return undefined
        }
      }
    )
  )
  Electron.ipcMain.handle(
    'secureStorage-get',
    createHandler(
      'secureStorage-get',
      (args) => {
        const service = new SecureStorageService()
        return service.getValue(args)
      },
      {
        onError: (error) => {
          const errorMsg = String(error)
          if (errorMsg === SecureStorageErrorCode.NOT_AVAILABLE) {
            return ApiUtil.error('安全存储不可用，请检查系统加密设置')
          }
          if (errorMsg === SecureStorageErrorCode.DECRYPT_FAILED) {
            return ApiUtil.error('解密失败，数据可能已损坏')
          }
          if (errorMsg === SecureStorageErrorCode.INVALID_KEY) {
            return ApiUtil.error('存储键无效')
          }
          return undefined
        }
      }
    )
  )
  Electron.ipcMain.handle(
    'secureStorage-delete',
    createHandler(
      'secureStorage-delete',
      (args) => {
        const service = new SecureStorageService()
        return service.remove(args)
      },
      {
        onError: (error) => {
          const errorMsg = String(error)
          if (errorMsg === SecureStorageErrorCode.INVALID_KEY) {
            return ApiUtil.error('存储键无效')
          }
          return undefined
        }
      }
    )
  )
  Electron.ipcMain.handle(
    'secureStorage-hasKey',
    createHandler(
      'secureStorage-hasKey',
      (args) => {
        const service = new SecureStorageService()
        return service.hasKey(args)
      },
      {
        onError: (error) => {
          const errorMsg = String(error)
          if (errorMsg === SecureStorageErrorCode.INVALID_KEY) {
            return ApiUtil.error('存储键无效')
          }
          return undefined
        }
      }
    )
  )
  Electron.ipcMain.handle(
    'secureStorage-listKeys',
    createHandler('secureStorage-listKeys', () => {
      const service = new SecureStorageService()
      return service.listKeys()
    })
  )
}

export default {
  exposeService
}
