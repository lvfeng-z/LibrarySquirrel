import { ElectronAPI } from '@electron-toolkit/preload'
import { GetBrowserWindow } from '../main/util/MainWindowUtil'

declare global {
  interface Window {
    electron: ElectronAPI & {
      onSlotRegister: (callback: (...args: unknown[]) => void) => void
      onSlotUnregister: (callback: (...args: unknown[]) => void) => void
      onSlotBatchRegister: (callback: (...args: unknown[]) => void) => void
      getAllSlots: () => Promise<unknown[]>
      pluginReadVueFile: (filePath: string) => Promise<unknown>
    }
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

      // PluginTaskUrlListenerManager
      pluginTaskUrlListenerManagerListListener: function

      // ReWorkTag
      reWorkTagLink: function
      reWorkTagUnlink: function

      // SearchService
      searchQuerySearchConditionPage: function
      searchQueryWorkPage: function
      searchQueryWorkSetPage: function

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

      // SiteAuthor
      siteAuthorUpdateBindLocalAuthor: function
      siteAuthorCreateAndBindSameNameLocalAuthor: function
      siteAuthorDeleteById: function
      siteAuthorSave: function
      siteAuthorUpdateById: function
      siteAuthorQueryBoundOrUnboundInLocalAuthorPage: function
      siteAuthorQueryLocalRelateDTOPage: function

      // SiteBrowser
      siteBrowserQueryPage: function
      siteBrowserOpen: function

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
      workSetQueryPageWithCover: function

      // ReWorkWorkSet
      reWorkWorkSetLinkBatchToWorkSet: function
      reWorkWorkSetRemoveBatchFromWorkSet: function
      reWorkWorkSetUpdateSortOrders: function
      reWorkWorkSetSetCover: function
      reWorkWorkSetUnsetCover: function
      reWorkWorkSetGetCoverWorkId: function

      // FileSysUtil
      dirSelect: function
    }
  }
}
