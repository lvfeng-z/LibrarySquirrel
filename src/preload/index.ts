import Electron from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // test
  testInsertLocalTag10W: (args) => {
    return Electron.ipcRenderer.invoke('test-insertLocalTag10W', args)
  },
  testTransactionTest: (args) => {
    return Electron.ipcRenderer.invoke('test-transactionTest', args)
  },
  testTaskPluginListenerSaveBatch: (args) => {
    return Electron.ipcRenderer.invoke('test-taskPluginListener-saveBatch', args)
  },
  testTaskPluginListenerGetMonitored: (args) => {
    return Electron.ipcRenderer.invoke('test-taskPluginListener-getMonitored', args)
  },
  testPLimitTest: (args) => {
    return Electron.ipcRenderer.invoke('test-pLimitTest', args)
  },
  testInstallPluginTest: (args) => {
    return Electron.ipcRenderer.invoke('test-installPluginTest', args)
  },
  testMainWindowMsgTest: (args) => {
    return Electron.ipcRenderer.invoke('test-mainWindowMsgTest', args)
  },

  // AppLauncher
  appLauncherOpenImage: (args) => {
    return Electron.ipcRenderer.invoke('appLauncher-openImage', args)
  },

  // AutoExplainPath
  autoExplainPathGetListenerPage: (args) => {
    return Electron.ipcRenderer.invoke('autoExplainPath-getListenerPage', args)
  },
  autoExplainPathGetListenerList: (args) => {
    return Electron.ipcRenderer.invoke('autoExplainPath-getListenerList', args)
  },

  // LocalAuthor
  localAuthorSave: (args) => {
    return Electron.ipcRenderer.invoke('localAuthor-save', args)
  },
  localAuthorDeleteById: (args) => {
    return Electron.ipcRenderer.invoke('localAuthor-deleteById', args)
  },
  localAuthorUpdateById: (args) => {
    return Electron.ipcRenderer.invoke('localAuthor-updateById', args)
  },
  localAuthorGetById: (args) => {
    return Electron.ipcRenderer.invoke('localAuthor-getById', args)
  },
  localAuthorQueryPage: (args) => {
    return Electron.ipcRenderer.invoke('localAuthor-queryPage', args)
  },
  localAuthorListSelectItems: (args) => {
    return Electron.ipcRenderer.invoke('localAuthor-listSelectItems', args)
  },
  localAuthorQuerySelectItemPage: (args) => {
    return Electron.ipcRenderer.invoke('localAuthor-querySelectItemPage', args)
  },

  // LocalTag
  localTagSave: (args) => {
    return Electron.ipcRenderer.invoke('localTag-save', args)
  },
  localTagDeleteById: (args) => {
    return Electron.ipcRenderer.invoke('localTag-deleteById', args)
  },
  localTagUpdateById: (args) => {
    return Electron.ipcRenderer.invoke('localTag-updateById', args)
  },
  localTagQueryPage: (args) => {
    return Electron.ipcRenderer.invoke('localTag-queryPage', args)
  },
  localTagQueryDTOPage: (args) => {
    return Electron.ipcRenderer.invoke('localTag-queryDTOPage', args)
  },
  localTagGetById: (args) => {
    return Electron.ipcRenderer.invoke('localTag-getById', args)
  },
  localTagGetTree: (args) => {
    return Electron.ipcRenderer.invoke('localTag-getTree', args)
  },
  localTagListSelectItems: (args) => {
    return Electron.ipcRenderer.invoke('localTag-listSelectItems', args)
  },
  localTagQuerySelectItemPage: (args) => {
    return Electron.ipcRenderer.invoke('localTag-querySelectItemPage', args)
  },
  localTagListByWorksId: (args) => {
    return Electron.ipcRenderer.invoke('localTag-listByWorksId', args)
  },
  localTagQuerySelectItemPageByWorksId: (args) => {
    return Electron.ipcRenderer.invoke('localTag-querySelectItemPageByWorksId', args)
  },

  // Plugin
  pluginQueryPage: (args) => {
    return Electron.ipcRenderer.invoke('plugin-queryPage', args)
  },
  pluginReInstall: (args) => {
    return Electron.ipcRenderer.invoke('plugin-reInstall', args)
  },
  pluginUnInstall: (args) => {
    return Electron.ipcRenderer.invoke('plugin-unInstall', args)
  },

  // SearchService
  searchQuerySearchConditionPage: (args) => {
    return Electron.ipcRenderer.invoke('search-querySearchConditionPage', args)
  },
  searchQueryWorksPage: (args) => {
    return Electron.ipcRenderer.invoke('search-queryWorksPage', args)
  },

  // ReWorksTag
  reWorksTagLink: (arg1, arg2, arg3) => {
    return Electron.ipcRenderer.invoke('reWorksTag-link', arg1, arg2, arg3)
  },
  reWorksTagUnlink: (arg1, arg2, arg3) => {
    return Electron.ipcRenderer.invoke('reWorksTag-unlink', arg1, arg2, arg3)
  },

  // Settings
  settingsGetSettings: () => {
    return Electron.ipcRenderer.invoke('settings-getSettings')
  },
  settingsSaveSettings: (args) => {
    return Electron.ipcRenderer.invoke('settings-saveSettings', args)
  },
  settingsResetSettings: () => {
    return Electron.ipcRenderer.invoke('settings-resetSettings')
  },

  // Site
  siteDeleteById: (args) => Electron.ipcRenderer.invoke('site-deleteById', args),
  siteQueryPage: (args) => {
    return Electron.ipcRenderer.invoke('site-queryPage', args)
  },
  siteQuerySelectItemPage: (args) => {
    return Electron.ipcRenderer.invoke('site-querySelectItemPage', args)
  },
  siteSave: (args) => {
    return Electron.ipcRenderer.invoke('site-save', args)
  },
  siteUpdateById: (args) => {
    return Electron.ipcRenderer.invoke('site-updateById', args)
  },

  // SiteDomainService
  siteDomainDeleteById: (args) => {
    return Electron.ipcRenderer.invoke('siteDomain-deleteById', args)
  },
  siteDomainQueryPage: (args) => {
    return Electron.ipcRenderer.invoke('siteDomain-queryPage', args)
  },
  siteDomainSave: (args) => {
    return Electron.ipcRenderer.invoke('siteDomain-save', args)
  },
  siteDomainUpdateById: (args) => {
    return Electron.ipcRenderer.invoke('siteDomain-updateById', args)
  },
  siteDomainQueryDTOPage: (args) => {
    return Electron.ipcRenderer.invoke('siteDomain-queryDTOPage', args)
  },
  siteDomainQueryDTOPageBySite: (args) => {
    return Electron.ipcRenderer.invoke('siteDomain-queryDTOPageBySite', args)
  },

  // SiteAuthor
  siteAuthorUpdateBindLocalAuthor: (arg1, arg2) => {
    return Electron.ipcRenderer.invoke('siteAuthor-updateBindLocalAuthor', arg1, arg2)
  },
  siteAuthorQueryBoundOrUnboundInLocalAuthorPage: (args) => {
    return Electron.ipcRenderer.invoke('siteAuthor-queryBoundOrUnboundInLocalAuthorPage', args)
  },

  // SiteTag
  siteTagSave: (args) => {
    return Electron.ipcRenderer.invoke('siteTag-save', args)
  },
  siteTagCreateAndBindSameNameLocalTag: (args) => Electron.ipcRenderer.invoke('siteTag-createAndBindSameNameLocalTag', args),
  siteTagUpdateById: (args) => {
    return Electron.ipcRenderer.invoke('siteTag-updateById', args)
  },
  siteTagDeleteById: (args) => Electron.ipcRenderer.invoke('siteTag-deleteById', args),
  siteTagUpdateBindLocalTag: (localTagId: string | null, siteTagIds: string[]) => {
    return Electron.ipcRenderer.invoke('siteTag-updateBindLocalTag', localTagId, siteTagIds)
  },
  siteTagQueryPage: (args) => Electron.ipcRenderer.invoke('siteTag-queryPage', args),
  siteTagQueryBoundOrUnboundToLocalTagPage: (args) => {
    return Electron.ipcRenderer.invoke('siteTag-queryBoundOrUnboundToLocalTagPage', args)
  },
  siteTagQueryPageByWorksId: (args) => {
    return Electron.ipcRenderer.invoke('siteTag-queryPageByWorksId', args)
  },
  siteTagQueryLocalRelateDTOPage: (args) => Electron.ipcRenderer.invoke('siteTag-queryLocalRelateDTOPage', args),
  siteTagQuerySelectItemPageByWorksId: (args) => {
    return Electron.ipcRenderer.invoke('siteTag-querySelectItemPageByWorksId', args)
  },

  // Task
  taskCreateTask: (args) => {
    return Electron.ipcRenderer.invoke('task-createTask', args)
  },
  taskStartTaskTree: (args) => {
    return Electron.ipcRenderer.invoke('task-startTaskTree', args)
  },
  taskRetryTaskTree: (args) => {
    return Electron.ipcRenderer.invoke('task-retryTaskTree', args)
  },
  taskDeleteTask: (args) => {
    return Electron.ipcRenderer.invoke('task-deleteTask', args)
  },
  taskQueryPage: (args) => {
    return Electron.ipcRenderer.invoke('task-queryPage', args)
  },
  taskQueryParentPage: (args) => {
    return Electron.ipcRenderer.invoke('task-queryParentPage', args)
  },
  taskQueryTreeDataPage: (args) => {
    return Electron.ipcRenderer.invoke('task-queryTreeDataPage', args)
  },
  taskListChildrenTask: (args) => {
    return Electron.ipcRenderer.invoke('task-listChildrenTask', args)
  },
  taskQueryChildrenTaskPage: (args) => {
    return Electron.ipcRenderer.invoke('task-queryChildrenTaskPage', args)
  },
  taskListStatus: (args) => {
    return Electron.ipcRenderer.invoke('task-listStatus', args)
  },
  taskListSchedule: (args) => {
    return Electron.ipcRenderer.invoke('task-listSchedule', args)
  },
  taskPauseTaskTree: (args) => {
    return Electron.ipcRenderer.invoke('task-pauseTaskTree', args)
  },
  taskResumeTaskTree: (args) => {
    return Electron.ipcRenderer.invoke('task-resumeTaskTree', args)
  },

  // Works
  worksQueryPage: (args) => {
    return Electron.ipcRenderer.invoke('works-queryPage', args)
  },
  worksGetFullWorksInfoById: (args) => {
    return Electron.ipcRenderer.invoke('works-getFullWorksInfoById', args)
  },

  // FileSysUtil
  dirSelect: (arg1, arg2) => {
    return Electron.ipcRenderer.invoke('fileSysUtil-dirSelect', arg1, arg2)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    Electron.contextBridge.exposeInMainWorld('electron', electronAPI)
    Electron.contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
