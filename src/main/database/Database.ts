import BetterSqlite3 from 'better-sqlite3'
import { TransactionContext } from './TransactionContext.ts'
import { getConnectionPool } from '../core/connectionPool.ts'
import { Connection, RequestWeight } from '../core/classes/ConnectionPool.ts'
import LogUtil from '../util/LogUtil.ts'
import { isNullish } from '@shared/util/CommonUtil.ts'

/**
 * 保存借用的连接信息，用于释放
 * @private
 */
const borrowedConnections = new WeakMap<BetterSqlite3.Database, Connection>()

/**
 * 数据库访问入口
 * 提供静态方法，自动检测事务上下文并获取对应连接
 */
class Database {
  private static readonly caller = 'Database'

  /**
   * 注册 REGEXP 函数到数据库连接
   * @private
   */
  private static registerRegexpFunction(connection: BetterSqlite3.Database): void {
    connection.function('REGEXP', (pattern, string) => {
      const regex = new RegExp(pattern as string)
      return regex.test(string as string) ? 1 : 0
    })
  }

  /**
   * 获取数据库连接
   * - 事务中：返回绑定到上下文的连接
   * - 非事务：从连接池借用
   * @private
   */
  private static async acquireConnection(readOnly: boolean): Promise<BetterSqlite3.Database> {
    // 事务中：使用上下文绑定的连接
    if (TransactionContext.inTransaction()) {
      const ctxConn = TransactionContext.getConnection()
      if (isNullish(ctxConn)) {
        throw new Error('Transaction context exists but connection is missing')
      }
      return ctxConn.connection
    }

    // 非事务：从连接池借用
    const pool = getConnectionPool()
    const connection = await pool.acquire(readOnly, RequestWeight.LOW)
    this.registerRegexpFunction(connection.connection)

    // 保存连接信息用于释放
    borrowedConnections.set(connection.connection, connection)

    return connection.connection
  }

  /**
   * 释放非事务连接
   * @private
   */
  private static releaseConnection(connection: BetterSqlite3.Database): void {
    // 事务中不释放，由事务上下文管理
    if (TransactionContext.inTransaction()) {
      return
    }

    const pool = getConnectionPool()
    const connInfo = borrowedConnections.get(connection)

    if (isNullish(connInfo)) {
      LogUtil.warn(this.caller, '释放连接时未找到借用信息')
      return
    }

    pool.release(connInfo.readonly, connInfo.index)
    borrowedConnections.delete(connection)
  }

  /**
   * 执行写操作 (INSERT/UPDATE/DELETE)
   * @param statement SQL 语句
   * @param params 参数
   * @returns 执行结果
   */
  static async run<BindParameters extends unknown[]>(statement: string, ...params: BindParameters): Promise<BetterSqlite3.RunResult> {
    const connection = await this.acquireConnection(false)
    try {
      LogUtil.debug(this.caller, `[SQL] ${statement}\n\t[PARAMS] ${JSON.stringify(params)}`)
      const result = connection.prepare(statement).run(...params)
      return result as BetterSqlite3.RunResult
    } catch (error) {
      LogUtil.error(this.caller, error, `\n[SQL] ${statement}\n\t[PARAMS] ${JSON.stringify(params)}`)
      throw error
    } finally {
      this.releaseConnection(connection)
    }
  }

  /**
   * 执行读操作 - 单条
   * @param statement SQL 语句
   * @param params 参数
   * @returns 单条结果
   */
  static async get<BindParameters extends unknown[], Result = unknown>(
    statement: string,
    ...params: BindParameters
  ): Promise<Result | undefined> {
    const connection = await this.acquireConnection(true)
    try {
      LogUtil.debug(this.caller, `[SQL] ${statement}\n\t[PARAMS] ${JSON.stringify(params)}`)
      return connection.prepare(statement).get(...params) as Result | undefined
    } catch (error) {
      LogUtil.error(this.caller, error, `\n[SQL] ${statement}\n\t[PARAMS] ${JSON.stringify(params)}`)
      throw error
    } finally {
      this.releaseConnection(connection)
    }
  }

  /**
   * 执行读操作 - 列表
   * @param statement SQL 语句
   * @param params 参数
   * @returns 结果列表
   */
  static async all<BindParameters extends unknown[], Result = unknown>(
    statement: string,
    ...params: BindParameters
  ): Promise<Result[]> {
    const connection = await this.acquireConnection(true)
    try {
      LogUtil.debug(this.caller, `[SQL] ${statement}\n\t[PARAMS] ${JSON.stringify(params)}`)
      return connection.prepare(statement).all(...params) as Result[]
    } catch (error) {
      LogUtil.error(this.caller, error, `\n[SQL] ${statement}\n\t[PARAMS] ${JSON.stringify(params)}`)
      throw error
    } finally {
      this.releaseConnection(connection)
    }
  }

  /**
   * 执行预处理
   * @param statement SQL 语句
   * @param read 是否为读操作
   * @returns 预处理语句对象
   */
  static async prepare<BindParameters extends unknown[], Result = unknown>(
    statement: string,
    read: boolean
  ): Promise<BetterSqlite3.Statement<BindParameters, Result>> {
    const connection = await this.acquireConnection(read)
    return connection.prepare<BindParameters, Result>(statement)
  }

  /**
   * 检查是否在事务中
   */
  static inTransaction(): boolean {
    return TransactionContext.inTransaction()
  }
}

// 导出 better-sqlite3 类型供外部使用
export type { Database as DatabaseNamespace }

export { Database }
