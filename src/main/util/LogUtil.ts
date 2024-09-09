import log from 'electron-log'
import path from 'path'
import LogConstant from '../constant/LogConstant.ts'
import { getRootDir } from './FileSysUtil.ts'

function info(module: string, msg: unknown, ...args: unknown[]) {
  if (args !== undefined && args.length > 0) {
    log.info(module, ':', msg, args)
  } else {
    log.info(module, ':', msg)
  }
}

function debug(module: string, msg: unknown, ...args: unknown[]) {
  if (args !== undefined && args.length > 0) {
    log.debug(module, ':', msg, args)
  } else {
    log.debug(module, ':', msg)
  }
}

function warn(module: string, msg: unknown, ...args: unknown[]) {
  if (args !== undefined && args.length > 0) {
    log.warn(module, ':', msg, args)
  } else {
    log.warn(module, ':', msg)
  }
}

function error(module: string, msg: unknown, ...args: unknown[]) {
  if (args !== undefined && args.length > 0) {
    log.error(module, ':', msg, args)
  } else {
    log.error(module, ':', msg)
  }
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
