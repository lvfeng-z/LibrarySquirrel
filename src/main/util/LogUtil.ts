import log from 'electron-log'
import path from 'path'
import Electron from 'electron'
import LogConstant from '../constant/LogConstant.ts'
import FileSysUtil from './FileSysUtil.ts'

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

function initializeLogSetting() {
  let logPath: string
  const NODE_ENV = process.env.NODE_ENV
  if (NODE_ENV == 'development') {
    logPath = path.join(Electron.app.getAppPath(), LogConstant.LOG_PATH)
  } else {
    logPath = path.join(path.dirname(Electron.app.getPath('exe')), LogConstant.LOG_PATH)
    log.transports.file.level = 'info' // 设置文件日志的级别为 info 或更高
    log.transports.console.level = 'info' // 设置控制台日志的级别为 info 或更高
  }

  FileSysUtil.createDirIfNotExists(logPath)

  log.transports.file.resolvePathFn = () => logPath + LogConstant.LOG_FILL_NAME
}

export default {
  info,
  debug,
  warn,
  error,
  initializeLogSetting
}
