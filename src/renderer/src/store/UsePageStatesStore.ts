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
      if (!this.pageStates.subPage.state) {
        page.state = true
        this.pageStates.subPage.state = true
        this.pageStates.mainPage.state = false
        this.currentPage = page
      } else {
        if (NotNullish(this.currentPage)) {
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
    }
  }
})
