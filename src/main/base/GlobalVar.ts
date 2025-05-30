import LogUtil from '../util/LogUtil.ts'
import { ConnectionPool } from '../database/ConnectionPool.ts'
import Store from 'electron-store'
import { DefaultSettings } from '../util/SettingsUtil.ts'
import { PoolConfig } from '../database/PoolConfig.js'
import { TaskQueue } from './TaskQueue.js'
import { Settings } from '../model/util/Settings.js'
import { AppConfig } from '../model/util/AppConfig.js'
import fs from 'fs'
import yaml from 'js-yaml'
import appConfigYml from '../resources/config/appConfig.yml?asset'

export enum GlobalVars {
  APP_CONFIG = 'APP_CONFIG',
  CONNECTION_POOL = 'CONNECTION_POOL',
  MAIN_WINDOW = 'MAIN_WINDOW',
  SETTINGS = 'SETTINGS',
  TASK_QUEUE = 'TASK_QUEUE'
}
// 映射类型
type GlobalVarMapping = {
  [GlobalVars.APP_CONFIG]: AppConfig
  [GlobalVars.CONNECTION_POOL]: ConnectionPool
  [GlobalVars.MAIN_WINDOW]: Electron.BrowserWindow
  [GlobalVars.SETTINGS]: Store<Settings>
  [GlobalVars.TASK_QUEUE]: TaskQueue
}

// todo 设置更改时，一些全局变量也需要更改
export class GlobalVar {
  public static create(globalVar: GlobalVars, arg?: unknown) {
    switch (globalVar) {
      case GlobalVars.APP_CONFIG:
        this.createAppConfig()
        break
      case GlobalVars.CONNECTION_POOL:
        this.createConnectionPool()
        break
      case GlobalVars.MAIN_WINDOW:
        this.createMainWindow(arg as Electron.BrowserWindow)
        break
      case GlobalVars.SETTINGS:
        this.createSettings()
        break
      case GlobalVars.TASK_QUEUE:
        this.createTaskQueue()
        break
    }
  }

  public static get<T extends GlobalVars>(globalVar: T): GlobalVarMapping[T] {
    return global[globalVar as GlobalVars]
  }

  public static destroy(globalVar: GlobalVars) {
    switch (globalVar) {
      case GlobalVars.APP_CONFIG:
        this.destroyAppConfig()
        break
      case GlobalVars.CONNECTION_POOL:
        this.destroyConnectionPool()
        break
      case GlobalVars.SETTINGS:
        this.destroySettings()
        break
      case GlobalVars.TASK_QUEUE:
        this.destroyTaskQueue()
        break
    }
  }

  // APP_CONFIG
  /**
   * 创建APP_CONFIG
   */
  private static createAppConfig() {
    // 读取初始化yml
    try {
      const yamlContent = fs.readFileSync(appConfigYml, 'utf-8')
      global[GlobalVars.APP_CONFIG] = yaml.load(yamlContent)
      LogUtil.info('GlobalVar', '已创建APP_CONFIG')
    } catch (e) {
      LogUtil.error('InitializeDataBase', String(e))
      throw e
    }
  }

  /**
   * 销毁APP_CONFIG
   */
  private static destroyAppConfig() {
    delete global[GlobalVars.APP_CONFIG]
    LogUtil.info('GlobalVar', '已销毁APP_CONFIG')
  }

  // CONNECTION_POOL
  /**
   * 创建连接池
   */
  private static createConnectionPool() {
    global[GlobalVars.CONNECTION_POOL] = new ConnectionPool(PoolConfig)
    LogUtil.info('GlobalVar', '已创建连接池')
  }

  /**
   * 销毁连接池
   */
  private static destroyConnectionPool() {
    delete global[GlobalVars.CONNECTION_POOL]
    LogUtil.info('GlobalVar', '已销毁连接池')
  }

  // MAIN_WINDOW
  /**
   * 创建主窗口全局变量
   * @private
   */
  private static createMainWindow(mainWindow: Electron.BrowserWindow) {
    global[GlobalVars.MAIN_WINDOW] = mainWindow
  }

  // SETTINGS
  /**
   * 创建设置
   */
  private static createSettings() {
    const settings = new Store<Settings>()
    global[GlobalVars.SETTINGS] = settings
    if (!settings.get('initialized', false)) {
      DefaultSettings()
    }
    LogUtil.info('GlobalVar', '已创建设置')
  }

  /**
   * 销毁设置
   */
  private static destroySettings() {
    delete global[GlobalVars.SETTINGS]
    LogUtil.info('GlobalVar', '已销毁设置')
  }

  // TASK_QUEUE
  /**
   * 创建任务队列
   * @private
   */
  private static createTaskQueue() {
    global[GlobalVars.TASK_QUEUE] = new TaskQueue()
    LogUtil.info('GlobalVar', '已创建任务队列')
  }

  /**
   * 销毁任务队列
   * @private
   */
  private static destroyTaskQueue() {
    delete global[GlobalVars.TASK_QUEUE]
    LogUtil.info('GlobalVar', '已销毁任务队列')
  }
}
