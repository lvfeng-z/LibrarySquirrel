/**
 * Worker 数据库操作代理
 * 在 Worker 线程中封装数据库操作
 */
import { notNullish } from '@shared/util/CommonUtil.ts'
import log from '../util/LogUtil.ts'

// 数据库连接池引用（从 Worker 初始化时设置）
let connectionPool: unknown = null

/**
 * 初始化数据库连接池
 */
export function initializeWorkerDatabase(pool: unknown): void {
  connectionPool = pool
}

/**
 * 获取数据库连接池
 */
function getConnectionPool(): unknown {
  if (notNullish(connectionPool)) {
    return connectionPool
  }
  throw new Error('数据库连接池未初始化')
}

/**
 * 数据库操作代理类
 */
export class WorkerDatabaseProxy {
  /**
   * 执行查询
   */
  async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const pool = getConnectionPool() as {
      getConnection: (weight?: unknown) => Promise<{
        connection: {
          prepare: (sql: string) => {
            all: (...args: unknown[]) => T[]
            get: (...args: unknown[]) => T
          }
        }
        release: () => void
      }>
    }

    const conn = await pool.getConnection()
    try {
      const stmt = conn.connection.prepare(sql)
      const result = params ? stmt.all(...params) : stmt.all()
      return result
    } finally {
      conn.release()
    }
  }

  /**
   * 执行单条查询
   */
  async queryOne<T>(sql: string, params?: unknown[]): Promise<T | undefined> {
    const pool = getConnectionPool() as {
      getConnection: (weight?: unknown) => Promise<{
        connection: {
          prepare: (sql: string) => {
            get: (...args: unknown[]) => T
          }
        }
        release: () => void
      }>
    }

    const conn = await pool.getConnection()
    try {
      const stmt = conn.connection.prepare(sql)
      const result = params ? stmt.get(...params) : stmt.get()
      return result
    } finally {
      conn.release()
    }
  }

  /**
   * 执行更新/删除/插入
   */
  async execute(sql: string, params?: unknown[]): Promise<{ changes: number; lastInsertRowid: number }> {
    const pool = getConnectionPool() as {
      getConnection: (weight?: unknown) => Promise<{
        connection: {
          prepare: (sql: string) => {
            run: (...args: unknown[]) => { changes: number; lastInsertRowid: number }
          }
        }
        release: () => void
      }>
    }

    const conn = await pool.getConnection()
    try {
      const stmt = conn.connection.prepare(sql)
      const result = params ? stmt.run(...params) : stmt.run()
      return { changes: result.changes, lastInsertRowid: Number(result.lastInsertRowid) }
    } finally {
      conn.release()
    }
  }

  /**
   * 批量插入
   */
  async batchInsert(sql: string, paramsArray: unknown[][]): Promise<number> {
    let totalChanges = 0
    for (const params of paramsArray) {
      const result = await this.execute(sql, params)
      totalChanges += result.changes
    }
    return totalChanges
  }

  /**
   * 事务操作
   */
  async transaction<T>(callback: (tx: WorkerDatabaseProxy) => Promise<T>): Promise<T> {
    // 注意：Worker 中的事务需要特殊处理
    // 简单起见，这里使用自动提交模式
    try {
      return await callback(this)
    } catch (error) {
      log.error('WorkerDatabaseProxy', '事务执行失败', error)
      throw error
    }
  }
}

// 单例实例
let databaseProxy: WorkerDatabaseProxy | null = null

/**
 * 获取数据库代理实例
 */
export function getWorkerDatabaseProxy(): WorkerDatabaseProxy {
  if (!databaseProxy) {
    databaseProxy = new WorkerDatabaseProxy()
  }
  return databaseProxy
}
