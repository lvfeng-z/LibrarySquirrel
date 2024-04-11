import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      tagLocalInsert: function
      tagLocalQuery: function
      tagLocalGetSelectList: function
    }
  }
}
