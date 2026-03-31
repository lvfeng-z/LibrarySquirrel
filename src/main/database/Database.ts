import BetterSqlite3 from 'better-sqlite3'
import { TransactionContext } from './TransactionContext.ts'
import { getConnectionPool } from '../core/connectionPool.ts'
import { RequestWeight } from '../core/classes/ConnectionPool.ts'
import { ConnectionWorker } from '../core/classes/ConnectionWorker.ts'
import log from '../util/LogUtil.ts'
import { isNullish } from '@shared/util/CommonUtil.ts'

/**
 * 保存借用的 Worker 索引，用于释放
 * @private
 */
const borrowedWorkers = new WeakMap<ConnectionWorker, number>()

// /**
//  * 是否持有排他锁
//  * @private
//  */
// let holdingLock: boolean = false

/**
 * 数据库访问入口
 * 提供静态方法，自动检测事务上下文并获取对应连接 Worker
 */
export class Database {
  private static readonly caller = 'Database'

  /**
   * 获取数据库连接 Worker
   * - 事务中：返回绑定到上下文的 Worker
   * - 非事务：从连接池借用
   * @private
   */
  private static async acquireWorker(): Promise<ConnectionWorker> {
    // 事务中：使用上下文绑定的 Worker
    if (TransactionContext.inTransaction()) {
      const ctxWorker = TransactionContext.getWorker()
      if (isNullish(ctxWorker)) {
        throw new Error('Transaction context exists but worker is missing')
      }
      return ctxWorker
    }

    // 非事务：从连接池借用
    const pool = getConnectionPool()
    const worker = await pool.acquire(RequestWeight.LOW)

    // 保存 Worker 索引用于释放
    borrowedWorkers.set(worker, worker.getIndex())

    return worker
  }

  /**
   * 释放非事务 Worker
   * @private
   */
  private static releaseWorker(worker: ConnectionWorker): void {
    // 事务中不释放，由事务上下文管理
    if (TransactionContext.inTransaction()) {
      return
    }

    const pool = getConnectionPool()
    const index = borrowedWorkers.get(worker)

    if (isNullish(index)) {
      log.warn(this.caller, '释放 Worker 时未找到借用信息')
      return
    }

    pool.release(index)
    borrowedWorkers.delete(worker)
  }

  /**
   * 执行写操作 (INSERT/UPDATE/DELETE)
   * @param statement SQL 语句
   * @param params 参数
   * @returns 执行结果
   */
  static async run<BindParameters extends unknown[]>(statement: string, ...params: BindParameters): Promise<BetterSqlite3.RunResult> {
    // // 事务中：由 TransactionContext 管理锁，这里不获取/释放锁
    // const inTransaction = TransactionContext.inTransaction()
    //
    // // 非事务：获取排他锁，防止并发写操作导致数据库锁定
    // let lockAcquired = false
    // if (!inTransaction && !holdingLock) {
    //   await getConnectionPool().acquireLock(this.caller, statement)
    //   holdingLock = true
    //   lockAcquired = true
    // }

    const worker = await this.acquireWorker()
    try {
      log.debug(this.caller, `[SQL] ${statement}\n\t[PARAMS] ${JSON.stringify(params)}`)
      return (await worker.run(statement, params)) as BetterSqlite3.RunResult
    } catch (error) {
      log.error(this.caller, error, `\n[SQL] ${statement}\n\t[PARAMS] ${JSON.stringify(params)}`)
      throw error
    } finally {
      this.releaseWorker(worker)
      // // 仅在获取了锁且非事务情况下释放排他锁
      // if (lockAcquired && !inTransaction && holdingLock) {
      //   getConnectionPool().releaseLock(this.caller)
      //   holdingLock = false
      // }
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
    return TransactionContext.inTransaction()
  }
}
