import BetterSqlite3 from 'better-sqlite3'
import { TransactionContext } from './TransactionContext.ts'
import { ThreadDbProxyContext } from './ThreadDbProxyContext.ts'
import { getConnectionPool } from '../core/connectionPool.ts'
import { RequestWeight } from '../core/classes/ConnectionPool.ts'
import { ConnectionWorker } from '../core/classes/ConnectionWorker.ts'
import { DbProxy } from '../core/classes/DbProxy.ts'
import log from '../util/LogUtil.ts'
import { isNullish } from '@shared/util/CommonUtil.ts'

/**
 * 保存借用的 Worker 索引，用于释放
 * @private
 */
const borrowedWorkers = new WeakMap<ConnectionWorker, number>()

/**
 * 保存借用的 DbProxy，用于非事务操作的释放
 * @private
 */
const borrowedDbProxies = new WeakMap<DbProxy, boolean>()

/**
 * 数据库访问入口
 *
 * 主线程：使用 ConnectionPool 和 TransactionContext (ALS)
 * 子线程：使用 DbProxy 和 ThreadDbProxyContext (ALS)
 */
export class Database {
  private static readonly caller = 'Database'

  /**
   * 判断是否在主线程
   * @private
   */
  private static isInMainThread(): boolean {
    return DbProxy.isMainThread()
  }

  /**
   * 获取数据库连接 Worker 或 DbProxy
   * - 主线程事务中：返回绑定到上下文的 Worker
   * - 主线程非事务：从连接池借用
   * - 子线程事务中：从 ThreadDbProxyContext 获取 DbProxy
   * - 子线程非事务：创建新的 DbProxy
   * @private
   */
  private static async acquireWorker(): Promise<ConnectionWorker | DbProxy> {
    // 主线程事务中：使用上下文绑定的 Worker
    if (this.isInMainThread() && TransactionContext.inTransaction()) {
      const ctxWorker = TransactionContext.getWorker()
      if (isNullish(ctxWorker)) {
        throw new Error('Transaction context exists but worker is missing')
      }
      return ctxWorker
    }

    if (!this.isInMainThread()) {
      // 子线程

      // 事务中：从 ALS 获取当前的 DbProxy
      if (ThreadDbProxyContext.inTransaction()) {
        const dbProxy = ThreadDbProxyContext.getCurrentDbProxy()
        if (isNullish(dbProxy)) {
          throw new Error('Transaction context exists but DbProxy is missing')
        }
        return dbProxy
      }

      // 非事务：创建新的 DbProxy，用完释放
      const dbProxy = await DbProxy.create(process.pid)
      borrowedDbProxies.set(dbProxy, true)
      return dbProxy
    }

    // 主线程非事务：从连接池借用
    const pool = getConnectionPool()
    const worker = await pool.acquire(RequestWeight.LOW)
    borrowedWorkers.set(worker, worker.getIndex())
    return worker
  }

  /**
   * 释放非事务 Worker/DbProxy
   * @private
   */
  private static releaseWorker(worker: ConnectionWorker | DbProxy): void {
    // 主线程事务中不释放，由事务上下文管理
    if (this.isInMainThread() && TransactionContext.inTransaction()) {
      return
    }

    if (!this.isInMainThread()) {
      // 子线程非事务：释放借用的 DbProxy
      if (borrowedDbProxies.has(worker as DbProxy)) {
        ;(worker as DbProxy).release()
        borrowedDbProxies.delete(worker as DbProxy)
      }
      return
    }

    // 主线程非事务：释放到连接池
    const pool = getConnectionPool()
    const index = borrowedWorkers.get(worker as ConnectionWorker)

    if (isNullish(index)) {
      log.warn(this.caller, '释放 Worker 时未找到借用信息')
      return
    }

    pool.release(index)
    borrowedWorkers.delete(worker as ConnectionWorker)
  }

  /**
   * 检查是否在事务中（主线程或子线程）
   * @private
   */
  private static inTransactionContext(): boolean {
    if (this.isInMainThread()) {
      return TransactionContext.inTransaction()
    }
    return ThreadDbProxyContext.inTransaction()
  }

  /**
   * 执行写操作 (INSERT/UPDATE/DELETE)
   * @param statement SQL 语句
   * @param params 参数
   * @returns 执行结果
   */
  static async run<BindParameters extends unknown[]>(statement: string, ...params: BindParameters): Promise<BetterSqlite3.RunResult> {
    const worker = await this.acquireWorker()
    try {
      log.debug(this.caller, `[SQL] ${statement}\n\t[PARAMS] ${JSON.stringify(params)}`)
      return (await worker.run(statement, params)) as BetterSqlite3.RunResult
    } catch (error) {
      log.error(this.caller, error, `\n[SQL] ${statement}\n\t[PARAMS] ${JSON.stringify(params)}`)
      throw error
    } finally {
      this.releaseWorker(worker)
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
    const worker = await this.acquireWorker()
    try {
      log.debug(this.caller, `[SQL] ${statement}\n\t[PARAMS] ${JSON.stringify(params)}`)
      return (await worker.get(statement, params)) as Result | undefined
    } catch (error) {
      log.error(this.caller, error, `\n[SQL] ${statement}\n\t[PARAMS] ${JSON.stringify(params)}`)
      throw error
    } finally {
      this.releaseWorker(worker)
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
    const worker = await this.acquireWorker()
    try {
      log.debug(this.caller, `[SQL] ${statement}\n\t[PARAMS] ${JSON.stringify(params)}`)
      return (await worker.all(statement, params)) as Result[]
    } catch (error) {
      log.error(this.caller, error, `\n[SQL] ${statement}\n\t[PARAMS] ${JSON.stringify(params)}`)
      throw error
    } finally {
      this.releaseWorker(worker)
    }
  }

  /**
   * 执行语句
   */
  public static async exec(statement: string): Promise<boolean> {
    const worker = await this.acquireWorker()
    try {
      log.debug(this.caller, `[SQL] ${statement}`)
      return await worker.exec(statement)
    } catch (error) {
      log.error(this.caller, error, `\n[SQL] ${statement}`)
      throw error
    } finally {
      this.releaseWorker(worker)
    }
  }

  /**
   * 检查是否在事务中
   */
  static inTransaction(): boolean {
    return this.inTransactionContext()
  }

  /**
   * 执行事务
   * - 主线程：使用 TransactionContext.runInTransaction
   * - 子线程：使用 ThreadDbProxyContext.runInTransaction
   * @param caller 调用者标识
   * @param operation 操作描述
   * @param fn 事务内执行的函数
   */
  static async runInTransaction<R>(caller: string, operation: string, fn: () => Promise<R>): Promise<R> {
    if (this.isInMainThread()) {
      return TransactionContext.runInTransaction(caller, operation, fn)
    }

    // 子线程：使用 ThreadDbProxyContext
    return ThreadDbProxyContext.runInTransaction(caller, operation, fn)
  }
}