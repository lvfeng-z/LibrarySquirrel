import { ElMessageBox } from 'element-plus'
import { PageEnum } from '@renderer/constants/PageState.ts'
import { usePageStatesStore } from '@renderer/store/UsePageStatesStore.ts'
import GotoPageConfig from '@renderer/model/util/GotoPageConfig.ts'
import { useTourStatesStore } from '@renderer/store/UseTourStatesStore.ts'

/**
 * 页面跳转
 * @param pageEnum
 */
export async function GotoPage(pageEnum: PageEnum) {
  const pageStatesStore = usePageStatesStore()
  switch (pageEnum) {
    case PageEnum.MainPage:
      return pageStatesStore.showPage(pageStatesStore.pageStates.mainPage)
    case PageEnum.SubPage:
      return pageStatesStore.showPage(pageStatesStore.pageStates.subPage)
    case PageEnum.LocalTagManage:
      return pageStatesStore.showPage(pageStatesStore.pageStates.localTagManage)
    case PageEnum.SiteTagManage:
      return pageStatesStore.showPage(pageStatesStore.pageStates.siteTagManage)
    case PageEnum.LocalAuthorManage:
      return pageStatesStore.showPage(pageStatesStore.pageStates.localAuthorManage)
    case PageEnum.SiteAuthorManage:
      return pageStatesStore.showPage(pageStatesStore.pageStates.siteAuthorManage)
    case PageEnum.PluginManage:
      return pageStatesStore.showPage(pageStatesStore.pageStates.pluginManage)
    case PageEnum.SiteManage:
      return pageStatesStore.showPage(pageStatesStore.pageStates.siteManage)
    case PageEnum.TaskManage:
      return pageStatesStore.showPage(pageStatesStore.pageStates.taskManage)
    case PageEnum.Settings:
      return pageStatesStore.showPage(pageStatesStore.pageStates.settings)
    case PageEnum.Guide:
      return pageStatesStore.showPage(pageStatesStore.pageStates.guide)
    case PageEnum.Developing:
      return pageStatesStore.showPage(pageStatesStore.pageStates.developing)
  }
}

/**
 * 页面跳转
 * @param config
 */
export function AskGotoPage(config: GotoPageConfig) {
  const pageStatesStore = usePageStatesStore()
  switch (config.page) {
    case PageEnum.SiteManage:
      pageStatesStore.pageStates.siteManage.setFocusOnDomains(config.extraData as string[])
  }
  ElMessageBox.alert(config.content, config.title, config.options).then(async () => GotoPage(config.page))
  switch (config.page) {
    case PageEnum.Settings:
      if (config.extraData as boolean) {
        useTourStatesStore().tourStates.startWorkdirTour()
      }
  }
}
