export interface IniConfig {
  sites: { name: string; description: string }[]
  plugins: { packagePath: string; pathType: 'Relative' | 'Absolute' }[]
}
