export interface Settings {
  initialized: boolean
  programVersion: string
  workdir: string
  importSettings: {
    maxParallelImport: number
  }
}
