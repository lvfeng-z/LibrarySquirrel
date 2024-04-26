import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      // LocalTagService
      localTagInsert: function
      localTagQuery: function
      localTagGetSelectList: function

      // SiteService
      siteInsert: function
      siteGetSelectList: function

      // SiteTagService
      siteTagSave: function
      siteTagUpdateById: function
      siteTagGetSelectList: function
    }
  }
}
