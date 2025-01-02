export interface Settings extends Record<string, unknown> {
  initialized: boolean
  programVersion: string
  workdir: string
  importSettings: {
    maxParallelImport: number
  }
  plugin: {
    localImportPluginVersion: string
  }
}

export const emptySettings: Settings = {
  initialized: true,
  programVersion: '',
  workdir: '',
  importSettings: {
    maxParallelImport: 1
  },
  plugin: {
    localImportPluginVersion: ''
  }
}
