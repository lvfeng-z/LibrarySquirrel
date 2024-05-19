import Electron from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // test
  testInsertLocalTag10W: (args) => {
    return Electron.ipcRenderer.invoke('test-insertLocalTag10W', args)
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
  localTagQueryPage: (args) => {
    return Electron.ipcRenderer.invoke('localTag-queryPage', args)
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

  // SiteService
  siteInsert: (args) => {
    return Electron.ipcRenderer.invoke('site-insert', args)
  },
  siteGetSelectList: (args) => {
    return Electron.ipcRenderer.invoke('site-getSelectList', args)
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
