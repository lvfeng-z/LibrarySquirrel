import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      // LocalTagService
      localTagInsert: function
      localTagQuery: function
      localTagGetSelectList: function

      // SiteTagService
      siteTagInsert: function
      siteTagQuery: function
      siteTagGetSelectList: function
    }
  }
}
