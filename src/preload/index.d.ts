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
      testPLimitTest: function
      testInstallPluginTest: function
      testMainWindowMsgTest: function

      // AppLauncher
      appLauncherOpenImage: function

      // AutoExplainPath
      autoExplainPathGetListenerPage: function
      autoExplainPathGetListenerList: function

      // LocalAuthor
      localAuthorSave: function
      localAuthorDeleteById: function
      localAuthorUpdateById: function
      localAuthorGetById: function
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

      // Plugin
      pluginQueryPage: function

      // ReWorksTag
      reWorksTagLink: function
      reWorksTagUnlink: function

      // SearchService
      searchQuerySearchConditionPage: function
      searchQueryWorksPage: function

      // Settings
      settingsGetSettings: function
      settingsSaveSettings: function
      settingsResetSettings: function

      // Site
      siteDeleteById: function
      siteQueryPage: function
      siteQuerySelectItemPage: function
      siteSave: function
      siteUpdateById: function

      // SiteDomainService
      siteDomainDeleteById: function
      siteDomainQueryPage: function
      siteDomainSave: function
      siteDomainUpdateById: function
      siteDomainQueryDTOPage: function
      siteDomainQueryDTOPageBySite: function

      // SiteAuthor
      siteAuthorUpdateBindLocalAuthor: function
      siteAuthorQueryBoundOrUnboundInLocalAuthorPage: function

      // SiteTag
      siteTagSave: function
      siteTagUpdateById: function
      siteTagUpdateBindLocalTag: function
      siteTagQueryBoundOrUnboundToLocalTagPage: function
      siteTagQueryPageByWorksId: function
      siteTagQuerySelectItemPageByWorksId: function
      siteTagGetSelectList: function

      // Task
      taskStartTaskTree: function
      taskRetryTaskTree: function
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
      worksMultipleConditionQueryPage: function
      worksSaveWorks: function
      worksGetFullWorksInfoById: function

      // FileSysUtil
      dirSelect: function
    }
  }
}
