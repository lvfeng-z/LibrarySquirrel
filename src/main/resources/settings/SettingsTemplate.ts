import ResFileNameFormatEnum from '../../constant/ResFileNameFormatEnum.js'
import { Settings } from '@shared/model/base/Settings.ts'

export const SettingsTemplate: Settings = {
  initialized: false,
  programVersion: '',
  workdir: '',
  workSettings: {
    fileNameFormat: `[${ResFileNameFormatEnum.AUTHOR.token}]_[${ResFileNameFormatEnum.SITE_WORK_ID.token}]_${ResFileNameFormatEnum.SITE_WORK_NAME.token}`
  },
  importSettings: {
    maxParallelImport: 3,
    updateWorkInfoWhenImport: true
  },
  pluginSettings: {
    allowUnsafeEval: false
  },
  tour: {
    firstTimeTourPassed: false,
    workdirTour: false,
    taskTour: false
  }
}
