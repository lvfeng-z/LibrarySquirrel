import { defineStore } from 'pinia'

export const useTourStatesStore = defineStore('tourStates', {
  state: (): { tourStates: TourStates } => {
    return { tourStates: new TourStates() }
  }
})

export class TourStates {
  /**
   * 工作目录向导开关
   */
  workdirTour: boolean

  constructor() {
    this.workdirTour = false
  }
}
