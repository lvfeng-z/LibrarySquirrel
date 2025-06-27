import { defineStore } from 'pinia'
import { PageState, PageStates } from '@renderer/constants/PageState.ts'
import { NotNullish } from '@renderer/utils/CommonUtil.ts'

export const usePageStatesStore = defineStore('pageStates', {
  state: (): { pageStates: PageStates; currentPage: PageState } => {
    const temp = new PageStates()
    return {
      pageStates: temp,
      currentPage: temp.mainPage
    }
  },
  actions: {
    async showPage(page: PageState): Promise<void> {
      if (!this.$state.pageStates.subPage.state) {
        page.state = true
        this.$state.pageStates.subPage.state = true
        this.$state.pageStates.mainPage.state = false
        this.$state.currentPage = page
      } else {
        if (NotNullish(this.$state.currentPage)) {
          const closed = await this.$state.currentPage.close()
          if (closed) {
            this.$state.currentPage = page
            page.state = true
          }
        }
      }
    },
    async closePage(): Promise<void> {
      const closed = await this.$state.currentPage.close()
      if (closed) {
        this.$state.currentPage = this.$state.pageStates.mainPage
        this.$state.pageStates.subPage.state = false
        this.$state.pageStates.mainPage.state = true
      }
    }
  }
})
