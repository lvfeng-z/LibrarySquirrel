import LogUtil from '../util/LogUtil.ts'
import { ConnectionPool } from '../database/ConnectionPool.ts'
import Store from 'electron-store'
import { defaultSettings } from '../util/SettingsUtil.ts'
import { PoolConfig } from './PoolConfig.js'
import { TaskQueue } from './TaskQueue.js'
import { Settings } from '../model/util/Settings.js'

export enum GlobalVars {
  CONNECTION_POOL = 'CONNECTION_POOL',
  MAIN_WINDOW = 'MAIN_WINDOW',
  SETTINGS = 'SETTINGS',
  TASK_QUEUE = 'TASK_QUEUE'
}
// 映射类型
type GlobalVarMapping = {
  [GlobalVars.CONNECTION_POOL]: ConnectionPool
  [GlobalVars.MAIN_WINDOW]: Electron.BrowserWindow
  [GlobalVars.SETTINGS]: Store<Settings>
  [GlobalVars.TASK_QUEUE]: TaskQueue
}

// todo 设置更改时，一些全局变量也需要更改
export class GlobalVar {
  public static create(globalVar: GlobalVars, arg?: unknown) {
    switch (globalVar) {
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
    const settings = new Store<Record<string, unknown>>()
    global[GlobalVars.SETTINGS] = settings
    if (!settings.get('initialized', false)) {
      defaultSettings()
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
