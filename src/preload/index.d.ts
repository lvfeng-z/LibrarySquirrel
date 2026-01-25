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
      testListWorkSetWithWorkByIds: function

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
      localTagListByWorkId: function
      localTagQuerySelectItemPageByWorkId: function

      // OpenUrlInWindow
      getBrowserWindow: function

      // Plugin
      pluginQueryPage: function
      pluginInstallFromPath: function
      pluginReinstall: function
      pluginReinstallFromPath: function
      pluginUnInstall: function
      pluginListPluginListenerDTO: function

      // ReWorkTag
      reWorkTagLink: function
      reWorkTagUnlink: function

      // SearchService
      searchQuerySearchConditionPage: function
      searchQueryWorkPage: function

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
      siteTagQueryPageByWorkId: function
      siteTagQueryLocalRelateDTOPage: function
      siteTagQuerySelectItemPageByWorkId: function
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

      // Work
      workDeleteWorkAndSurroundingData: function
      workQueryPage: function
      workSaveWork: function
      workGetFullWorkInfoById: function

      // WorkSet
      workSetListWorkSetWithWorkByIds: function

      // FileSysUtil
      dirSelect: function
    }
  }
}
