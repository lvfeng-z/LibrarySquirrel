import { AsyncLocalStorage } from 'async_hooks'
import { ConnectionWorker } from '../core/classes/ConnectionWorker.ts'
import { RequestWeight } from '../core/classes/ConnectionPool.ts'
import { getConnectionPool } from '../core/connectionPool.ts'
import log from '../util/LogUtil.ts'
import { isNullish } from '@shared/util/CommonUtil.ts'

/**
 * 事务状态
 */
interface TransactionState {
  /** 从连接池借用的写 Worker */
  worker: ConnectionWorker
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
   * 获取当前 Worker（事务中返回绑定 Worker，非事务返回 undefined）
   */
  static getWorker(): ConnectionWorker | undefined {
    return this.asyncLocalStorage.getStore()?.worker
  }

  /**
   * 获取当前连接（事务中返回绑定连接，非事务返回 undefined）
   * @deprecated 请使用 getWorker
   */
  static getConnection(): ConnectionWorker | undefined {
    return this.getWorker()
  }

  /**
   * 同步获取 Worker（DAO 层调用）
   * @throws Error 如果不在事务中且需要事务 Worker
   */
  static getWorkerOrThrow(): ConnectionWorker {
    const worker = this.getWorker()
    if (isNullish(worker)) {
      throw new Error('Not in transaction context')
    }
    return worker
  }

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
      const worker = store.worker

      try {
        await worker.exec(`SAVEPOINT ${savepointName}`)
        log.debug(caller, `${operation}，SAVEPOINT ${savepointName}`)
        const result = await fn()
        await worker.exec(`RELEASE ${savepointName}`)
        store.savepointCounter--
        log.debug(caller, `${operation}，RELEASE ${savepointName}`)
        return result
      } catch (error) {
        await worker.exec(`ROLLBACK TO SAVEPOINT ${savepointName}`)
        store.savepointCounter--
        log.debug(caller, `${operation}，ROLLBACK TO SAVEPOINT ${savepointName}`)
        throw error
      }
    }

    // 最外层事务：创建新上下文
    const pool = getConnectionPool()
    const worker = await pool.acquire(RequestWeight.HIGH)

    // // 获取排他锁
    // await pool.acquireLock(caller, operation)

    const newState: TransactionState = {
      worker,
      isOutermost: true,
      savepointCounter: 0,
      holdingLock: true,
      operation,
      caller
    }

    try {
      await worker.exec('BEGIN')
      log.debug(caller, `${operation}，BEGIN`)

      const result = await this.asyncLocalStorage.run(newState, fn)

      await worker.exec('COMMIT')
      log.debug(caller, `${operation}，COMMIT`)
      return result
    } catch (error) {
      await worker.exec('ROLLBACK')
      log.debug(caller, `${operation}，ROLLBACK`)
      throw error
    } finally {
      // // 释放排他锁
      // pool.releaseLock(caller)
      // 释放 Worker
      pool.release(worker.getIndex())
    }
  }
}

export { TransactionContext }
export type { TransactionState }
