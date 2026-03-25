import { parentPort } from 'worker_threads'
import { ConnectionWorker } from './classes/ConnectionWorker.ts'
import { RequestWeight } from './classes/ConnectionPool.ts'
import { getConnectionPool } from './connectionPool.ts'
import log from '../util/LogUtil.ts'

/**
 * 数据库消息（子线程 → 主线程）
 */
interface DbMessage {
  requestId: string
  type: string
  threadId: number
  connectionId?: number
  transactionId?: string
  statement?: string
  params?: unknown[]
  caller?: string
  operation?: string
  savepointName?: string
  commit?: boolean
}

/**
 * 子线程事务状态
 */
interface ThreadTransaction {
  worker: ConnectionWorker
  savepointCounter: number
}

// connectionId -> ConnectionWorker (用于连接释放)
const activeConnections = new Map<number, ConnectionWorker>()

// threadId -> transactionId -> ThreadTransaction
const threadTransactions = new Map<number, Map<string, ThreadTransaction>>()

/**
 * 数据库代理注册表（主线程端）
 *
 * 核心功能：
 * 1. 接收子线程的数据库操作请求
 * 2. 管理子线程的连接生命周期
 * 3. 处理事务操作
 */
export class DbProxyRegistry {
  private static initialized: boolean = false

  /**
   * 初始化数据库代理注册表
   */
  static initialize(): void {
    if (this.initialized) {
      return
    }

    // 监听来自子线程的消息
    parentPort?.on('message', async (message: DbMessage) => {
      await this.handleMessage(message)
    })

    this.initialized = true
    log.debug('DbProxyRegistry', '数据库代理注册表已初始化')
  }

