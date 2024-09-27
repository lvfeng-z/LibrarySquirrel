import logUtil from './util/LogUtil.ts'
import { ConnectionPool, ConnectionPoolConfig } from './database/ConnectionPool.ts'
import Store from 'electron-store'
import { defaultSettings } from './util/SettingsUtil.ts'
import { TaskTracker } from './model/utilModels/TaskTracker.ts'
import { getDataBasePath } from './util/DatabaseUtil.ts'
import DataBaseConstant from './constant/DataBaseConstant.ts'

export enum GlobalVars {
  CONNECTION_POOL = 'CONNECTION_POOL',
  SETTINGS = 'SETTINGS',
  TASK_TRACKER = 'TASK_TRACKER'
}
// 映射类型
type GlobalVarsMapping = {
  [GlobalVars.CONNECTION_POOL]: ConnectionPool
  [GlobalVars.SETTINGS]: Store<Record<string, unknown>>
  [GlobalVars.TASK_TRACKER]: Record<string, TaskTracker>
}

const POOL_CONFIG: ConnectionPoolConfig = {
  maxRead: 10, // 最大连接数
  maxWrite: 10, // 最大连接数
  idleTimeout: 30000, // 连接空闲超时时间（毫秒）
  databasePath: getDataBasePath() + DataBaseConstant.DB_FILE_NAME // 数据库文件路径
}
export class GlobalVarManager {
  public static create(globalVar: GlobalVars) {
    switch (globalVar) {
      case GlobalVars.CONNECTION_POOL:
        this.createConnectionPool()
        break
      case GlobalVars.SETTINGS:
        this.createSettings()
        break
      case GlobalVars.TASK_TRACKER:
        this.createTaskTracker()
        break
    }
  }

  public static get<T extends GlobalVars>(globalVar: T): GlobalVarsMapping[T] {
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
      case GlobalVars.TASK_TRACKER:
        this.destroyTaskTracker()
        break
    }
  }

  // CONNECTION_POOL
  /**
   * 创建连接池
   */
  private static createConnectionPool() {
    global[GlobalVars.CONNECTION_POOL] = new ConnectionPool(POOL_CONFIG)
    logUtil.info('InitializeDataBase', '已创建读取连接池')
  }

  /**
   * 销毁连接池
   */
  private static destroyConnectionPool() {
    delete global[GlobalVars.CONNECTION_POOL]
    logUtil.info('InitializeDataBase', '已销毁读取连接池')
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
    logUtil.info('InitializeDataBase', '已创建设置')
  }

  /**
   * 销毁设置
   */
  private static destroySettings() {
    delete global[GlobalVars.SETTINGS]
    logUtil.info('InitializeDataBase', '已销毁设置')
  }

  // TASK_TRACKER
  /**
   * 创建任务追踪器
   */
  private static createTaskTracker() {
    global[GlobalVars.TASK_TRACKER] = {}
    logUtil.info('InitializeDataBase', '已创建任务追踪器')
  }

  /**
   * 销毁任务追踪器
   */
  private static destroyTaskTracker() {
    delete global[GlobalVars.TASK_TRACKER]
    logUtil.info('InitializeDataBase', '已销毁任务追踪器')
  }
}
