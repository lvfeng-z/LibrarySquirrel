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
      localTagSelectPage: function
      localTagGetById: function
      localTagGetTree: function
      localTagGetSelectList: function
      localTagGetSelectItemPage: function

      // SettingsService
      settingsGetSettings: function
      settingsSaveSettings: function
      settingsResetSettings: function

      // SiteService
      siteGetSelectItemPage: function

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
      worksServiceSaveWorks: function
    }
  }
}
