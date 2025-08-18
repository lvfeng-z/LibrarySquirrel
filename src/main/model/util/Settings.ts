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
    workdirTour: boolean
    taskTour: boolean
  }
}
