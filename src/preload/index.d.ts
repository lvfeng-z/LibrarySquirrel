import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      // test
      testInsertLocalTag10W: function

      // LocalTagService
      localTagSave: function
      localTagDeleteById: function
      localTagUpdateById: function
      localTagQueryPage: function
      localTagGetById: function
      localTagGetTree: function
      localTagGetSelectList: function

      // SettingsService
      settingsGetSettings: function

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
