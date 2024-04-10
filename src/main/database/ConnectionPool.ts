import Connection from 'better-sqlite3'
import DatabaseUtil from '../util/DatabaseUtil'
import DataBaseConstant from '../constant/DataBaseConstant'
import LogUtil from '../util/LogUtil'

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

type WaitingRequest = { resolve: (connection: Connection) => void }

export class ConnectionPool {
  private config: ConnectionPoolConfig
  private connections: Connection[] // 链接列表
  private connectionExtra: { state: boolean; timeoutId?: NodeJS.Timeout }[] // 链接额外数据列表
  private connectionQueue: WaitingRequest[] // 等待队列

  constructor(config: ConnectionPoolConfig) {
    this.config = config
    this.connections = Array(this.config.maxConnections).fill(undefined)
    this.connectionExtra = []
    for (let index = 0; index < this.config.maxConnections; index++) {
      this.connectionExtra[index] = { state: false, timeoutId: undefined }
    }
    this.connectionQueue = []
  }

  /**
   * 获取连接
   */
  public async acquire(): Promise<Connection> {
    return new Promise((resolve, reject) => {
      try {
        let firstIdleIndex = -1
        // 遍历链接数组，寻找是否有可复用链接，并记录数组的第一个空闲索引
        for (let index = 0; index < this.config.maxConnections; index++) {
          if (this.connections[index] == undefined && firstIdleIndex == -1) {
            firstIdleIndex = index
          } else if (this.connectionExtra[index].state) {
            // 分配之前清除超时定时器
            clearTimeout(this.connectionExtra[index].timeoutId)
            this.connections[index].timeoutId = null
            LogUtil.debug(
              'ConnectionPool',
              '由于链接复用，清除' +
                index +
                '号链接的原有定时器，timeoutId=' +
                this.connectionExtra[index].timeoutId
            )
            this.connectionExtra[index].state = false
            resolve(this.connections[index])
            LogUtil.debug('ConnectionPool', '复用' + index + '号链接')
            return
          }
        }
        // 如果遍历整个链接数组还没有找到可用的链接，尝试新增链接
        if (firstIdleIndex != -1) {
          this.connections[firstIdleIndex] = this.createConnection()
          resolve(this.connections[firstIdleIndex])
          LogUtil.debug('ConnectionPool', '在' + firstIdleIndex + '号新建链接')
          return
        } else {
          this.connectionQueue.push({ resolve })
        }
      } catch (e) {
        LogUtil.error('ConnectionPool', '分配数据库连接时出现未知错误！' + String(e))
        reject(e)
      }
    })
  }

  /**
   * 释放链接
   * @param connection
   */
  public release(connection: Connection) {
    // 如果等待队列不为空，从等待队列中取第一个分配链接，否则改链接状态设置为空闲，并开启超时定时器
    if (this.connectionQueue.length > 0) {
      const request = this.connectionQueue.shift()
      if (request) {
        LogUtil.debug(
          'ConnectionPool',
          this.connections.indexOf(connection) + '号链接在释放时被复用'
        )
        request.resolve(connection)
      }
    } else {
      const index = this.connections.indexOf(connection)
      this.connectionExtra[index].state = true
      this.setupIdleTimeout(connection)
      LogUtil.debug('ConnectionPool', this.connections.indexOf(connection) + '号链接已释放')
    }
  }

  /**
   * 创建一个新链接返回，并将其加入链接数组中
   */
  private createConnection(): Connection {
    return new Connection(this.config.databasePath)
  }

  /**
   * 设置空闲连接超时
   * @param connection
   * @private
   */
  private setupIdleTimeout(connection: Connection) {
    const idleTimeoutMilliseconds = this.config.idleTimeout
    const index = this.connections.indexOf(connection)
    // 超时定时器回调关闭链接函数
    const timeoutHandler = () => {
      this.closeConnection(connection, index)
    }
    // 将定时器ID与连接关联，便于后续清理
    this.connectionExtra[index].timeoutId = setTimeout(timeoutHandler, idleTimeoutMilliseconds)
    LogUtil.debug(
      'ConnectionPool',
      index + '号链接已设置定时器，timeoutId=' + this.connectionExtra[index].timeoutId
    )
  }

  /**
   * 关闭指定的连接并更新连接池状态
   * @param connection 待关闭的连接
   * @param index 连接在connections数组中的索引
   */

  private closeConnection(connection: Connection, index: number) {
    // 关闭链接后清理定时器
    clearTimeout(this.connectionExtra[index].timeoutId)
    this.connections[index].timeoutId = null
    LogUtil.debug(
      'ConnectionPool',
      '链接关闭，清除' +
        index +
        '号链接的定时器，timeoutId=' +
        this.connectionExtra[index].timeoutId
    )
    // 关闭数据库连接
    connection.close()
    // 更新连接状态和连接列表
    this.connectionExtra[index].state = false
    this.connections[index] = undefined
    LogUtil.debug(
      'ConnectionPool',
      index + '号链接已超时关闭，timeoutId=' + this.connectionExtra[index].timeoutId
    )
  }
}
