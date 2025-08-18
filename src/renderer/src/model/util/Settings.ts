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

export const emptySettings: Settings = {
  initialized: false,
  programVersion: '',
  workdir: '',
  worksSettings: {
    fileNameFormat: '[${author}]_[${siteWorksId}]_${siteWorksName}'
  },
  importSettings: {
    maxParallelImport: 3
  },
  tour: {
    workdirTour: false,
    taskTour: false
  }
}
