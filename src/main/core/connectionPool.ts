import { ConnectionPool } from './classes/ConnectionPool.ts'
import { isNullish } from '@shared/util/CommonUtil.ts'

let connectionPool: ConnectionPool | undefined = undefined

async function createConnectionPool(): Promise<void> {
  if (isNullish(connectionPool)) {
    connectionPool = new ConnectionPool({
      maxConnections: 10 // 最大连接数
    })
    // 初始化连接池，创建所有 Worker
    await connectionPool.initialize()
  }
}

function getConnectionPool(): ConnectionPool {
  if (isNullish(connectionPool)) {
    throw new Error('连接池未初始化！')
  }
  return connectionPool
}

async function destroyConnectionPool(): Promise<void> {
  if (connectionPool) {
    await connectionPool.closeAll()
    connectionPool = undefined
  }
}

export { createConnectionPool, getConnectionPool, destroyConnectionPool }
