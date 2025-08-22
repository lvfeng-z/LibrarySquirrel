import { ElMessageBox } from 'element-plus'
import { PageEnum } from '@renderer/constants/PageState.ts'
import { usePageStatesStore } from '@renderer/store/UsePageStatesStore.ts'
import GotoPageConfig from '@renderer/model/util/GotoPageConfig.ts'
import { useTourStatesStore } from '@renderer/store/UseTourStatesStore.ts'

/**
 * 页面跳转
 * @param config
 * @constructor
 */
export function GotoPage(config: GotoPageConfig) {
  const pageStatesStore = usePageStatesStore()
  ElMessageBox.alert(config.content, config.title, config.options).then(async () => {
    switch (config.page) {
      case PageEnum.Settings:
        await pageStatesStore.showPage(pageStatesStore.pageStates.settings)
        if (config.extraData as boolean) {
          useTourStatesStore().tourStates.startWorkdirTour()
        }
        break
      case PageEnum.SiteManage:
        pageStatesStore.pageStates.siteManage.setFocusOnDomains(config.extraData as string[])
        pageStatesStore.showPage(pageStatesStore.pageStates.siteManage)
        break
    }
  })
}
