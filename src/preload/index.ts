import Electron from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // test
  testInsertLocalTag10W: (args) => {
    return Electron.ipcRenderer.invoke('test-insertLocalTag10W', args)
  },
  testTaskPluginListenerServiceSaveBatch: (args) => {
    return Electron.ipcRenderer.invoke('test-taskPluginListenerService-saveBatch', args)
  },
  testTaskPluginListenerServiceGetMonitored: (args) => {
    return Electron.ipcRenderer.invoke('test-taskPluginListenerService-getMonitored', args)
  },

  // LocalAuthorService
  localAuthorSelectPage: (args) => {
    return Electron.ipcRenderer.invoke('localAuthor-selectPage', args)
  },
  localAuthorGetSelectItems: (args) => {
    return Electron.ipcRenderer.invoke('localAuthor-getSelectItems', args)
  },
  localAuthorGetSelectItemPage: (args) => {
    return Electron.ipcRenderer.invoke('localAuthor-getSelectItemPage', args)
  },

  // LocalTagService
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

  // SettingsService
  settingsGetSettings: () => {
    return Electron.ipcRenderer.invoke('settings-getSettings')
  },
  settingsSaveSettings: (args) => {
    return Electron.ipcRenderer.invoke('settings-saveSettings', args)
  },
  settingsResetSettings: () => {
    return Electron.ipcRenderer.invoke('settings-resetSettings')
  },

  // SiteService
  siteGetSelectItemPage: (args) => {
    return Electron.ipcRenderer.invoke('site-getSelectItemPage', args)
  },

  // SiteTagService
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

  // TaskService
  taskServiceCreateTask: (args) => {
    return Electron.ipcRenderer.invoke('taskService-createTask', args)
  },
  taskServiceStartTask: (args) => {
    return Electron.ipcRenderer.invoke('taskService-startTask', args)
  },

  // WorksService
  worksQueryPage: (args) => {
    return Electron.ipcRenderer.invoke('works-queryPage', args)
  },
  worksServiceSaveWorks: (args) => {
    return Electron.ipcRenderer.invoke('worksService-saveWorks', args)
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
