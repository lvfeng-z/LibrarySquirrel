import LogUtil from '../util/LogUtil.ts'
import { ConnectionPool } from '../database/ConnectionPool.ts'
import ElectronStore from 'electron-store'
import { DefaultSettings } from '../util/SettingsUtil.ts'
import { PoolConfig } from '../database/PoolConfig.js'
import { TaskQueue } from './TaskQueue.js'
import { Settings } from '../model/util/Settings.js'
import { IniConfig } from '../model/util/IniConfig.js'
import yaml from 'js-yaml'
import fs from 'fs'

export enum GVarEnum {
  INI_CONFIG = 'INI_CONFIG',
  CONNECTION_POOL = 'CONNECTION_POOL',
  MAIN_WINDOW = 'MAIN_WINDOW',
  SETTINGS = 'SETTINGS',
  TASK_QUEUE = 'TASK_QUEUE'
}
// 映射类型
type GlobalVarMapping = {
  [GVarEnum.INI_CONFIG]: IniConfig
  [GVarEnum.CONNECTION_POOL]: ConnectionPool
  [GVarEnum.MAIN_WINDOW]: Electron.BrowserWindow
  [GVarEnum.SETTINGS]: ElectronStore<Settings>
  [GVarEnum.TASK_QUEUE]: TaskQueue
}

// todo 设置更改时，一些全局变量也需要更改
export class GVar {
  public static create(globalVar: GVarEnum, arg?: unknown) {
    switch (globalVar) {
      case GVarEnum.INI_CONFIG:
        this.createIniConfig(arg as string)
        break
      case GVarEnum.CONNECTION_POOL:
        this.createConnectionPool()
        break
      case GVarEnum.MAIN_WINDOW:
        this.createMainWindow(arg as Electron.BrowserWindow)
        break
      case GVarEnum.SETTINGS:
        this.createSettings()
        break
      case GVarEnum.TASK_QUEUE:
        this.createTaskQueue()
        break
    }
  }

  public static get<T extends GVarEnum>(globalVar: T): GlobalVarMapping[T] {
    return global[globalVar as GVarEnum]
  }

  public static destroy(globalVar: GVarEnum) {
    switch (globalVar) {
      case GVarEnum.INI_CONFIG:
        this.destroyIniConfig()
        break
      case GVarEnum.CONNECTION_POOL:
        this.destroyConnectionPool()
        break
      case GVarEnum.SETTINGS:
        this.destroySettings()
        break
      case GVarEnum.TASK_QUEUE:
        this.destroyTaskQueue()
        break
    }
  }

  // INI_CONFIG
  /**
   * 创建INI_CONFIG
   * @param iniConfigFilePath 初始化配置文件路径
   */
  private static createIniConfig(iniConfigFilePath: string) {
    // 读取初始化yml
    try {
      const yamlContent = fs.readFileSync(iniConfigFilePath, 'utf-8')
      global[GVarEnum.INI_CONFIG] = yaml.load(yamlContent)
      LogUtil.info('GlobalVar', '已创建INI_CONFIG')
    } catch (e) {
      LogUtil.error('InitializeDataBase', String(e))
      throw e
    }
  }

  /**
   * 销毁INI_CONFIG
   */
  private static destroyIniConfig() {
    delete global[GVarEnum.INI_CONFIG]
    LogUtil.info('GlobalVar', '已销毁INI_CONFIG')
  }

  // CONNECTION_POOL
  /**
   * 创建连接池
   */
  private static createConnectionPool() {
    global[GVarEnum.CONNECTION_POOL] = new ConnectionPool(PoolConfig)
    LogUtil.info('GlobalVar', '已创建连接池')
  }

  /**
   * 销毁连接池
   */
  private static destroyConnectionPool() {
    delete global[GVarEnum.CONNECTION_POOL]
    LogUtil.info('GlobalVar', '已销毁连接池')
  }

  // MAIN_WINDOW
  /**
   * 创建主窗口全局变量
   * @private
   */
  private static createMainWindow(mainWindow: Electron.BrowserWindow) {
    global[GVarEnum.MAIN_WINDOW] = mainWindow
  }

  // SETTINGS
  /**
   * 创建设置
   */
  private static createSettings() {
    const settings = new ElectronStore<Settings>()
    global[GVarEnum.SETTINGS] = settings
    if (!settings.get('initialized')) {
      DefaultSettings()
    }
    LogUtil.info('GlobalVar', '已创建设置')
  }

  /**
   * 销毁设置
   */
  private static destroySettings() {
    delete global[GVarEnum.SETTINGS]
    LogUtil.info('GlobalVar', '已销毁设置')
  }

  // TASK_QUEUE
  /**
   * 创建任务队列
   * @private
   */
  private static createTaskQueue() {
    global[GVarEnum.TASK_QUEUE] = new TaskQueue()
    LogUtil.info('GlobalVar', '已创建任务队列')
  }

  /**
   * 销毁任务队列
   * @private
   */
  private static destroyTaskQueue() {
    delete global[GVarEnum.TASK_QUEUE]
    LogUtil.info('GlobalVar', '已销毁任务队列')
  }
}
