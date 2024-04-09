import Connection from 'better-sqlite3'
import DatabaseUtil from "../util/DatabaseUtil";
import DataBaseConstant from "../constant/DataBaseConstant";

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

interface ConnectionStatePair {
  connection: Connection
  state: boolean
}

export class ConnectionPool {
  private config: ConnectionPoolConfig
  private connections: ConnectionStatePair[] // 连接队列
  private connectionQueue: Connection[] // 等待队列
  private idleTimeoutIds: Map<Connection, NodeJS.Timeout>
  constructor(config: ConnectionPoolConfig) {
    this.config = config
    this.connections = []
    this.connectionQueue = []
    this.idleTimeoutIds = new Map()
    // 初始化连接池
    for (let i = 0; i < config.maxConnections; i++) {
      this.connections.push(this.createConnection())
    }
  }

  /**
   * 获取连接
   */
  async acquire(): Promise<Connection> {
    return new Promise((resolve, reject) => {
      if (this.connections.length > 0) {
        const connection = this.connections.shift()
        this.setupIdleTimeout(connection)
        resolve(connection)
      } else {
        this.connectionQueue.push({ resolve, reject })
      }
    })
  }

  release(connection) {
    clearTimeout(this.idleTimeoutIds.get(connection))
    this.idleTimeoutIds.delete(connection)

    if (this.connectionQueue.length > 0) {
      const { resolve } = this.connectionQueue.shift()
      resolve(connection)
    } else {
      this.connections.push(connection)
      this.setupIdleTimeout(connection)
    }
  }

  createConnection() {
    return new Connection(this.config.databasePath)
  }

  setupIdleTimeout(connection) {
    const timeoutId = setTimeout(() => {
      connection.close()
      this.connections = this.connections.filter((c) => c !== connection)
      this.idleTimeoutIds.delete(connection)
    }, this.config.idleTimeout)

    this.idleTimeoutIds.set(connection, timeoutId)
  }
}
