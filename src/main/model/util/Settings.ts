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
