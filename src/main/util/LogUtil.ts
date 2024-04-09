import log from 'electron-log'
import path from 'path'
import { app } from 'electron'
import LogConstant from '../constant/LogConstant'
import FileSysUtil from './FileSysUtil'

function info(module: string, msg: string) {
  log.info(module, ':', msg)
}

function debug(module: string, msg: string) {
  log.debug(module, ':', msg)
}

function warn(module: string, msg: string) {
  log.warn(module, ':', msg)
}

function error(module: string, msg: string) {
  log.error(module, ':', msg)
}

function setLogPath() {
  let logPath: string
  const NODE_ENV = process.env.NODE_ENV
  if (NODE_ENV == 'development') {
    logPath = path.join(app.getAppPath(), LogConstant.LOG_PATH)
  } else {
    logPath = path.join(path.dirname(app.getPath('exe')), LogConstant.LOG_PATH)
  }

  FileSysUtil.createDirIfNotExists(logPath)

  log.transports.file.resolvePathFn = () => logPath + LogConstant.LOG_FILL_NAME
}

export default {
  info,
  debug,
  warn,
  error,
  setLogPath
}
