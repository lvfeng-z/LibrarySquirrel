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
      localAuthorQueryPage: function
      localAuthorListSelectItems: function
      localAuthorQuerySelectItemPage: function

      // LocalTag
      localTagSave: function
      localTagDeleteById: function
      localTagUpdateById: function
      localTagLink: function
      localTagQueryPage: function
      localTagGetById: function
      localTagGetTree: function
      localTagListSelectItems: function
      localTagQuerySelectItemPage: function
      localTagListByWorksId: function
      localTagQuerySelectItemPageByWorksId: function

      // ReWorksTag
      reWorksTagLink: function
      reWorksTagUnlink: function

      // Settings
      settingsGetSettings: function
      settingsSaveSettings: function
      settingsResetSettings: function

      // Site
      siteQuerySelectItemPage: function

      // SiteAuthor
      siteAuthorUpdateBindLocalAuthor: function
      siteAuthorQueryBoundOrUnboundInLocalAuthorPage: function

      // SiteTag
      siteTagSave: function
      siteTagUpdateById: function
      siteTagUpdateBindLocalTag: function
      siteTagQueryBoundOrUnboundToLocalTagPage: function
      siteTagGetSelectList: function

      // Task
      taskStartTask: function
      taskRetryTask: function
      taskCreateTask: function
      taskDeleteTask: function
      taskQueryPage: function
      taskQueryParentPage: function
      taskQueryTreeDataPage: function
      taskListChildrenTask: function
      taskQueryChildrenTaskPage: function
      taskListSchedule: function
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