  /**
   * 处理来自子线程的消息
   */
  private static async handleMessage(message: DbMessage): Promise<void> {
    const { requestId, type, threadId, connectionId } = message

    try {
      switch (type) {
        // ==================== 连接管理 ====================
        case 'connection_acquire': {
          const pool = getConnectionPool()
          const worker = await pool.acquire(RequestWeight.LOW)

          // 记录活跃连接
          activeConnections.set(worker.getIndex(), worker)

          log.debug('DbProxyRegistry', `线程 ${threadId} 获取连接 ${worker.getIndex()}`)

          this.sendResponse({ requestId, success: true, result: worker.getIndex() })
          break
        }

        case 'connection_release': {
          if (connectionId === undefined) {
            throw new Error('connectionId is required for connection_release')
          }

          const worker = activeConnections.get(connectionId)
          if (worker) {
            const pool = getConnectionPool()
            pool.release(connectionId)
            activeConnections.delete(connectionId)
            log.debug('DbProxyRegistry', `线程 ${threadId} 释放连接 ${connectionId}`)
          }

          this.sendResponse({ requestId, success: true, result: null })
          break
        }

        // ==================== 事务相关 ====================
        case 'transaction_begin': {
          const { transactionId, caller, operation } = message
          if (transactionId === undefined) {
            throw new Error('transactionId is required for transaction_begin')
          }

          const pool = getConnectionPool()
          const worker = await pool.acquire(RequestWeight.HIGH)

          await worker.exec('BEGIN')
          log.debug(caller ?? 'DbProxyRegistry', `${operation ?? '事务'}，BEGIN`)

          // 注册事务
          if (!threadTransactions.has(threadId)) {
            threadTransactions.set(threadId, new Map())
          }
          threadTransactions.get(threadId)!.set(transactionId, {
            worker,
            savepointCounter: 0
          })

          // 同时记录活跃连接
          activeConnections.set(worker.getIndex(), worker)

          this.sendResponse({ requestId, success: true, result: null })
          break
        }

        case 'transaction_end': {
          const { transactionId, commit, threadId } = message
          if (transactionId === undefined || commit === undefined) {
            throw new Error('transactionId and commit are required for transaction_end')
          }

          const txMap = threadTransactions.get(threadId)
          const tx = txMap?.get(transactionId)

          if (tx) {
            await tx.worker.exec(commit ? 'COMMIT' : 'ROLLBACK')
            log.debug('DbProxyRegistry', `${commit ? 'COMMIT' : 'ROLLBACK'}`)

            const pool = getConnectionPool()
            pool.release(tx.worker.getIndex())
            activeConnections.delete(tx.worker.getIndex())
            txMap!.delete(transactionId)

            // 如果该线程没有更多事务，清理线程记录
            if (txMap!.size === 0) {
              threadTransactions.delete(threadId)
            }
          }

          this.sendResponse({ requestId, success: true, result: null })
          break
        }

        // ==================== 事务中的数据库操作 ====================
        case 'transaction_run': {
          const { transactionId, threadId, statement, params } = message
          if (transactionId === undefined || statement === undefined) {
            throw new Error('transactionId and statement are required for transaction_run')
          }

          const tx = threadTransactions.get(threadId)?.get(transactionId)
          if (tx) {
            const result = await tx.worker.run(statement, params)
            this.sendResponse({ requestId, success: true, result })
          } else {
            this.sendResponse({ requestId, success: false, error: `Transaction ${transactionId} not found` })
          }
          break
        }

        case 'transaction_get': {
          const { transactionId, threadId, statement, params } = message
          if (transactionId === undefined || statement === undefined) {
            throw new Error('transactionId and statement are required for transaction_get')
          }

          const tx = threadTransactions.get(threadId)?.get(transactionId)
          if (tx) {
            const result = await tx.worker.get(statement, params)
            this.sendResponse({ requestId, success: true, result })
          } else {
            this.sendResponse({ requestId, success: false, error: `Transaction ${transactionId} not found` })
          }
          break
        }

        case 'transaction_all': {
          const { transactionId, threadId, statement, params } = message
          if (transactionId === undefined || statement === undefined) {
            throw new Error('transactionId and statement are required for transaction_all')
          }

          const tx = threadTransactions.get(threadId)?.get(transactionId)
          if (tx) {
            const result = await tx.worker.all(statement, params)
            this.sendResponse({ requestId, success: true, result })
          } else {
            this.sendResponse({ requestId, success: false, error: `Transaction ${transactionId} not found` })
          }
          break
        }

        case 'transaction_exec': {
          const { transactionId, threadId, statement } = message
          if (transactionId === undefined || statement === undefined) {
            throw new Error('transactionId and statement are required for transaction_exec')
          }

          const tx = threadTransactions.get(threadId)?.get(transactionId)
          if (tx) {
            const result = await tx.worker.exec(statement)
            this.sendResponse({ requestId, success: true, result })
          } else {
            this.sendResponse({ requestId, success: false, error: `Transaction ${transactionId} not found` })
          }
          break
        }

        // ==================== SAVEPOINT 操作 ====================
        case 'transaction_savepoint': {
          const { transactionId, threadId, savepointName } = message
          if (transactionId === undefined || savepointName === undefined) {
            throw new Error('transactionId and savepointName are required for transaction_savepoint')
          }

          const tx = threadTransactions.get(threadId)?.get(transactionId)
          if (tx) {
            await tx.worker.exec(`SAVEPOINT ${savepointName}`)
            tx.savepointCounter++
            log.debug('DbProxyRegistry', `SAVEPOINT ${savepointName}`)
          }

          this.sendResponse({ requestId, success: true, result: null })
          break
        }

        case 'transaction_release_savepoint': {
          const { transactionId, threadId, savepointName } = message
          if (transactionId === undefined || savepointName === undefined) {
            throw new Error('transactionId and savepointName are required for transaction_release_savepoint')
          }

          const tx = threadTransactions.get(threadId)?.get(transactionId)
          if (tx) {
            await tx.worker.exec(`RELEASE SAVEPOINT ${savepointName}`)
            tx.savepointCounter--
            log.debug('DbProxyRegistry', `RELEASE SAVEPOINT ${savepointName}`)
          }

          this.sendResponse({ requestId, success: true, result: null })
          break
        }

        case 'transaction_rollback_savepoint': {
          const { transactionId, threadId, savepointName } = message
          if (transactionId === undefined || savepointName === undefined) {
            throw new Error('transactionId and savepointName are required for transaction_rollback_savepoint')
          }

          const tx = threadTransactions.get(threadId)?.get(transactionId)
          if (tx) {
            await tx.worker.exec(`ROLLBACK TO SAVEPOINT ${savepointName}`)
            tx.savepointCounter--
            log.debug('DbProxyRegistry', `ROLLBACK TO SAVEPOINT ${savepointName}`)
          }

          this.sendResponse({ requestId, success: true, result: null })
          break
        }

        // ==================== 普通数据库操作（使用 connectionId） ====================
        case 'run':
        case 'get':
        case 'all':
        case 'exec': {
          const { statement, params } = message
          if (statement === undefined) {
            throw new Error('statement is required for database operations')
          }
          if (connectionId === undefined) {
            throw new Error('connectionId is required for database operations')
          }

          const worker = activeConnections.get(connectionId)
          if (!worker) {
            throw new Error(`Connection ${connectionId} not found or already released`)
          }

          let result: unknown
          switch (type) {
            case 'run':
              result = await worker.run(statement, params)
              break
            case 'get':
              result = await worker.get(statement, params)
              break
            case 'all':
              result = await worker.all(statement, params)
              break
            case 'exec':
              result = await worker.exec(statement)
              break
          }
          this.sendResponse({ requestId, success: true, result })
          break
        }

        default:
          this.sendResponse({ requestId, success: false, error: `Unknown message type: ${type}` })
      }
    } catch (error) {
      this.sendResponse({
        requestId,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * 发送响应消息到子线程
   */
  private static sendResponse(response: { requestId: string; success: boolean; result?: unknown; error?: string }): void {
    parentPort?.postMessage(response)
  }

  /**
   * 清理所有资源（应用关闭时）
   */
  static async cleanup(): Promise<void> {
    // 关闭所有事务（强制回滚）
    for (const [threadId, txMap] of threadTransactions) {
      for (const [transactionId, tx] of txMap) {
        try {
          await tx.worker.exec('ROLLBACK')
          const pool = getConnectionPool()
          pool.release(tx.worker.getIndex())
        } catch (error) {
          log.error('DbProxyRegistry', `清理线程 ${threadId} 事务 ${transactionId} 失败:`, error)
        }
      }
      txMap.clear()
    }
    threadTransactions.clear()

    // 清理所有活跃连接
    for (const [connectionId] of activeConnections) {
      try {
        const pool = getConnectionPool()
        pool.release(connectionId)
      } catch (error) {
        log.error('DbProxyRegistry', `清理连接 ${connectionId} 失败:`, error)
      }
    }
    activeConnections.clear()

    this.initialized = false
    log.debug('DbProxyRegistry', '数据库代理注册表已清理')
  }
}
