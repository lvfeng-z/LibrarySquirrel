import { Settings } from '../../model/util/Settings.js'
import ResFileNameFormatEnum from '../../constant/ResFileNameFormatEnum.js'

export const SettingsTemplate: Settings = {
  initialized: false,
  programVersion: '',
  workdir: '',
  workSettings: {
    fileNameFormat: `[${ResFileNameFormatEnum.AUTHOR.token}]_[${ResFileNameFormatEnum.SITE_WORK_ID.token}]_${ResFileNameFormatEnum.SITE_WORK_NAME.token}`
  },
  importSettings: {
    maxParallelImport: 3
  },
  tour: {
    firstTimeTourPassed: false,
    workdirTour: false,
    taskTour: false
  }
}
