import { AsyncLocalStorage } from 'async_hooks'
import { DbProxy } from '../core/classes/DbProxy.ts'
import log from '../util/LogUtil.ts'
import { isNullish } from '@shared/util/CommonUtil.ts'

/**
 * 子线程事务状态
 */
interface ThreadTransactionState {
  /** DbProxy 实例 */
  dbProxy: DbProxy
  /** 事务 ID */
  transactionId: string
  /** 保存点计数器 */
  savepointCounter: number
  /** 保存点栈 */
  savepointStack: string[]
  /** 调用者标识 */
  caller: string
}

/**
 * 子线程事务上下文
 *
 * 使用 AsyncLocalStorage 实现跨异步边界的上下文传递
 * 每个子线程有自己独立的 ALS 实例
 */
class ThreadDbProxyContext {
  private static asyncLocalStorage = new AsyncLocalStorage<ThreadTransactionState>()

  /**
   * 获取当前事务上下文
   */
  static getCurrentTransaction(): ThreadTransactionState | undefined {
    return this.asyncLocalStorage.getStore()
  }

  /**
   * 检查是否在事务中
   */
  static inTransaction(): boolean {
    return isNullish(this.asyncLocalStorage.getStore()) === false
  }

  /**
   * 获取当前 DbProxy（事务中返回，非事务返回 undefined）
   */
  static getCurrentDbProxy(): DbProxy | undefined {
    return this.asyncLocalStorage.getStore()?.dbProxy
  }

  /**
   * 执行事务
   * @param caller 调用者标识
   * @param operation 操作描述
   * @param fn 事务内执行的函数
   */
  static async runInTransaction<R>(caller: string, operation: string, fn: () => Promise<R>): Promise<R> {
    const store = this.asyncLocalStorage.getStore()

    // 嵌套事务：已有上下文，使用 SAVEPOINT
    if (store) {
      const savepointName = `sp_${store.savepointCounter++}`
      store.savepointStack.push(savepointName)

      log.debug(caller, `${operation}，嵌套事务 SAVEPOINT ${savepointName}`)

      try {
        await store.dbProxy.createSavepoint(store.transactionId, savepointName)
        const result = await fn()
        await store.dbProxy.releaseSavepoint(store.transactionId, savepointName)
        store.savepointCounter--
        log.debug(caller, `${operation}，嵌套事务 RELEASE ${savepointName}`)
        store.savepointStack.pop()
        return result
      } catch (error) {
        await store.dbProxy.rollbackToSavepoint(store.transactionId, savepointName)
        store.savepointCounter--
        log.debug(caller, `${operation}，嵌套事务 ROLLBACK TO ${savepointName}`)
        store.savepointStack.pop()
        throw error
      }
    }

    // 最外层事务：创建新上下文
    const threadId = process.pid
    const dbProxy = await DbProxy.create(threadId)
    const transactionId = `tx_${threadId}_${Date.now()}`

    const newState: ThreadTransactionState = {
      dbProxy,
      transactionId,
      savepointCounter: 0,
      savepointStack: [],
      caller
    }

    log.debug(caller, `子线程事务开始，transactionId: ${transactionId}`)

    try {
      await dbProxy.beginTransaction(caller, operation, transactionId)

      const result = await this.asyncLocalStorage.run(newState, fn)

      await dbProxy.endTransaction(transactionId, true)
      log.debug(caller, `子线程事务提交，transactionId: ${transactionId}`)
      return result
    } catch (error) {
      await dbProxy.endTransaction(transactionId, false)
      log.debug(caller, `子线程事务回滚，transactionId: ${transactionId}`)
      throw error
    } finally {
      await dbProxy.release()
      log.debug(caller, `子线程事务结束，释放连接`)
    }
  }
}

export { ThreadDbProxyContext }
export type { ThreadTransactionState }
