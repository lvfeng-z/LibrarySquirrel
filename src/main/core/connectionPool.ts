import { ConnectionPool } from './classes/ConnectionPool.ts'
import { DataBasePath } from '../util/DatabaseUtil.ts'
import DataBaseConstant from '../constant/DataBaseConstant.ts'
import { isNullish } from '@shared/util/CommonUtil.ts'

let connectionPool: ConnectionPool | undefined = undefined

function createConnectionPool(): void {
  if (isNullish(connectionPool)) {
    connectionPool = new ConnectionPool({
      maxConnections: 10, // 最大连接数
      idleTimeout: 30000, // 连接空闲超时时间（毫秒）
      databasePath: DataBasePath() + DataBaseConstant.DB_FILE_NAME // 数据库文件路径
    })
  }
}

function getConnectionPool(): ConnectionPool {
  if (isNullish(connectionPool)) {
    throw new Error('连接池未初始化！')
  }
  return connectionPool
}

export { createConnectionPool, getConnectionPool }
