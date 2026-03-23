import Database from 'better-sqlite3'
import log from '../../util/LogUtil.ts'

export interface ConnectionPoolConfig {
  maxConnections: number
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
  occupied: boolean
  occupyStart: number
  holdingWriteLock: boolean
  release: (...args: unknown[]) => void
  timeoutId: NodeJS.Timeout | undefined

  constructor(filename: string, index: number, release: (...args: unknown[]) => void) {
    this.connection = new Database(filename)
    this.index = index
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
   * 连接列表
   * @private
   */
  private readonly connections: (Connection | undefined)[]
  /**
   * 等待队列
   * @private
   */
  private readonly waitingQueue: WaitingRequest[]
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
    this.connections = Array(this.config.maxConnections).fill(undefined)
    this.waitingQueue = []
    this.writeLocked = false
    this.writeLockQueue = []
  }

  /**
   * 获取连接
   */
  public async acquire(requestWeigh: RequestWeight): Promise<Connection> {
    return new Promise((resolve, reject) => {
      try {
        // 遍历连接数组，寻找是否有可复用连接，并记录数组的第一个空闲索引
        let firstIdleIndex = -1
        for (let index = 0; index < this.connections.length; index++) {
          const connection = this.connections[index]
          if (connection === undefined && firstIdleIndex === -1) {
            firstIdleIndex = index
          } else if (connection !== undefined && !connection.occupied) {
            // 分配之前清除空闲计时
            clearTimeout(connection.timeoutId)
            connection.timeoutId = undefined
            log.debug('ConnectionPool', `[${index}]连接复用，清除空闲计时`)
            connection.occupied = true
            connection.refreshOccupyStart()
            resolve(connection)
            return
          }
        }
        // 如果遍历整个连接数组还没有找到可用的连接，尝试新增连接
        if (firstIdleIndex != -1) {
          const newConnection = this.createConnection(firstIdleIndex)
          newConnection.occupied = true
          this.connections[firstIdleIndex] = newConnection
          resolve(newConnection)
          log.debug('ConnectionPool', `[${firstIdleIndex}]新建连接`)
          return
        }
        this.waitingQueue.push({ requestWeigh: requestWeigh, resolve: resolve })
      } catch (e) {
        log.error('ConnectionPool', '分配数据库连接失败，', e)
        reject(e)
      }
    })
  }

  /**
   * 释放连接
   * @param index
   */
  public release(index: number) {
    const connection = this.connections[index]
    if (connection === undefined) {
      log.error('ConnectionPool', `[${index}]释放连接失败，连接为空`)
      return
    }
    if (!connection.occupied) {
      log.error('ConnectionPool', `[${index}]释放连接失败，连接已经处于空闲状态`)
    }
    // 如果等待队列不为空，从等待队列中取第一个分配连接，否则连接状态设置为空闲，并开始空闲计时
    if (this.waitingQueue.length > 0) {
      const request = this.waitingQueue.shift()
      if (request) {
        log.debug('ConnectionPool', `[${index}]连接在释放时被复用，当前等待队列长度为：${this.waitingQueue.length}`)
        connection.refreshOccupyStart()
        request.resolve(connection)
      }
    } else {
      connection.occupied = false
      log.debug('ConnectionPool', `[${index}]连接已释放`)
      this.setupIdleTimeout(connection)
    }
  }

  /**
   * 获取排他锁
   */
  public async acquireLock(requester: string, operation: string): Promise<void> {
    return new Promise((resolve) => {
      if (!this.writeLocked) {
        log.debug('ConnectionPool.write', `${requester}锁定排他锁，操作：${operation}`)
        this.writeLocked = true
        resolve()
      } else {
        log.debug('ConnectionPool.write', `排他锁处于锁定状态，${requester}进入等待队列，操作：${operation}`)
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
      log.debug('ConnectionPool.write', `${requester}释放排他锁`)
      this.writeLocked = false
    }
  }

  /**
   * 创建一个新连接返回
   */
  private createConnection(index: number): Connection {
    return new Connection(this.config.databasePath, index, () => this.release(index))
  }

  /**
   * 设置空闲超时
   * @private
   * @param connection
   */
  private setupIdleTimeout(connection: Connection) {
    const idleTimeoutMilliseconds = this.config.idleTimeout
    // 空闲计时回调，关闭连接的函数
    const timeoutHandler = () => {
      this.closeConnection(connection)
    }
    // 将空闲计时ID与连接关联，便于后续清理
    connection.timeoutId = setTimeout(timeoutHandler, idleTimeoutMilliseconds)
    log.debug('ConnectionPool', `[${connection.index}]连接已开始空闲计时，timeoutId=${connection.timeoutId}`)
  }

  /**
   * 关闭指定的连接并更新连接池状态
   *
   * @param connection
   */

  private closeConnection(connection: Connection) {
    // 关闭连接后清理空闲计时
    clearTimeout(connection.timeoutId)
    connection.timeoutId = undefined
    log.debug('ConnectionPool', `[${connection.index}]连接的空闲计时被清除`)
    // 关闭数据库连接
    connection.connection.close()
    this.connections[connection.index] = undefined
    log.debug('ConnectionPool', `[${connection.index}]连接已超时关闭`)
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
