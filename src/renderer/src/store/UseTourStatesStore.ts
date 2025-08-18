import { defineStore } from 'pinia'
import { Settings } from '@renderer/model/util/Settings.ts'
import mitt, { Emitter } from 'mitt'
import ApiUtil from '@renderer/utils/ApiUtil.ts'
import { GotoPage } from '@renderer/utils/PageUtil.ts'
import { PageEnum } from '@renderer/constants/PageState.ts'
import { usePageStatesStore } from '@renderer/store/UsePageStatesStore.ts'

export const useTourStatesStore = defineStore('tourStates', {
  state: (): { tourStates: TourStates } => {
    const getSettings = async (): Promise<Settings> => {
      const response = await window.api.settingsGetSettings()
      if (ApiUtil.check(response)) {
        return ApiUtil.data(response) as Settings
      } else {
        throw new Error('获取设置失败')
      }
    }
    return { tourStates: new TourStates(getSettings, window.api.settingsSaveSettings) }
  }
})

export class TourStates {
  /**
   * 工作目录向导开关
   */
  workdirTour: boolean

  /**
   * 任务向导开关
   */
  taskTour: boolean

  emitter: Emitter<{
    workdirTour: void
    taskTour: void
  }>

  settingGetter: () => Promise<Settings>
  settingSetter: () => Promise<void>

  constructor(settingGetter: () => Promise<Settings>, settingSetter: () => Promise<void>) {
    this.workdirTour = false
    this.taskTour = false
    this.emitter = mitt()
    this.settingGetter = settingGetter
    this.settingSetter = settingSetter
  }

  public getCallback(eventName: TourEvents) {
    this.emitter.emit(eventName)
  }

  public async newUserGuidingProcess() {
    const settings = await this.settingGetter()
    const tourSettings = settings.tour
    if (!tourSettings.workdirTour) {
      GotoPage({
        page: PageEnum.Settings,
        title: '请设置工作目录',
        content: 'LibrarySquirrel需要工作目录才能正常使用',
        options: {
          confirmButtonText: '去设置',
          cancelButtonText: '取消',
          type: 'warning',
          showClose: false
        }
      })
      const tempPromise = this.waitUserFinish('workdirTour')
      this.workdirTour = true
      await tempPromise
    }
    const unsubscribe = usePageStatesStore().$onAction(async (state) => {
      if (!this.taskTour && (state.name === 'closePage' || (state.name === 'showPage' && state.args[0].page === PageEnum.MainPage))) {
        const tempPromise = this.waitUserFinish('taskTour')
        this.taskTour = true
        await tempPromise
        unsubscribe()
      }
    })
  }

  private async waitUserFinish(eventName: TourEvents) {
    let tempResolve: () => void
    const waitFinish: Promise<void> = new Promise((resolve) => (tempResolve = resolve))
    this.emitter.on(eventName, () => tempResolve())
    return waitFinish
  }
}

export type TourEvents = 'workdirTour' | 'taskTour'
