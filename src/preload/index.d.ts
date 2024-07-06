import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      // test
      testInsertLocalTag10W: function
      testTransactionTest: function
      testTaskPluginListenerServiceSaveBatch: function
      testTaskPluginListenerServiceGetMonitored: function

      // LocalAuthorService
      localAuthorSave: function
      localAuthorDeleteById: function
      localAuthorUpdateById: function
      localAuthorGetById : function
      localAuthorSelectPage: function
      localAuthorGetSelectItems: function
      localAuthorGetSelectItemPage: function

      // LocalTag
      localTagSave: function
      localTagDeleteById: function
      localTagUpdateById: function
      localTagSelectPage: function
      localTagGetById: function
      localTagGetTree: function
      localTagGetSelectList: function
      localTagGetSelectItemPage: function

      // Settings
      settingsGetSettings: function
      settingsSaveSettings: function
      settingsResetSettings: function

      // Site
      siteGetSelectItemPage: function

      // SiteTag
      siteTagSave: function
      siteTagUpdateById: function
      siteTagUpdateBindLocalTag: function
      siteTagGetBoundOrUnboundInLocalTag: function
      siteTagGetSelectList: function

      // Task
      taskStartTask: function
      taskCreateTask: function

      // Works
      worksQueryPage: function
      worksSaveWorks: function
    }
  }
}
