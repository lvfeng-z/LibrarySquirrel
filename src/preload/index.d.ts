import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      // LocalTagService
      localTagSave: function
      localTagDeleteById: function
      localTagUpdateById: function
      localTagQuery: function
      localTagGetById: function
      localTagGetSelectList: function

      // SiteService
      siteInsert: function
      siteGetSelectList: function

      // SiteTagService
      siteTagSave: function
      siteTagUpdateById: function
      siteTagUpdateBindLocalTag: function
      siteTagGetBoundOrUnboundInLocalTag: function
      siteTagGetSelectList: function
    }
  }
}
