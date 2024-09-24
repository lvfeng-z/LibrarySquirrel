import { ElectronAPI } from '@electron-toolkit/preload'
import { futimes } from 'node:fs'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      // test
      testInsertLocalTag10W: function
      testTransactionTest: function
      testTaskPluginListenerServiceSaveBatch: function
      testTaskPluginListenerServiceGetMonitored: function
      testPLimitTest: function

      // AutoExplainPath
      autoExplainPathGetListenerPage: function
      autoExplainPathGetListenerList: function

      // LocalAuthor
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
      localTagListSelectItemPageByWorksId: function

      // Settings
      settingsGetSettings: function
      settingsSaveSettings: function
      settingsResetSettings: function

      // Site
      siteGetSelectItemPage: function

      // SiteAuthor
      siteAuthorUpdateBindLocalAuthor: function
      siteAuthorGetBoundOrUnboundInLocalAuthor: function

      // SiteTag
      siteTagSave: function
      siteTagUpdateById: function
      siteTagUpdateBindLocalTag: function
      siteTagGetBoundOrUnboundInLocalTag: function
      siteTagGetSelectList: function

      // Task
      taskStartTask: function
      taskRetryTask: function
      taskCreateTask: function
      taskDeleteTask: function
      taskSelectPage: function
      taskSelectParentPage: function
      taskSelectTreeDataPage: function
      taskGetChildrenTask: function
      taskSelectChildrenTaskPage: function
      taskSelectScheduleList: function
      taskPauseTaskTree: function
      taskResumeTaskTree: function

      // Works
      worksQueryPage: function
      worksSaveWorks: function
      worksGetFullWorksInfoById: function

      // FileSysUtil
      dirSelect: function
    }
  }
}
