import LocalTagService from '../service/LocalTagService.ts'
import { ipcMain, IpcMainInvokeEvent } from 'electron'
import * as fs from 'fs'
import SiteTagService from '../service/SiteTagService.ts'
import SiteService from '../service/SiteService.ts'
import SiteTagQueryDTO from '@shared/model/queryDTO/SiteTagQueryDTO.ts'
import Page from '@shared/model/util/Page.ts'
import SiteTag from '@shared/model/entity/SiteTag.ts'
import test from '../test/test.ts'
import SettingsService from '../service/SettingsService.ts'
import WorkService from '../service/WorkService.ts'
import { ApiResponse, ApiUtil } from '../util/ApiUtil.ts'
import TaskService from '../service/TaskService.ts'
import LocalAuthorService from '../service/LocalAuthorService.ts'
import log from '../util/LogUtil.ts'
import SiteAuthorService from '../service/SiteAuthorService.ts'
import AutoExplainPathService from '../service/AutoExplainPathService.ts'
import { DirSelect, RootDir } from '../util/FileSysUtil.ts'
import { ReWorkTagService } from '../service/ReWorkTagService.ts'
import ReWorkWorkSetService from '../service/ReWorkWorkSetService.ts'
import SearchService from '../service/SearchService.ts'
import AppLauncherService from '../service/AppLauncherService.ts'
import { OriginType } from '../constant/OriginType.ts'
import SiteQueryDTO from '@shared/model/queryDTO/SiteQueryDTO.ts'
import Site from '@shared/model/entity/Site.ts'
import PluginService from '../service/PluginService.ts'
import ForeignKeyDeleteError from '../error/ForeignKeyDeleteError.ts'
import WorkSetService from '../service/WorkSetService.ts'
import SecureStorageService, { SecureStorageErrorCode } from '../service/SecureStorageService.ts'
import { isNullish } from '@shared/util/CommonUtil.ts'
import { getPluginTaskUrlListenerManager } from './pluginTaskUrlListener.ts'
import { getSiteBrowserManager } from './siteBrowserManager.ts'
import { getPluginManager } from './pluginManager.ts'
import { getSlotSyncService } from './SlotSyncService.ts'
import SiteBrowserDTO from '@shared/model/dto/SiteBrowserDTO.ts'
import path from 'path'
import { PLUGIN_ROOT } from '../constant/PluginConstant.ts'

