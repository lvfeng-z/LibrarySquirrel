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

function exposeService() {
  // test
  Electron.ipcMain.handle('test-insertLocalTag10W', async () => {
    return await InsertLocalTag.insertLocalTag10W()
  })
  Electron.ipcMain.handle('test-taskPluginListenerService-saveBatch', async (_event, args) => {
    return await TaskPluginListenerService.saveBatch(args)
  })
  Electron.ipcMain.handle('test-taskPluginListenerService-getMonitored', async (_event, args) => {
    return await TaskPluginListenerService.getMonitored(args)
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

  // TaskService
  Electron.ipcMain.handle('taskService-startTask', async (_event, args) => {
    return await TaskService.startTask(args)
  })
  Electron.ipcMain.handle('taskService-createTask', async (_event, args) => {
    return await TaskService.createTask(args)
  })

  // WorksService
  Electron.ipcMain.handle('works-queryPage', async (_event, args): Promise<ApiUtil> => {
    return await WorksService.queryPage(args)
  })
}

export default {
  exposeService
}
