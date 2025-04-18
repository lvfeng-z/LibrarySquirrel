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
  developing = new SubpageState(SubPageEnum.Developing, false)
  localAuthorManage = new SubpageState(SubPageEnum.LocalAuthorManage, false)
  localTagManage = new SubpageState(SubPageEnum.LocalTagManage, false)
  pluginManage = new SubpageState(SubPageEnum.PluginManage, false)
  settings = new SubpageState(SubPageEnum.Settings, false)
  siteManage = new SubpageState(SubPageEnum.SiteManage, false)
  siteTagManage = new SubpageState(SubPageEnum.SiteTagManage, false)
  taskManage = new SubpageState(SubPageEnum.TaskManage, false)
}

export enum SubPageEnum {
  LocalTagManage = 1,
  SiteTagManage = 2,
  LocalAuthorManage = 3,
  PluginManage = 4,
  TaskManage = 5,
  Settings = 6,
  SiteManage = 7,
  Developing = 8,
  Test = 9
}
