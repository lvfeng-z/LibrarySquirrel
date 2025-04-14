import { Settings } from '../../model/util/Settings.js'

export const SettingsTemplate: Settings = {
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
