import { AsyncLocalStorage } from 'async_hooks'
import { Connection } from '../core/classes/ConnectionPool.ts'
import { RequestWeight } from '../core/classes/ConnectionPool.ts'
import { getConnectionPool } from '../core/connectionPool.ts'
import log from '../util/LogUtil.ts'
import { isNullish } from '@shared/util/CommonUtil.ts'

/**
 * 事务状态
 */
interface TransactionState {
  /** 从连接池借用的写连接 */
  connection: Connection
  /** 是否为事务最外层 */
  isOutermost: boolean
  /** 保存点计数器 */
  savepointCounter: number
  /** 当前持有排他锁 */
  holdingLock: boolean
  /** 操作描述 */
  operation: string
  /** 调用者标识 */
  caller: string
}

/**
 * 事务上下文管理器
 * 使用 AsyncLocalStorage 实现跨异步边界的上下文传递
 */
class TransactionContext {
  private static asyncLocalStorage = new AsyncLocalStorage<TransactionState>()

  /**
   * 获取当前事务上下文
   */
  static getCurrentTransaction(): TransactionState | undefined {
    return this.asyncLocalStorage.getStore()
  }

  /**
   * 检查是否在事务中
   */
  static inTransaction(): boolean {
    return isNullish(this.asyncLocalStorage.getStore()) === false
  }

  /**
   * 获取当前连接（事务中返回绑定连接，非事务返回 undefined）
   */
  static getConnection(): Connection | undefined {
    return this.asyncLocalStorage.getStore()?.connection
  }

  /**
   * 同步获取连接（DAO 层调用）
   * @throws Error 如果不在事务中且需要事务连接
   */
  static getConnectionOrThrow(): Connection {
    const conn = this.getConnection()
    if (isNullish(conn)) {
      throw new Error('Not in transaction context')
    }
    return conn
  }

  // /**
  //  * 注册 REGEXP 函数到数据库连接
  //  * @private
  //  */
  // private static registerRegexpFunction(connection: Connection): void {
  //   connection.connection.function('REGEXP', (pattern, string) => {
  //     const regex = new RegExp(pattern as string)
  //     return regex.test(string as string) ? 1 : 0
  //   })
  // }

  /**
   * 执行事务
   * @param caller 调用者标识
   * @param operation 操作描述
   * @param fn 事务内执行的函数
   */
  static async runInTransaction<R>(caller: string, operation: string, fn: () => Promise<R>): Promise<R> {
    const store = this.asyncLocalStorage.getStore()

    // 嵌套事务：已有上下文，直接执行
    if (store) {
      // 创建保存点
      const savepointName = `sp${store.savepointCounter++}`
      const conn = store.connection

      try {
        conn.connection.exec(`SAVEPOINT ${savepointName}`)
        log.debug(caller, `${operation}，SAVEPOINT ${savepointName}`)
        const result = await fn()
        conn.connection.exec(`RELEASE ${savepointName}`)
        store.savepointCounter--
        log.debug(caller, `${operation}，RELEASE ${savepointName}`)
        return result
      } catch (error) {
        conn.connection.exec(`ROLLBACK TO SAVEPOINT ${savepointName}`)
        store.savepointCounter--
        log.debug(caller, `${operation}，ROLLBACK TO SAVEPOINT ${savepointName}`)
        throw error
      }
    }

    // 最外层事务：创建新上下文
    const pool = getConnectionPool()
    const connection = await pool.acquire(false, RequestWeight.HIGH)

    // 获取排他锁
    await pool.acquireLock(caller, operation)

    const newState: TransactionState = {
      connection,
      isOutermost: true,
      savepointCounter: 0,
      holdingLock: true,
      operation,
      caller
    }

    try {
      connection.connection.exec('BEGIN')
      log.debug(caller, `${operation}，BEGIN`)

      const result = await this.asyncLocalStorage.run(newState, fn)

      connection.connection.exec('COMMIT')
      log.debug(caller, `${operation}，COMMIT`)
      return result
    } catch (error) {
      connection.connection.exec('ROLLBACK')
      log.debug(caller, `${operation}，ROLLBACK`)
      throw error
    } finally {
      // 释放排他锁
      pool.releaseLock(caller)
      // 释放连接
      pool.release(connection.readonly, connection.index)
    }
  }
}

export { TransactionContext }
export type { TransactionState }
