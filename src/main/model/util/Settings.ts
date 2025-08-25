export interface Settings {
  initialized: boolean
  programVersion: string
  workdir: string
  worksSettings: {
    fileNameFormat: string
  }
  importSettings: {
    maxParallelImport: number
  }
  tour: {
    firstTimeTourPassed: boolean
    workdirTour: boolean
    taskTour: boolean
  }
}
