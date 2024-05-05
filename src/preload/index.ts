import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // LocalTagService
  localTagSave: (args) => {
    return ipcRenderer.invoke('localTag-save', args)
  },
  localTagQuery: (args) => {
    return ipcRenderer.invoke('localTag-query', args)
  },
  localTagGetSelectList: (args) => {
    return ipcRenderer.invoke('localTag-getSelectList', args)
  },

  // SiteService
  siteInsert: (args) => {
    return ipcRenderer.invoke('site-insert', args)
  },
  siteGetSelectList: (args) => {
    return ipcRenderer.invoke('site-getSelectList', args)
  },

  // SiteTagService
  siteTagSave: (args) => {
    return ipcRenderer.invoke('siteTag-save', args)
  },
  siteTagUpdateById: (args) => {
    return ipcRenderer.invoke('siteTag-updateById', args)
  },
  siteTagUpdateBindLocalTag: (localTagId: string | null, siteTagIds: string[]) => {
    return ipcRenderer.invoke('siteTag-updateBindLocalTag', localTagId, siteTagIds)
  },
  siteTagGetBoundOrUnboundInLocalTag: (args) => {
    return ipcRenderer.invoke('siteTag-getBoundOrUnboundInLocalTag', args)
  },
  siteTagGetSelectList: (args) => {
    return ipcRenderer.invoke('siteTag-getSelectList', args)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
