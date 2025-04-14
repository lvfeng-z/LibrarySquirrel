export interface Settings extends Record<string, unknown> {
  initialized: boolean
  programVersion: string
  workdir: string
  worksSettings: {
    fileNameFormat: string
  }
  importSettings: {
    maxParallelImport: number
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
  }
}
