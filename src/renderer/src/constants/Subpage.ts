import { NotNullish } from '@renderer/utils/CommonUtil.ts'

export class SubpageState {
  readonly page: SubPageEnum
  state: boolean
  beforeClose?: () => Promise<boolean>

  constructor(page: SubPageEnum, state: boolean) {
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

export class SubpageStates {
  localTagManage = new SubpageState(SubPageEnum.LocalTagManage, false)
  siteTagManage = new SubpageState(SubPageEnum.SiteTagManage, false)
  localAuthorManage = new SubpageState(SubPageEnum.LocalAuthorManage, false)
  siteAuthorManage = new SubpageState(SubPageEnum.SiteAuthorManage, false)
  pluginManage = new SubpageState(SubPageEnum.PluginManage, false)
  siteManage = new SubpageState(SubPageEnum.SiteManage, false)
  taskManage = new SubpageState(SubPageEnum.TaskManage, false)
  settings = new SubpageState(SubPageEnum.Settings, false)
  developing = new SubpageState(SubPageEnum.Developing, false)
  test = new SubpageState(SubPageEnum.Test, false)
}

export enum SubPageEnum {
  LocalTagManage = 1,
  SiteTagManage = 2,
  LocalAuthorManage = 3,
  SiteAuthorManage = 4,
  PluginManage = 5,
  TaskManage = 6,
  Settings = 7,
  SiteManage = 8,
  Developing = 9,
  Test = 10
}
