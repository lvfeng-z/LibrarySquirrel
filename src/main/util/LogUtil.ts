import log from 'electron-log'
import path from 'path'
import LogConstant from '../constant/LogConstant.ts'
import { getRootDir } from './FileSysUtil.ts'

function info(module: string, ...args: unknown[]) {
  log.info(module, ':', ...args)
}

function debug(module: string, ...args: unknown[]) {
  log.debug(module, ':', ...args)
}

function warn(module: string, ...args: unknown[]) {
  log.warn(module, ':', args)
}

function error(module: string, ...args: unknown[]) {
  log.error(module, ':', args)
}

/**
 * 初始化日志工具配置
 */
function initializeLogSetting() {
  const NODE_ENV = process.env.NODE_ENV
  if (NODE_ENV == 'development') {
    log.transports.file.level = 'debug' // 设置文件日志的级别为 debug 或更高
    log.transports.console.level = 'debug' // 设置控制台日志的级别为 debug 或更高
  } else {
    log.transports.file.level = 'info' // 设置文件日志的级别为 info 或更高
    log.transports.console.level = 'info' // 设置控制台日志的级别为 info 或更高
  }
  const logPath = path.join(getRootDir(), LogConstant.LOG_PATH)
  log.transports.file.resolvePathFn = () => logPath + LogConstant.LOG_FILL_NAME
}

export default {
  info,
  debug,
  warn,
  error,
  initializeLogSetting
}
