import Electron from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // test
  testInsertLocalTag10W: (args) => Electron.ipcRenderer.invoke('test-insertLocalTag10W', args),
  testTransactionTest: (args) => Electron.ipcRenderer.invoke('test-transactionTest', args),
  testTaskPluginListenerSaveBatch: (args) => Electron.ipcRenderer.invoke('test-taskPluginListener-saveBatch', args),
  testTaskPluginListenerGetMonitored: (args) => Electron.ipcRenderer.invoke('test-taskPluginListener-getMonitored', args),
  testPLimitTest: (args) => Electron.ipcRenderer.invoke('test-pLimitTest', args),
  testInstallPluginTest: (args) => Electron.ipcRenderer.invoke('test-installPluginTest', args),
  testMainWindowMsgTest: (args) => Electron.ipcRenderer.invoke('test-mainWindowMsgTest', args),

  // AppLauncher
  appLauncherOpenImage: (args) => Electron.ipcRenderer.invoke('appLauncher-openImage', args),

  // AutoExplainPath
  autoExplainPathGetListenerPage: (args) => Electron.ipcRenderer.invoke('autoExplainPath-getListenerPage', args),
  autoExplainPathGetListenerList: (args) => Electron.ipcRenderer.invoke('autoExplainPath-getListenerList', args),

  // LocalAuthor
  localAuthorSave: (args) => Electron.ipcRenderer.invoke('localAuthor-save', args),
  localAuthorDeleteById: (args) => Electron.ipcRenderer.invoke('localAuthor-deleteById', args),
  localAuthorUpdateById: (args) => Electron.ipcRenderer.invoke('localAuthor-updateById', args),
  localAuthorGetById: (args) => Electron.ipcRenderer.invoke('localAuthor-getById', args),
  localAuthorQueryPage: (args) => Electron.ipcRenderer.invoke('localAuthor-queryPage', args),
  localAuthorListSelectItems: (args) => Electron.ipcRenderer.invoke('localAuthor-listSelectItems', args),
  localAuthorQuerySelectItemPage: (args) => Electron.ipcRenderer.invoke('localAuthor-querySelectItemPage', args),

  // LocalTag
  localTagSave: (args) => Electron.ipcRenderer.invoke('localTag-save', args),
  localTagDeleteById: (args) => Electron.ipcRenderer.invoke('localTag-deleteById', args),
  localTagUpdateById: (args) => Electron.ipcRenderer.invoke('localTag-updateById', args),
  localTagQueryPage: (args) => Electron.ipcRenderer.invoke('localTag-queryPage', args),
  localTagQueryDTOPage: (args) => Electron.ipcRenderer.invoke('localTag-queryDTOPage', args),
  localTagGetById: (args) => Electron.ipcRenderer.invoke('localTag-getById', args),
  localTagGetTree: (args) => Electron.ipcRenderer.invoke('localTag-getTree', args),
  localTagListSelectItems: (args) => Electron.ipcRenderer.invoke('localTag-listSelectItems', args),
  localTagQuerySelectItemPage: (args) => Electron.ipcRenderer.invoke('localTag-querySelectItemPage', args),
  localTagListByWorksId: (args) => Electron.ipcRenderer.invoke('localTag-listByWorksId', args),
  localTagQuerySelectItemPageByWorksId: (args) => Electron.ipcRenderer.invoke('localTag-querySelectItemPageByWorksId', args),

  // Plugin
  pluginQueryPage: (args) => Electron.ipcRenderer.invoke('plugin-queryPage', args),
  pluginReInstall: (args) => Electron.ipcRenderer.invoke('plugin-reInstall', args),
  pluginUnInstall: (args) => Electron.ipcRenderer.invoke('plugin-unInstall', args),

  // SearchService
  searchQuerySearchConditionPage: (args) => Electron.ipcRenderer.invoke('search-querySearchConditionPage', args),
  searchQueryWorksPage: (args) => Electron.ipcRenderer.invoke('search-queryWorksPage', args),

  // ReWorksTag
  reWorksTagLink: (arg1, arg2, arg3) => Electron.ipcRenderer.invoke('reWorksTag-link', arg1, arg2, arg3),
  reWorksTagUnlink: (arg1, arg2, arg3) => Electron.ipcRenderer.invoke('reWorksTag-unlink', arg1, arg2, arg3),

  // Settings
  settingsGetSettings: () => Electron.ipcRenderer.invoke('settings-getSettings'),
  settingsSaveSettings: (args) => Electron.ipcRenderer.invoke('settings-saveSettings', args),
  settingsResetSettings: () => Electron.ipcRenderer.invoke('settings-resetSettings'),

  // Site
  siteDeleteById: (args) => Electron.ipcRenderer.invoke('site-deleteById', args),
  siteQueryPage: (args) => Electron.ipcRenderer.invoke('site-queryPage', args),
  siteQuerySelectItemPage: (args) => Electron.ipcRenderer.invoke('site-querySelectItemPage', args),
  siteSave: (args) => Electron.ipcRenderer.invoke('site-save', args),
  siteUpdateById: (args) => Electron.ipcRenderer.invoke('site-updateById', args),

  // SiteDomainService
  siteDomainDeleteById: (args) => Electron.ipcRenderer.invoke('siteDomain-deleteById', args),
  siteDomainQueryPage: (args) => Electron.ipcRenderer.invoke('siteDomain-queryPage', args),
  siteDomainSave: (args) => Electron.ipcRenderer.invoke('siteDomain-save', args),
  siteDomainUpdateById: (args) => Electron.ipcRenderer.invoke('siteDomain-updateById', args),
  siteDomainQueryDTOPage: (args) => Electron.ipcRenderer.invoke('siteDomain-queryDTOPage', args),
  siteDomainQueryDTOPageBySite: (args) => Electron.ipcRenderer.invoke('siteDomain-queryDTOPageBySite', args),

  // SiteAuthor
  siteAuthorCreateAndBindSameNameLocalAuthor: (args) =>
    Electron.ipcRenderer.invoke('siteAuthor-createAndBindSameNameLocalAuthor', args),
  siteAuthorUpdateBindLocalAuthor: (arg1, arg2) => Electron.ipcRenderer.invoke('siteAuthor-updateBindLocalAuthor', arg1, arg2),
  siteAuthorDeleteById: (args) => Electron.ipcRenderer.invoke('siteAuthor-deleteById', args),
  siteAuthorUpdateById: (args) => Electron.ipcRenderer.invoke('siteAuthor-updateById', args),
  siteAuthorQueryBoundOrUnboundInLocalAuthorPage: (args) =>
    Electron.ipcRenderer.invoke('siteAuthor-queryBoundOrUnboundInLocalAuthorPage', args),

  // SiteTag
  siteTagSave: (args) => Electron.ipcRenderer.invoke('siteTag-save', args),
  siteTagCreateAndBindSameNameLocalTag: (args) => Electron.ipcRenderer.invoke('siteTag-createAndBindSameNameLocalTag', args),
  siteTagUpdateById: (args) => Electron.ipcRenderer.invoke('siteTag-updateById', args),
  siteTagDeleteById: (args) => Electron.ipcRenderer.invoke('siteTag-deleteById', args),
  siteTagUpdateBindLocalTag: (localTagId: string | null, siteTagIds: string[]) =>
    Electron.ipcRenderer.invoke('siteTag-updateBindLocalTag', localTagId, siteTagIds),
  siteTagQueryPage: (args) => Electron.ipcRenderer.invoke('siteTag-queryPage', args),
  siteTagQueryBoundOrUnboundToLocalTagPage: (args) => Electron.ipcRenderer.invoke('siteTag-queryBoundOrUnboundToLocalTagPage', args),
  siteTagQueryPageByWorksId: (args) => Electron.ipcRenderer.invoke('siteTag-queryPageByWorksId', args),
  siteTagQueryLocalRelateDTOPage: (args) => Electron.ipcRenderer.invoke('siteTag-queryLocalRelateDTOPage', args),
  siteTagQuerySelectItemPageByWorksId: (args) => Electron.ipcRenderer.invoke('siteTag-querySelectItemPageByWorksId', args),
  siteAuthorQueryLocalRelateDTOPage: (args) => Electron.ipcRenderer.invoke('siteAuthor-queryLocalRelateDTOPage', args),

  // Task
  taskCreateTask: (args) => Electron.ipcRenderer.invoke('task-createTask', args),
  taskStartTaskTree: (args) => Electron.ipcRenderer.invoke('task-startTaskTree', args),
  taskRetryTaskTree: (args) => Electron.ipcRenderer.invoke('task-retryTaskTree', args),
  taskDeleteTask: (args) => Electron.ipcRenderer.invoke('task-deleteTask', args),
  taskQueryPage: (args) => Electron.ipcRenderer.invoke('task-queryPage', args),
  taskQueryParentPage: (args) => Electron.ipcRenderer.invoke('task-queryParentPage', args),
  taskQueryTreeDataPage: (args) => Electron.ipcRenderer.invoke('task-queryTreeDataPage', args),
  taskListChildrenTask: (args) => Electron.ipcRenderer.invoke('task-listChildrenTask', args),
  taskQueryChildrenTaskPage: (args) => Electron.ipcRenderer.invoke('task-queryChildrenTaskPage', args),
  taskListStatus: (args) => Electron.ipcRenderer.invoke('task-listStatus', args),
  taskListSchedule: (args) => Electron.ipcRenderer.invoke('task-listSchedule', args),
  taskPauseTaskTree: (args) => Electron.ipcRenderer.invoke('task-pauseTaskTree', args),
  taskResumeTaskTree: (args) => Electron.ipcRenderer.invoke('task-resumeTaskTree', args),

  // Works
  worksQueryPage: (args) => Electron.ipcRenderer.invoke('works-queryPage', args),
  worksGetFullWorksInfoById: (args) => Electron.ipcRenderer.invoke('works-getFullWorksInfoById', args),

  // FileSysUtil
  dirSelect: (arg1, arg2) => Electron.ipcRenderer.invoke('fileSysUtil-dirSelect', arg1, arg2)
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
