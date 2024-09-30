import Database from 'better-sqlite3'
import LogUtil from '../util/LogUtil.ts'

export interface ConnectionPoolConfig {
  maxRead: number
  maxWrite: number
  idleTimeout: number
  databasePath: string
}

export enum RequestWeight {
  CRITICAL = 5,
  HIGH = 4,
  MEDIUM = 3,
  LOW = 2,
  TRIVIAL = 1
}

export class Connection {
  connection: Database.Database
  index: number
  readonly: boolean
  occupied: boolean
  occupyStart: number
  holdingWriteLock: boolean
  release: (...args: unknown[]) => void
  timeoutId: NodeJS.Timeout | undefined

  constructor(
    filename: string,
    index: number,
    readonly: boolean,
    release: (...args: unknown[]) => void
  ) {
    this.connection = new Database(filename)
    this.index = index
    this.readonly = readonly
    this.occupied = false
    this.occupyStart = Math.floor(Date.now() / 1000)
    this.holdingWriteLock = false
    this.release = release
    this.timeoutId = undefined
  }

  public refreshOccupyStart() {
    this.occupyStart = Math.floor(Date.now() / 1000)
  }
}

type WaitingRequest = {
  requestWeigh: RequestWeight
  resolve: (connection: Connection) => void
}

export class ConnectionPool {
  /**
   * 配置
   * @private
   */
  private readonly config: ConnectionPoolConfig
  /**
   * 链接列表
   * @private
   */
  private readConnections: (Connection | undefined)[]
  /**
   * 链接列表
   * @private
   */
  private writeConnections: (Connection | undefined)[]
  /**
   * 等待队列
   * @private
   */
  private readWaitingQueue: WaitingRequest[]
  /**
   * 等待队列
   * @private
   */
  private writeWaitingQueue: WaitingRequest[]
  /**
   * 是否写入锁定
   * @private
   */
  private writeLocked: boolean
  /**
   * 虚拟排他锁的请求队列
   * @private
   */
  private writeLockQueue: (() => void)[]

  constructor(config: ConnectionPoolConfig) {
    this.config = config
    this.readConnections = Array(this.config.maxRead).fill(undefined)
    this.writeConnections = Array(this.config.maxWrite).fill(undefined)
    this.readWaitingQueue = []
    this.writeWaitingQueue = []
    this.writeLocked = false
    this.writeLockQueue = []
  }

  /**
   * 获取连接
   */
  public async acquire(readonly: boolean, requestWeigh: RequestWeight): Promise<Connection> {
    return new Promise((resolve, reject) => {
      try {
        const connectionArray = readonly ? this.readConnections : this.writeConnections
        // 遍历链接数组，寻找是否有可复用链接，并记录数组的第一个空闲索引
        let firstIdleIndex = -1
        for (let index = 0; index < connectionArray.length; index++) {
          const connection = connectionArray[index]
          if (connection === undefined && firstIdleIndex === -1) {
            firstIdleIndex = index
          } else if (connection !== undefined && !connection.occupied) {
            // 分配之前清除空闲计时
            clearTimeout(connection.timeoutId)
            connection.timeoutId = undefined
            LogUtil.debug(
              `ConnectionPool.${readonly ? 'read' : 'write'}`,
              `[${index}]链接复用，清除空闲计时`
            )
            connection.occupied = true
            connection.refreshOccupyStart()
            resolve(connection)
            return
          }
        }
        // 如果遍历整个链接数组还没有找到可用的链接，尝试新增链接
        if (firstIdleIndex != -1) {
          const newConnection = this.createConnection(readonly, firstIdleIndex)
          newConnection.occupied = true
          connectionArray[firstIdleIndex] = newConnection
          resolve(newConnection)
          LogUtil.debug(
            `ConnectionPool.${readonly ? 'read' : 'write'}`,
            `[${firstIdleIndex}]新建链接`
          )
          return
        }
        if (readonly) {
          this.readWaitingQueue.push({ requestWeigh: requestWeigh, resolve: resolve })
        } else {
          this.writeWaitingQueue.push({ requestWeigh: requestWeigh, resolve: resolve })
        }
      } catch (e) {
        LogUtil.error(
          `ConnectionPool.${readonly ? 'read' : 'write'}`,
          '分配数据库连接时出现未知错误！' + String(e)
        )
        reject(e)
      }
    })
  }

