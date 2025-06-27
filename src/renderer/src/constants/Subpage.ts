import { NotNullish } from '@renderer/utils/CommonUtil.ts'

export class PageState {
  readonly page: PageEnum
  state: boolean
  beforeClose?: () => Promise<boolean>

  constructor(page: PageEnum, state: boolean) {
    this.page = page
    this.state = state
  }

  async close(): Promise<boolean> {
    if (NotNullish(this.beforeClose)) {
      const closed = await this.beforeClose()
      if (closed) {
        this.state = false
        return true
      }
    } else {
      this.state = false
      return true
    }
    return false
  }

  setBeforeClose(beforeClose: () => Promise<boolean>) {
    this.beforeClose = beforeClose
  }
}

export class PageStates {
  mainPage = new PageState(PageEnum.MainPage, true)
  subPage = new PageState(PageEnum.SubPage, false)
  localTagManage = new PageState(PageEnum.LocalTagManage, false)
  siteTagManage = new PageState(PageEnum.SiteTagManage, false)
  localAuthorManage = new PageState(PageEnum.LocalAuthorManage, false)
  siteAuthorManage = new PageState(PageEnum.SiteAuthorManage, false)
  pluginManage = new PageState(PageEnum.PluginManage, false)
  siteManage = new PageState(PageEnum.SiteManage, false)
  taskManage = new PageState(PageEnum.TaskManage, false)
  settings = new PageState(PageEnum.Settings, false)
  developing = new PageState(PageEnum.Developing, false)
  test = new PageState(PageEnum.Test, false)
}

export enum PageEnum {
  MainPage = 1,
  SubPage = 2,
  LocalTagManage = 3,
  SiteTagManage = 4,
  LocalAuthorManage = 5,
  SiteAuthorManage = 6,
  PluginManage = 7,
  TaskManage = 8,
  Settings = 9,
  SiteManage = 10,
  Developing = 11,
  Test = 12
}
