import { Settings } from '../../model/util/Settings.js'
import ResFileNameFormatEnum from '../../constant/ResFileNameFormatEnum.js'

export const SettingsTemplate: Settings = {
  initialized: false,
  programVersion: '',
  workdir: '',
  worksSettings: {
    fileNameFormat: `[${ResFileNameFormatEnum.AUTHOR}]_[${ResFileNameFormatEnum.SITE_WORKS_ID}]_${ResFileNameFormatEnum.SITE_WORKS_NAME}`
  },
  importSettings: {
    maxParallelImport: 3
  }
}