  /**
   * 释放链接
   * @param readonly
   * @param index
   */
  public release(readonly: boolean, index: number) {
    const connectionArray = readonly ? this.readConnections : this.writeConnections
    const waitingQueue = readonly ? this.readWaitingQueue : this.writeWaitingQueue
    const connection = connectionArray[index]
    if (connection === undefined) {
      LogUtil.error(
        `ConnectionPool.${readonly ? 'read' : 'write'}-${index}`,
        `[${index}]释放链接时出错，链接为空`
      )
      return
    }
    if (!connection.occupied) {
      LogUtil.error(
        `ConnectionPool.${readonly ? 'read' : 'write'}`,
        `[${index}]释放链接时出错，链接已经处于空闲状态`
      )
    }
    // 如果等待队列不为空，从等待队列中取第一个分配链接，否则链接状态设置为空闲，并开始空闲计时
    if (waitingQueue.length > 0) {
      const request = waitingQueue.shift()
      if (request) {
        LogUtil.debug(
          `ConnectionPool.${readonly ? 'read' : 'write'}`,
          `[${index}]链接在释放时被复用，当前等待队列长度为：${waitingQueue.length}`
        )
        connection.refreshOccupyStart()
        request.resolve(connection)
      }
    } else {
      connection.occupied = false
      LogUtil.debug(`ConnectionPool.${readonly ? 'read' : 'write'}`, `[${index}]链接已释放`)
      this.setupIdleTimeout(connection)
    }
  }

  /**
   * 获取排他锁
   */
  public async acquireLock(requester: string, operation: string): Promise<void> {
    return new Promise((resolve) => {
      if (!this.writeLocked) {
        LogUtil.debug('ConnectionPool.write', `${requester}锁定排他锁，操作：${operation}`)
        this.writeLocked = true
        resolve()
      } else {
        LogUtil.debug(
          'ConnectionPool.write',
          `排他锁处于锁定状态，${requester}进入等待队列，操作：${operation}`
        )
        this.writeLockQueue.push(() => resolve())
      }
    })
  }

  /**
   * 释放排他锁
   */
  public releaseLock(requester: string): void {
    if (this.writeLockQueue.length > 0) {
      const next = this.writeLockQueue.shift()
      if (next) {
        next()
      }
    } else {
      LogUtil.debug('ConnectionPool.write', `${requester}释放排他锁`)
      this.writeLocked = false
    }
  }

  /**
   * 创建一个新链接返回
   */
  private createConnection(readonly: boolean, index: number): Connection {
    return new Connection(this.config.databasePath, index, readonly, () =>
      this.release(readonly, index)
    )
  }

  /**
   * 设置空闲超时
   * @private
   * @param connection
   */
  private setupIdleTimeout(connection: Connection) {
    const idleTimeoutMilliseconds = this.config.idleTimeout
    // 空闲计时回调，关闭链接的函数
    const timeoutHandler = () => {
      this.closeConnection(connection)
    }
    // 将空闲计时ID与连接关联，便于后续清理
    connection.timeoutId = setTimeout(timeoutHandler, idleTimeoutMilliseconds)
    LogUtil.debug(
      `ConnectionPool.${connection.readonly ? 'read' : 'write'}`,
      `[${connection.index}]链接已开始空闲计时，timeoutId=${connection.timeoutId}`
    )
  }

  /**
   * 关闭指定的连接并更新连接池状态
   *
   * @param connection
   */

  private closeConnection(connection: Connection) {
    // 关闭链接后清理空闲计时
    clearTimeout(connection.timeoutId)
    connection.timeoutId = undefined
    LogUtil.debug(
      `ConnectionPool.${connection.readonly ? 'read' : 'write'}`,
      `[${connection.index}]链接的空闲计时被清除`
    )
    // 关闭数据库连接
    connection.connection.close()
    const connectionArray = connection.readonly ? this.readConnections : this.writeConnections
    connectionArray[connection.index] = undefined
    LogUtil.debug(
      `ConnectionPool.${connection.readonly ? 'read' : 'write'}`,
      `[${connection.index}]链接已超时关闭`
    )
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
