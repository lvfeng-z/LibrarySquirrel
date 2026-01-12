import { ElectronAPI } from '@electron-toolkit/preload'
import { GetBrowserWindow } from '../main/util/MainWindowUtil'

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
      testGotoPageSiteManage: function
      testListWorksSetWithWorksByIds: function

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
      localTagQueryDTOPage: function
      localTagGetById: function
      localTagGetTree: function
      localTagListSelectItems: function
      localTagQuerySelectItemPage: function
      localTagListByWorksId: function
      localTagQuerySelectItemPageByWorksId: function

      // OpenUrlInWindow
      getBrowserWindow: function

      // Plugin
      pluginQueryPage: function
      pluginInstallFromPath: function
      pluginReinstall: function
      pluginReinstallFromPath: function
      pluginUnInstall: function
      pluginListPluginListenerDTO: function

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
      siteAuthorCreateAndBindSameNameLocalAuthor: function
      siteAuthorDeleteById: function
      siteAuthorSave: function
      siteAuthorUpdateById: function
      siteAuthorQueryBoundOrUnboundInLocalAuthorPage: function
      siteAuthorQueryLocalRelateDTOPage: function

      // SiteTag
      siteTagSave: function
      siteTagCreateAndBindSameNameLocalTag: function
      siteTagDeleteById: function
      siteTagUpdateById: function
      siteTagUpdateBindLocalTag: function
      siteTagQueryPage: function
      siteTagQueryBoundOrUnboundToLocalTagPage: function
      siteTagQueryPageByWorksId: function
      siteTagQueryLocalRelateDTOPage: function
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
      taskListStatus: function
      taskListSchedule: function
      taskPauseTaskTree: function
      taskStopTaskTree: function
      taskResumeTaskTree: function

      // Works
      worksDeleteWorksAndSurroundingData: function
      worksQueryPage: function
      worksSaveWorks: function
      worksGetFullWorksInfoById: function

      // WorksSet
      worksSetListWorksSetWithWorksByIds: function

      // FileSysUtil
      dirSelect: function
    }
  }
}
