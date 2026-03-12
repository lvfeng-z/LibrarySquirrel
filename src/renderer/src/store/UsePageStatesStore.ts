import { defineStore } from 'pinia'
import { PageState, PageStates } from '@renderer/constants/PageState.ts'
import { notNullish } from '@shared/util/CommonUtil.ts'
import { useSlotRegistryStore } from '@renderer/store/SlotRegistryStore'

export const usePageStatesStore = defineStore('pageStates', {
  state: (): { pageStates: PageStates; currentPage: PageState; pluginViewId: string | null } => {
    const temp = new PageStates()
    return {
      pageStates: temp,
      currentPage: temp.mainPage,
      pluginViewId: null // 当前激活的插件视图 ID
    }
  },
  actions: {
    async showPage(page: PageState): Promise<void> {
      if (!this.pageStates.subPage.state) {
        page.state = true
        this.pageStates.subPage.state = true
        this.pageStates.mainPage.state = false
        this.currentPage = page
      } else {
        if (notNullish(this.currentPage)) {
          const closed = await this.currentPage.close()
          if (closed) {
            this.currentPage = page
            page.state = true
          }
        }
      }
    },
    async closePage(): Promise<void> {
      const closed = await this.currentPage.close()
      if (closed) {
        this.currentPage = this.pageStates.mainPage
        this.pageStates.subPage.state = false
        this.pageStates.mainPage.state = true
      }
    },

    // 切换到插件视图
    async showPluginView(viewId: string): Promise<boolean> {
      const slotStore = useSlotRegistryStore()
      const success = slotStore.switchView(viewId)
      if (success) {
        this.pluginViewId = viewId
        this.pageStates.mainPage.state = false
        this.pageStates.subPage.state = false
        return true
      }
      return false
    },

    // 返回主页
    async backToMainPage(): Promise<void> {
      const slotStore = useSlotRegistryStore()
      slotStore.clearActiveView()
      this.pluginViewId = null
      this.pageStates.mainPage.state = true
      this.pageStates.subPage.state = false
      this.currentPage = this.pageStates.mainPage
    },
    async waitPage(page: PageState): Promise<void> {
      return new Promise((resolve) => {
        this.$onAction(async (state) => {
          state.after(() => {
            if (this.currentPage === page) {
              resolve()
            }
          })
        })
      })
    }
  }
})
