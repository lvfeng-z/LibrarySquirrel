import Database from 'better-sqlite3'
import DatabaseUtil from '../util/DatabaseUtil.ts'
import DataBaseConstant from '../constant/DataBaseConstant.ts'
import LogUtil from '../util/LogUtil.ts'

// 定义连接池配置
export const POOL_CONFIG = {
  maxConnections: 10, // 最大连接数
  idleTimeout: 30000, // 连接空闲超时时间（毫秒）
  databasePath: DatabaseUtil.getDataBasePath() + DataBaseConstant.DB_FILE_NAME // 数据库文件路径
}

interface ConnectionPoolConfig {
  maxConnections: number
  idleTimeout: number
  databasePath: string
}

type WaitingRequest = { resolve: (connection: Database.Database) => void }

export class ConnectionPool {
  /**
   * 读取连接池还是写入连接池（true：读取，false：写入）
   * @private
   */
  private readonly readOrWrite: boolean
  /**
   * 配置
   * @private
   */
  private readonly config: ConnectionPoolConfig
  /**
   * 链接列表
   * @private
   */
  private connections: (Database.Database | undefined)[]
  /**
   * 链接额外数据列表
   * @private
   */
  private connectionExtra: { state: boolean; timeoutId?: NodeJS.Timeout }[]
  /**
   * 等待队列
   * @private
   */
  private connectionQueue: WaitingRequest[]
  /**
   * 是否写入锁定
   * @private
   */
  private visualLocked: boolean
  /**
   * 虚拟排它锁的请求队列
   * @private
   */
  private visualLockQueue: (() => void)[]

  constructor(readOrWrite: boolean, config: ConnectionPoolConfig) {
    this.readOrWrite = readOrWrite
    this.config = config
    this.connections = Array(this.config.maxConnections).fill(undefined)
    this.connectionExtra = []
    for (let index = 0; index < this.config.maxConnections; index++) {
      this.connectionExtra[index] = { state: false, timeoutId: undefined }
    }
    this.connectionQueue = []
    this.visualLocked = false
    this.visualLockQueue = []
  }

  /**
   * 获取连接
   */
  public async acquire(): Promise<Database.Database> {
    return new Promise((resolve, reject) => {
      try {
        let firstIdleIndex = -1
        // 遍历链接数组，寻找是否有可复用链接，并记录数组的第一个空闲索引
        for (let index = 0; index < this.config.maxConnections; index++) {
          if (this.connections[index] === undefined && firstIdleIndex === -1) {
            firstIdleIndex = index
          } else if (this.connectionExtra[index].state) {
            // 分配之前清除超时定时器
            clearTimeout(this.connectionExtra[index].timeoutId)
            this.connectionExtra[index].timeoutId = undefined
            LogUtil.debug(this.type(), `${index}号链接复用，清除定时器`)
            this.connectionExtra[index].state = false
            // this.log('链接复用')
            resolve(this.connections[index] as Database.Database)
            return
          }
        }
        // 如果遍历整个链接数组还没有找到可用的链接，尝试新增链接
        if (firstIdleIndex != -1) {
          this.connections[firstIdleIndex] = this.createConnection()
          resolve(this.connections[firstIdleIndex] as Database.Database)
          LogUtil.debug(this.type(), '在' + firstIdleIndex + '号新建链接')
          // this.log('新增链接')
          return
        } else {
          this.connectionQueue.push({ resolve })
          LogUtil.debug(
            this.type(),
            `连接池已满，当前等待队列+1，当前长度为：${this.connectionQueue.length}`
          )
        }
      } catch (e) {
        LogUtil.error(this.type(), '分配数据库连接时出现未知错误！' + String(e))
        reject(e)
      }
    })
  }

