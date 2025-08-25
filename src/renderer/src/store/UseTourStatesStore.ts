import { defineStore } from 'pinia'
import { Settings } from '@renderer/model/util/Settings.ts'
import mitt, { Emitter } from 'mitt'
import ApiUtil from '@renderer/utils/ApiUtil.ts'
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
   * 向导页菜单向导开关
   */
  guideMenuTour: boolean

  /**
   * 工作目录向导开关
   */
  workdirTour: boolean

  /**
   * 任务菜单向导开关
   */
  taskMenuTour: boolean

  /**
   * 任务向导开关
   */
  taskTour: boolean

  emitter: Emitter<{
    guideMenuTour: void
    workdirTour: void
    taskMenuTour: void
    taskTour: void
  }>

  settingGetter: () => Promise<Settings>
  settingSetter: () => Promise<void>

  constructor(settingGetter: () => Promise<Settings>, settingSetter: () => Promise<void>) {
    this.guideMenuTour = false
    this.workdirTour = false
    this.taskMenuTour = false
    this.taskTour = false
    this.emitter = mitt()
    this.settingGetter = settingGetter
    this.settingSetter = settingSetter
  }

  public getCallback(eventName: TourEvents) {
    this.emitter.emit(eventName)
  }

  public async startWorkdirTour() {
    this.workdirTour = true
  }

  public async startTaskTour() {
    this.taskMenuTour = true
    const step1 = this.waitUserFinish('taskMenuTour')
    const step2 = usePageStatesStore().waitPage(usePageStatesStore().pageStates.taskManage)
    await Promise.all([step1, step2])
    this.taskTour = true
  }

  private async waitUserFinish(eventName: TourEvents) {
    let tempResolve: () => void
    const waitFinish: Promise<void> = new Promise((resolve) => (tempResolve = resolve))
    this.emitter.on(eventName, () => tempResolve())
    return waitFinish
  }
}

export type TourEvents = 'guideMenuTour' | 'workdirTour' | 'taskMenuTour' | 'taskTour'
