import { Settings } from '../../model/util/Settings.js'
import ResFileNameFormatEnum from '../../constant/ResFileNameFormatEnum.js'

export const SettingsTemplate: Settings = {
  initialized: false,
  programVersion: '',
  workdir: '',
  worksSettings: {
    fileNameFormat: `[${ResFileNameFormatEnum.AUTHOR.token}]_[${ResFileNameFormatEnum.SITE_WORKS_ID.token}]_${ResFileNameFormatEnum.SITE_WORKS_NAME.token}`
  },
  importSettings: {
    maxParallelImport: 3
  },
  tour: {
    workdirTour: false,
    taskTour: false
  }
}