  /**
   * 释放链接
   * @param connection
   */
  public release(connection: Database.Database) {
    const connectionIndex = this.connections.indexOf(connection)
    const available = this.connectionExtra[connectionIndex].state
    if (available) {
      const msg = `释放${connectionIndex}号链接时出错，链接已经处于空闲状态`
      LogUtil.error(this.type(), msg)
      throw new Error()
    }
    // 如果等待队列不为空，从等待队列中取第一个分配链接，否则链接状态设置为空闲，并开启超时定时器
    if (this.connectionQueue.length > 0) {
      const request = this.connectionQueue.shift()
      if (request) {
        LogUtil.debug(
          this.type(),
          this.connections.indexOf(connection) +
            `号链接在释放时被复用，当前等待队列长度为：${this.connectionQueue.length}`
        )
        // this.log('链接复用')
        request.resolve(connection)
      }
    } else {
      const index = this.connections.indexOf(connection)
      this.connectionExtra[index].state = true
      LogUtil.debug(this.type(), `${this.connections.indexOf(connection)}号链接已释放`)
      this.setupIdleTimeout(index)
      // this.log('链接释放')
    }
  }

  /**
   * 获取虚拟锁
   */
  public async acquireVisualLock(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.visualLocked) {
        LogUtil.debug(this.type(), '虚拟锁已锁定')
        this.visualLocked = true
        resolve()
      } else {
        LogUtil.debug(this.type(), '虚拟锁处于锁定状态，进入等待队列')
        this.visualLockQueue.push(() => resolve())
      }
    })
  }

  /**
   * 释放虚拟锁
   */
  public releaseVisualLock(): void {
    if (this.visualLockQueue.length > 0) {
      LogUtil.debug(this.type(), '虚拟锁转交下一个请求者')
      const next = this.visualLockQueue.shift()
      if (next) {
        next()
      }
    } else {
      LogUtil.debug(this.type(), '释放虚拟锁')
      this.visualLocked = false
    }
  }

  /**
   * 创建一个新链接返回
   */
  private createConnection(): Database.Database {
    return new Database(this.config.databasePath)
  }

  /**
   * 设置空闲连接超时
   * @param index
   * @private
   */
  private setupIdleTimeout(index: number) {
    const idleTimeoutMilliseconds = this.config.idleTimeout
    // 超时定时器回调关闭链接函数
    const timeoutHandler = () => {
      this.closeConnection(index)
    }
    // 将定时器ID与连接关联，便于后续清理
    this.connectionExtra[index].timeoutId = setTimeout(timeoutHandler, idleTimeoutMilliseconds)
    LogUtil.debug(
      this.type(),
      `${index}号链接已设置定时器，timeoutId=${this.connectionExtra[index].timeoutId}`
    )
  }

  /**
   * 关闭指定的连接并更新连接池状态
   *
   * @param index 连接在connections数组中的索引
   */

  private closeConnection(index: number) {
    // 关闭链接后清理定时器
    clearTimeout(this.connectionExtra[index].timeoutId)
    this.connectionExtra[index].timeoutId = undefined
    LogUtil.debug(this.type(), `${index}号链接的定时器被清除`)
    // 关闭数据库连接
    const tempConnection = this.connections[index]
    if (tempConnection) {
      tempConnection.close()
    }
    // 更新连接状态和连接列表
    this.connectionExtra[index].state = false
    this.connections[index] = undefined
    LogUtil.debug(this.type(), `${index}号链接已超时关闭`)
    // this.log('链接关闭')
  }

  private type(): string {
    return this.readOrWrite ? 'readingConnectionPool' : 'writingConnectionPool'
  }

  // private log(msg: string) {
  //   console.log(msg)
  //   this.connections.forEach((connection, index) => {
  //     console.log(
  //       index,
  //       'haveConnection:',
  //       connection === undefined ? '×' : '√',
  //       'available:',
  //       this.connectionExtra[index].state ? '√' : '×',
  //       'timeoutId:',
  //       String(this.connectionExtra[index].timeoutId)
  //     )
  //   })
  // }
}

export default {
  ConnectionPool,
  POOL_CONFIG
}
