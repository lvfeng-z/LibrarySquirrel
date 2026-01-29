export interface Settings {
  initialized: boolean
  programVersion: string
  workdir: string
  workSettings: {
    fileNameFormat: string
  }
  importSettings: {
    maxParallelImport: number
    updateWorkInfoWhenImport: boolean
  }
  tour: {
    firstTimeTourPassed: boolean
    workdirTour: boolean
    taskTour: boolean
  }
}
