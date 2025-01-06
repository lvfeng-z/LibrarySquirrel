export interface Settings extends Record<string, unknown> {
  initialized: boolean
  programVersion: string
  workdir: string
  importSettings: {
    maxParallelImport: number
  }
  initialization: {
    plugins: { packagePath: string; pathType: 'Relative' | 'Absolute' }[]
  }
}
