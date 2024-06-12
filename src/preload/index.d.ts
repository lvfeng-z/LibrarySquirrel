import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      // test
      testInsertLocalTag10W: function
      testTaskPluginListenerServiceSaveBatch: function
      testTaskPluginListenerServiceGetMonitored: function

      // LocalAuthorService
      localAuthorSelectPage: function
      localAuthorGetSelectItems: function
      localAuthorGetSelectItemPage: function

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
      settingsSaveSettings: function
      settingsResetSettings: function

      // SiteService
      siteInsert: function
      siteGetSelectList: function

      // SiteTagService
      siteTagSave: function
      siteTagUpdateById: function
      siteTagUpdateBindLocalTag: function
      siteTagGetBoundOrUnboundInLocalTag: function
      siteTagGetSelectList: function

      // TaskService
      taskServiceStartTask: function
      taskServiceCreateTask: function

      // WorksService
      worksQueryPage: function
    }
  }
}