function returnError(error: unknown) {
  log.error('MainProcessApi', error)
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
    onError?: (error: unknown) => ApiResponse | undefined
    /** 自定义响应处理 */
    transformResponse?: (result: T) => ApiResponse
  }
) {
  return async (_event: IpcMainInvokeEvent, ...args: any[]) => {
    if (!options?.silent) {
      log.info('MainProcessApi', channel)
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

export function registerMainIpcHandlers() {
  // Slot 同步
  ipcMain.handle('slot-getAllSlots', async () => {
    try {
      return getSlotSyncService().getAllSlots()
    } catch (error) {
      return returnError(error)
    }
  })

  // 读取插件 Vue 源码文件
  ipcMain.handle('plugin-readVueFile', async (_event, filePath: string) => {
    try {
      if (!filePath) {
        return ApiUtil.error('无效的文件路径')
      }
      const pluginDir = path.join(RootDir(), PLUGIN_ROOT)
      const fullPath = path.join(pluginDir, filePath)
      // 安全检查：确保路径在插件目录内
      const normalizedPath = fullPath.replace(/\\/g, '/')
      if (normalizedPath.includes('..')) {
        return ApiUtil.error('路径不允许包含 .. 跳转')
      }
      const content = fs.readFileSync(fullPath, 'utf-8')
      return ApiUtil.response(content)
    } catch (error) {
      return returnError(error)
    }
  })

  // test
  ipcMain.handle(
    'test-transactionTest',
    createHandler('test-transactionTest', () => test.transactionTest())
  )
  ipcMain.handle(
    'test-pLimitTest',
    createHandler('test-pLimitTest', () => test.pLimitTest())
  )
  ipcMain.handle(
    'test-mainWindowMsgTest',
    createHandler('test-mainWindowMsgTest', () => test.mainWindowMsgTest())
  )
  ipcMain.handle(
    'test-gotoPageSiteManage',
    createHandler('test-gotoPageSiteManage', () => test.gotoPageSiteManage())
  )
  ipcMain.handle(
    'test-listWorkSetWithWorkByIds',
    createHandler('test-listWorkSetWithWorkByIds', (args) => test.listWorkSetWithWorkByIds(args))
  )

  // AppLauncher
  ipcMain.handle(
    'appLauncher-openImage',
    createHandler('appLauncher-openImage', (args) => {
      const service = new AppLauncherService()
      service.openImage(args)
    })
  )

  // AutoExplainPath
  ipcMain.handle(
    'autoExplainPath-getListenerPage',
    createHandler('autoExplainPath-getListenerPage', (args) => {
      const service = new AutoExplainPathService()
      return service.getListenerPage(args)
    })
  )
  ipcMain.handle(
    'autoExplainPath-getListenerList',
    createHandler('autoExplainPath-getListenerList', (args) => {
      const service = new AutoExplainPathService()
      return service.getListenerList(args)
    })
  )

  // LocalAuthor
  ipcMain.handle(
    'localAuthor-save',
    createHandler('localAuthor-save', (args) => {
      const service = new LocalAuthorService()
      return service.save(args)
    })
  )
  ipcMain.handle(
    'localAuthor-deleteById',
    createHandler('localAuthor-deleteById', (args) => {
      const service = new LocalAuthorService()
      return service.deleteById(args)
    })
  )
  ipcMain.handle(
    'localAuthor-updateById',
    createHandler('localAuthor-updateById', (args) => {
      const service = new LocalAuthorService()
      return service.updateById(args)
    })
  )
  ipcMain.handle(
    'localAuthor-getById',
    createHandler('localAuthor-getById', (args) => {
      const service = new LocalAuthorService()
      return service.getById(args)
    })
  )
  ipcMain.handle(
    'localAuthor-queryPage',
    createHandler('localAuthor-queryPage', (args) => {
      const service = new LocalAuthorService()
      args = new Page(args)
      return service.queryPage(args)
    })
  )
  ipcMain.handle(
    'localAuthor-listSelectItems',
    createHandler('localAuthor-listSelectItems', (args) => {
      const service = new LocalAuthorService()
      return service.listSelectItems(args)
    })
  )
  ipcMain.handle(
    'localAuthor-querySelectItemPage',
    createHandler('localAuthor-querySelectItemPage', (args) => {
      const service = new LocalAuthorService()
      return service.querySelectItemPage(args)
    })
  )

  // LocalTag
  ipcMain.handle(
    'localTag-save',
    createHandler('localTag-save', (args) => {
      const service = new LocalTagService()
      return service.save(args)
    })
  )
  ipcMain.handle(
    'localTag-deleteById',
    createHandler('localTag-deleteById', (args) => {
      const service = new LocalTagService()
      return service.deleteById(args)
    })
  )
  ipcMain.handle(
    'localTag-updateById',
    createHandler('localTag-updateById', (args) => {
      const service = new LocalTagService()
      return service.updateById(args)
    })
  )
  ipcMain.handle(
    'localTag-queryPage',
    createHandler('localTag-queryPage', (args) => {
      const service = new LocalTagService()
      return service.queryPage(args)
    })
  )
  ipcMain.handle(
    'localTag-queryDTOPage',
    createHandler('localTag-queryDTOPage', (args) => {
      const service = new LocalTagService()
      return service.queryDTOPage(args)
    })
  )
  ipcMain.handle(
    'localTag-getById',
    createHandler('localTag-getById', (args) => {
      const service = new LocalTagService()
      return service.getById(args)
    })
  )
  ipcMain.handle(
    'localTag-getTree',
    createHandler('localTag-getTree', (arg1, arg2) => {
      const service = new LocalTagService()
      return service.getTree(arg1, arg2)
    })
  )
  ipcMain.handle(
    'localTag-listSelectItems',
    createHandler('localTag-listSelectItems', (args) => {
      const service = new LocalTagService()
      return service.listSelectItems(args)
    })
  )
  ipcMain.handle(
    'localTag-querySelectItemPage',
    createHandler('localTag-querySelectItemPage', (args) => {
      const service = new LocalTagService()
      return service.querySelectItemPage(args)
    })
  )
  ipcMain.handle(
    'localTag-listByWorkId',
    createHandler('localTag-listByWorkId', (args) => {
      const service = new LocalTagService()
      return service.listByWorkId(args)
    })
  )
  ipcMain.handle(
    'localTag-querySelectItemPageByWorkId',
    createHandler('localTag-querySelectItemPageByWorkId', (args) => {
      const service = new LocalTagService()
      return service.querySelectItemPageByWorkId(args)
    })
  )

  // PluginTaskUrlListenerManager
  ipcMain.handle(
    'pluginTaskUrlListenerManager-listListener',
    createHandler('pluginTaskUrlListenerManager-listListener', (args) => {
      return getPluginTaskUrlListenerManager().listListener(args)
    })
  )

  // Plugin
  ipcMain.handle(
    'plugin-updateById',
    createHandler('plugin-updateById', (args) => {
      const service = new PluginService()
      return service.updateById(args)
    })
  )
  ipcMain.handle(
    'plugin-queryPage',
    createHandler('plugin-queryPage', (args) => {
      const service = new PluginService()
      return service.queryPage(args)
    })
  )
  ipcMain.handle(
    'plugin-installFromPath',
    createHandler('plugin-installFromPath', (args) => {
      const service = new PluginService()
      return service.installFromPath(args, 'manual')
    })
  )
  ipcMain.handle(
    'plugin-reinstall',
    createHandler('plugin-reinstall', (args) => {
      const service = new PluginService()
      return service.reinstall(args, 'reinstall')
    })
  )
  ipcMain.handle(
    'plugin-reinstallFromPath',
    createHandler('plugin-reinstallFromPath', (arg1, arg2) => {
      const service = new PluginService()
      return service.reinstallFromPath(arg1, arg2, 'reinstall')
    })
  )
  ipcMain.handle(
    'plugin-unInstall',
    createHandler('plugin-unInstall', (args) => {
      const service = new PluginService()
      return service.uninstall(args)
    })
  )

  // ReWorkTag
  ipcMain.handle(
    'reWorkTag-link',
    createHandler('reWorkTag-link', (type: OriginType, localTagIds: number[], workId: number) => {
      const service = new ReWorkTagService()
      return service.link(type, localTagIds, workId)
    })
  )
  ipcMain.handle(
    'reWorkTag-unlink',
    createHandler('reWorkTag-unlink', (type: OriginType, localTagIds: number[], workId: number) => {
      const service = new ReWorkTagService()
      return service.unlink(type, localTagIds, workId)
    })
  )

  // Search
  ipcMain.handle(
    'search-querySearchConditionPage',
    createHandler('search-querySearchConditionPage', (args) => {
      const service = new SearchService()
      return service.querySearchConditionPage(args)
    })
  )
  ipcMain.handle(
    'search-queryWorkPage',
    createHandler('search-queryWorkPage', (args) => {
      const service = new SearchService()
      return service.queryWorkPage(args)
    })
  )
  ipcMain.handle(
    'search-queryWorkSetPage',
    createHandler('search-queryWorkSetPage', (args) => {
      const service = new SearchService()
      return service.queryWorkSetPage(args)
    })
  )

  //SettingsService
  ipcMain.handle(
    'settings-getSettings',
    createHandler('settings-getSettings', () => SettingsService.getSettings())
  )
  ipcMain.handle(
    'settings-saveSettings',
    createHandler('settings-saveSettings', (args) => SettingsService.saveSettings(args))
  )
  ipcMain.handle(
    'settings-resetSettings',
    createHandler('settings-resetSettings', () => SettingsService.resetSettings())
  )

  // Site
  ipcMain.handle(
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
  ipcMain.handle(
    'site-queryPage',
    createHandler('site-queryPage', (args) => {
      const service = new SiteService()
      args = new Page<SiteQueryDTO, Site>(args)
      return service.queryPage(args)
    })
  )
  ipcMain.handle(
    'site-querySelectItemPage',
    createHandler('site-querySelectItemPage', (args) => {
      const service = new SiteService()
      return service.querySelectItemPage(args)
    })
  )
  ipcMain.handle(
    'site-save',
    createHandler('site-save', (args) => {
      const service = new SiteService()
      return service.save(args)
    })
  )
  ipcMain.handle(
    'site-updateById',
    createHandler('site-updateById', (args) => {
      const service = new SiteService()
      return service.updateById(args)
    })
  )

  // SiteAuthor
  ipcMain.handle(
    'siteAuthor-deleteById',
    createHandler('siteAuthor-deleteById', (args) => {
      const service = new SiteAuthorService()
      return service.deleteById(args)
    })
  )
  ipcMain.handle(
    'siteAuthor-save',
    createHandler('siteAuthor-save', (args) => {
      const service = new SiteAuthorService()
      return service.save(args)
    })
  )
  ipcMain.handle(
    'siteAuthor-updateById',
    createHandler('siteAuthor-updateById', (args) => {
      const service = new SiteAuthorService()
      return service.updateById(args)
    })
  )
  ipcMain.handle(
    'siteAuthor-updateBindLocalAuthor',
    createHandler('siteAuthor-updateBindLocalAuthor', (arg1, arg2) => {
      const service = new SiteAuthorService()
      return service.updateBindLocalAuthor(arg1, arg2)
    })
  )
  ipcMain.handle(
    'siteAuthor-createAndBindSameNameLocalAuthor',
    createHandler('siteAuthor-createAndBindSameNameLocalAuthor', (args) => {
      const service = new SiteAuthorService()
      return service.createAndBindSameNameLocalAuthor(args)
    })
  )
  ipcMain.handle(
    'siteAuthor-queryBoundOrUnboundInLocalAuthorPage',
    createHandler('siteAuthor-queryBoundOrUnboundInLocalAuthorPage', (args) => {
      const service = new SiteAuthorService()
      return service.queryBoundOrUnboundInLocalAuthorPage(args)
    })
  )
  ipcMain.handle(
    'siteAuthor-queryLocalRelateDTOPage',
    createHandler('siteAuthor-queryLocalRelateDTOPage', (args) => {
      const service = new SiteAuthorService()
      return service.queryLocalRelateDTOPage(args)
    })
  )

  // SiteTag
  ipcMain.handle(
    'siteTag-save',
    createHandler('siteTag-save', (args) => {
      const service = new SiteTagService()
      return service.save(args)
    })
  )
  ipcMain.handle(
    'siteTag-createAndBindSameNameLocalTag',
    createHandler('siteTag-createAndBindSameNameLocalTag', (args) => {
      const service = new SiteTagService()
      return service.createAndBindSameNameLocalTag(args)
    })
  )
  ipcMain.handle(
    'siteTag-updateById',
    createHandler('siteTag-updateById', (args) => {
      const service = new SiteTagService()
      return service.updateById(args)
    })
  )
  ipcMain.handle(
    'siteTag-deleteById',
    createHandler('siteTag-deleteById', (args) => {
      const service = new SiteTagService()
      return service.deleteById(args)
    })
  )
  ipcMain.handle(
    'siteTag-updateBindLocalTag',
    createHandler('siteTag-updateBindLocalTag', (localTagId: number, siteTagIds: number[]) => {
      const service = new SiteTagService()
      return service.updateBindLocalTag(localTagId, siteTagIds)
    })
  )
  ipcMain.handle(
    'siteTag-queryPage',
    createHandler('siteTag-queryPage', (page: Page<SiteTagQueryDTO, SiteTag>) => {
      const service = new SiteTagService()
      return service.queryPage(page)
    })
  )
  ipcMain.handle(
    'siteTag-queryBoundOrUnboundToLocalTagPage',
    createHandler('siteTag-queryBoundOrUnboundToLocalTagPage', (page: Page<SiteTagQueryDTO, SiteTag>) => {
      const service = new SiteTagService()
      return service.queryBoundOrUnboundToLocalTagPage(page)
    })
  )
  ipcMain.handle(
    'siteTag-queryPageByWorkId',
    createHandler('siteTag-queryPageByWorkId', (page: Page<SiteTagQueryDTO, SiteTag>) => {
      const service = new SiteTagService()
      return service.queryPageByWorkId(page)
    })
  )
  ipcMain.handle(
    'siteTag-queryLocalRelateDTOPage',
    createHandler('siteTag-queryLocalRelateDTOPage', (page: Page<SiteTagQueryDTO, SiteTag>) => {
      const service = new SiteTagService()
      return service.queryLocalRelateDTOPage(page)
    })
  )
  ipcMain.handle(
    'siteTag-querySelectItemPageByWorkId',
    createHandler('siteTag-querySelectItemPageByWorkId', (page: Page<SiteTagQueryDTO, SiteTag>) => {
      const service = new SiteTagService()
      return service.querySelectItemPageByWorkId(page)
    })
  )

  // Task
  ipcMain.handle(
    'task-createTask',
    createHandler('task-createTask', (args) => {
      const service = new TaskService()
      return service.createTask(args)
    })
  )
  ipcMain.handle(
    'task-startTaskTree',
    createHandler('task-startTaskTree', (args) => {
      const service = new TaskService()
      return service.startTaskTree(args)
    })
  )
  ipcMain.handle(
    'task-retryTaskTree',
    createHandler('task-retryTaskTree', (args) => {
      const service = new TaskService()
      return service.retryTaskTree(args)
    })
  )
  ipcMain.handle(
    'task-deleteTask',
    createHandler('task-deleteTask', (args) => {
      const service = new TaskService()
      return service.deleteTask(args)
    })
  )
  ipcMain.handle(
    'task-queryPage',
    createHandler('task-queryPage', (args) => {
      const service = new TaskService()
      return service.queryPage(args)
    })
  )
  ipcMain.handle(
    'task-queryParentPage',
    createHandler('task-queryParentPage', (args) => {
      const service = new TaskService()
      return service.queryParentPage(args)
    })
  )
  ipcMain.handle(
    'task-queryTreeDataPage',
    createHandler('task-queryTreeDataPage', (args) => {
      const service = new TaskService()
      return service.queryTreeDataPage(args)
    })
  )
  ipcMain.handle(
    'task-listChildrenTask',
    createHandler('task-listChildrenTask', (args) => {
      const service = new TaskService()
      return service.listChildrenTask(args)
    })
  )
  ipcMain.handle(
    'task-queryChildrenTaskPage',
    createHandler('task-queryChildrenTaskPage', (args) => {
      const service = new TaskService()
      return service.queryChildrenTaskPage(args)
    })
  )
  ipcMain.handle(
    'task-listStatus',
    createHandler('task-listStatus', (args) => {
      const service = new TaskService()
      return service.listStatus(args)
    })
  )
  ipcMain.handle(
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
  ipcMain.handle(
    'task-stopTaskTree',
    createHandler('task-stopTaskTree', (args) => {
      const service = new TaskService()
      return service.stopTaskTree(args)
    })
  )
  ipcMain.handle(
    'task-pauseTaskTree',
    createHandler('task-pauseTaskTree', (args) => {
      const service = new TaskService()
      return service.pauseTaskTree(args)
    })
  )
  ipcMain.handle(
    'task-resumeTaskTree',
    createHandler('task-resumeTaskTree', (args) => {
      const service = new TaskService()
      return service.resumeTaskTree(args)
    })
  )

  // Work
  ipcMain.handle(
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
  ipcMain.handle(
    'work-queryPage',
    createHandler('work-queryPage', (args) => {
      const service = new WorkService()
      return service.queryPage(args)
    })
  )
  ipcMain.handle(
    'work-getFullWorkInfoById',
    createHandler('work-getFullWorkInfoById', (args) => {
      if (isNullish(args)) {
        throw new Error('作品id不能为空')
      }
      const service = new WorkService()
      return service.getFullWorkInfoById(args)
    })
  )

  // WorkSet
  ipcMain.handle(
    'workSet-listWorkSetWithWorkByIds',
    createHandler('workSet-listWorkSetWithWorkByIds', (args) => {
      const service = new WorkSetService()
      return service.listWorkSetWithWorkByIds(args)
    })
  )

  ipcMain.handle(
    'workSet-queryPageWithCover',
    createHandler('workSet-queryPageWithCover', (args) => {
      const service = new WorkSetService()
      return service.queryPageWithCover(args)
    })
  )

  // ReWorkWorkSet
  ipcMain.handle(
    'reWorkWorkSet-linkBatchToWorkSet',
    createHandler('reWorkWorkSet-linkBatchToWorkSet', (args) => {
      const service = new ReWorkWorkSetService()
      const { workIds, workSetId } = args
      return service.linkBatchToWorkSet(workIds, workSetId)
    })
  )

  ipcMain.handle(
    'reWorkWorkSet-removeBatchFromWorkSet',
    createHandler('reWorkWorkSet-removeBatchFromWorkSet', (args) => {
      const service = new ReWorkWorkSetService()
      const { workIds, workSetId } = args
      return service.removeBatchFromWorkSet(workIds, workSetId)
    })
  )

  ipcMain.handle(
    'reWorkWorkSet-updateSortOrders',
    createHandler('reWorkWorkSet-updateSortOrders', (args) => {
      const service = new ReWorkWorkSetService()
      const { workSetId, workIds } = args
      return service.updateSortOrders(workSetId, workIds)
    })
  )

  ipcMain.handle(
    'reWorkWorkSet-setCover',
    createHandler('reWorkWorkSet-setCover', (args) => {
      const service = new ReWorkWorkSetService()
      const { workSetId, workId } = args
      return service.setCover(workSetId, workId)
    })
  )

  ipcMain.handle(
    'reWorkWorkSet-unsetCover',
    createHandler('reWorkWorkSet-unsetCover', (args) => {
      const service = new ReWorkWorkSetService()
      const { workSetId, workId } = args
      return service.unsetCover(workSetId, workId)
    })
  )

  ipcMain.handle(
    'reWorkWorkSet-getCoverWorkId',
    createHandler('reWorkWorkSet-getCoverWorkId', (args) => {
      const service = new ReWorkWorkSetService()
      const { workSetId } = args
      return service.getCoverWorkId(workSetId)
    })
  )

  // FileSysUtil
  ipcMain.handle(
    'fileSysUtil-dirSelect',
    createHandler('fileSysUtil-dirSelect', (openFile, isModal) => {
      return DirSelect(openFile, isModal)
    })
  )

  // SecureStorage
  ipcMain.handle(
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
  ipcMain.handle(
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
  ipcMain.handle(
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
  ipcMain.handle(
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
  ipcMain.handle(
    'secureStorage-listKeys',
    createHandler('secureStorage-listKeys', () => {
      const service = new SecureStorageService()
      return service.listKeys()
    })
  )
  // SiteBrowser
  ipcMain.handle(
    'siteBrowser-queryPage',
    createHandler('siteBrowser-queryPage', (page: Page<object, SiteBrowserDTO>) => {
      page = new Page(page)
      return getSiteBrowserManager().queryPage(page)
    })
  )
  ipcMain.handle(
    'siteBrowser-open',
    createHandler('siteBrowser-open', async (pluginPublicId: string, contributionId: string) => {
      const siteBrowserManager = getSiteBrowserManager()
      const siteBrowser = siteBrowserManager.getById(`${pluginPublicId}-${contributionId}`)
      if (!siteBrowser) {
        throw new Error(`站点浏览器不存在: ${pluginPublicId}-${contributionId}`)
      }
      const pluginManager = getPluginManager()
      const siteBrowserInstance = await pluginManager.getContribution(siteBrowser.pluginPublicId, 'siteBrowser', contributionId)
      if (!siteBrowserInstance) {
        throw new Error(`获取站点浏览器插件失败: ${pluginPublicId}`)
      }
      await siteBrowserInstance.open()
      return
    })
  )
}
