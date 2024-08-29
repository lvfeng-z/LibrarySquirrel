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
  localAuthorSelectPage: (args) => {
    return Electron.ipcRenderer.invoke('localAuthor-selectPage', args)
  },
  localAuthorGetSelectItems: (args) => {
    return Electron.ipcRenderer.invoke('localAuthor-getSelectItems', args)
  },
  localAuthorGetSelectItemPage: (args) => {
    return Electron.ipcRenderer.invoke('localAuthor-getSelectItemPage', args)
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
  localTagSelectPage: (args) => {
    return Electron.ipcRenderer.invoke('localTag-selectPage', args)
  },
  localTagGetById: (args) => {
    return Electron.ipcRenderer.invoke('localTag-getById', args)
  },
  localTagGetTree: (args) => {
    return Electron.ipcRenderer.invoke('localTag-getTree', args)
  },
  localTagGetSelectList: (args) => {
    return Electron.ipcRenderer.invoke('localTag-getSelectList', args)
  },
  localTagGetSelectItemPage: (args) => {
    return Electron.ipcRenderer.invoke('localTag-getSelectItemPage', args)
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
  siteGetSelectItemPage: (args) => {
    return Electron.ipcRenderer.invoke('site-getSelectItemPage', args)
  },

  // SiteAuthor
  siteAuthorUpdateBindLocalAuthor: (arg1, arg2) => {
    return Electron.ipcRenderer.invoke('siteAuthor-updateBindLocalAuthor', arg1, arg2)
  },
  siteAuthorGetBoundOrUnboundInLocalAuthor: (args) => {
    return Electron.ipcRenderer.invoke('siteAuthor-getBoundOrUnboundInLocalAuthor', args)
  },

  // SiteTag
  siteTagSave: (args) => {
    return Electron.ipcRenderer.invoke('siteTag-save', args)
  },
  siteTagUpdateById: (args) => {
    return Electron.ipcRenderer.invoke('siteTag-updateById', args)
  },
  siteTagUpdateBindLocalTag: (localTagId: string | null, siteTagIds: string[]) => {
    return Electron.ipcRenderer.invoke('siteTag-updateBindLocalTag', localTagId, siteTagIds)
  },
  siteTagGetBoundOrUnboundInLocalTag: (args) => {
    return Electron.ipcRenderer.invoke('siteTag-getBoundOrUnboundInLocalTag', args)
  },
  siteTagGetSelectList: (args) => {
    return Electron.ipcRenderer.invoke('siteTag-getSelectList', args)
  },

  // Task
  taskCreateTask: (args) => {
    return Electron.ipcRenderer.invoke('task-createTask', args)
  },
  taskStartTask: (args) => {
    return Electron.ipcRenderer.invoke('task-startTask', args)
  },
  taskDeleteTask: (args) => {
    return Electron.ipcRenderer.invoke('task-deleteTask', args)
  },
  taskSelectPage: (args) => {
    return Electron.ipcRenderer.invoke('task-selectPage', args)
  },
  taskSelectParentPage: (args) => {
    return Electron.ipcRenderer.invoke('task-selectParentPage', args)
  },
  taskSelectTreeDataPage: (args) => {
    return Electron.ipcRenderer.invoke('task-selectTreeDataPage', args)
  },
  taskGetChildrenTask: (args) => {
    return Electron.ipcRenderer.invoke('task-getChildrenTask', args)
  },
  taskSelectChildrenTaskPage: (args) => {
    return Electron.ipcRenderer.invoke('task-selectChildrenTaskPage', args)
  },
  taskSelectScheduleList: (args) => {
    return Electron.ipcRenderer.invoke('task-selectScheduleList', args)
  },

  // Works
  worksQueryPage: (args) => {
    return Electron.ipcRenderer.invoke('works-queryPage', args)
  },
  worksSaveWorks: (args) => {
    return Electron.ipcRenderer.invoke('works-saveWorks', args)
  },

  // FileSysUtil
  dirSelect: (args) => {
    return Electron.ipcRenderer.invoke('fileSysUtil-dirSelect', args)
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
