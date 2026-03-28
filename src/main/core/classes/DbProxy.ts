import { workerData } from 'worker_threads'
import { isNullish } from '@shared/util/CommonUtil.ts'
import log from '../../util/LogUtil.ts'

interface DbProxyInitData {
  threadType: string
  threadId: number
  databasePath: string
}

/**
 * 数据库请求（子线程 → 主线程）
 */
interface DbRequest {
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
 * 数据库响应（主线程 → 子线程）
 */
interface DbResponse {
  requestId: string
  success: boolean
  result?: unknown
  error?: string
}

/**
 * 数据库代理（子线程端）
 *
 * 职责：封装子线程到主线程的数据库操作调用
 * 每个 DbProxy 实例代表主线程中的一个连接
 *
 * 使用方式：
 * 1. 非事务操作：DbProxy.create() 创建 → 使用 → release()
 * 2. 事务操作：通过 ALS 获取 → 事务结束后 release()
 */
export class DbProxy {
  private readonly threadId: number
  private readonly connectionId: number
  private pendingRequests: Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void }> = new Map()
  private requestIdCounter: number = 0

  private constructor(threadId: number, connectionId: number) {
    this.threadId = threadId
    this.connectionId = connectionId

    // 监听主线程返回的消息
    process.parentPort?.on('message', this.handleMessage.bind(this))

    log.debug('DbProxy', `线程 ${threadId} 的数据库代理已创建，connectionId: ${connectionId}`)
  }

  /**
   * 异步工厂方法：创建 DbProxy 实例并等待连接分配
   * @param threadId 子线程 ID
   * @returns 包含 connectionId 的 DbProxy 实例
   */
  static async create(threadId: number): Promise<DbProxy> {
    const requestId = `create_${threadId}_${Date.now()}`

    const response = await new Promise<DbResponse>((resolve, reject) => {
      const request: DbRequest = {
        requestId,
        type: 'connection_acquire',
        threadId
      }

      const timeout = setTimeout(() => {
        reject(new Error('获取连接超时'))
      }, 30000)

      const handler = (message: unknown): void => {
        const response = message as DbResponse
        if (response.requestId === requestId) {
          clearTimeout(timeout)
          process.parentPort?.removeListener('message', handler)
          resolve(response)
        }
      }

      process.parentPort?.on('message', handler)
      process.parentPort?.postMessage(request)
    })

    if (!response.success) {
      throw new Error(response.error || '获取连接失败')
    }

    const connectionId = response.result as number
    return new DbProxy(threadId, connectionId)
  }

  /**
   * 处理主线程返回的消息
   */
  private handleMessage(message: unknown): void {
    const response = message as DbResponse
    const pending = this.pendingRequests.get(response.requestId)
    if (pending) {
      this.pendingRequests.delete(response.requestId)
      if (response.success) {
        pending.resolve(response.result)
      } else {
        pending.reject(new Error(response.error))
      }
    }
  }

  /**
   * 检查是否在主线程
   */
  static isMainThread(): boolean {
    try {
      const data = workerData as DbProxyInitData | undefined
      return isNullish(data) || data.threadType !== 'task'
    } catch {
      return true
    }
  }

  /**
   * 获取线程 ID
   */
  getThreadId(): number {
    return this.threadId
  }

  /**
   * 获取连接 ID
   */
  getConnectionId(): number {
    return this.connectionId
  }

  /**
   * 生成唯一请求 ID
   */
  private generateRequestId(): string {
    return `db_${this.threadId}_${Date.now()}_${this.requestIdCounter++}`
  }

  /**
   * 发送请求到主线程并等待响应
   */
  private sendRequest(request: Omit<DbRequest, 'requestId' | 'threadId' | 'connectionId'>): Promise<unknown> {
    const requestId = this.generateRequestId()
    const fullRequest: DbRequest = { ...request, requestId, threadId: this.threadId, connectionId: this.connectionId }

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject })
      process.parentPort?.postMessage(fullRequest)
    })
  }

  /**
   * 释放连接回连接池
   */
  async release(): Promise<void> {
    await this.sendRequest({ type: 'connection_release' })
    log.debug('DbProxy', `线程 ${this.threadId} 的连接 ${this.connectionId} 已释放`)
  }

  /**
   * 执行写操作 (INSERT/UPDATE/DELETE)
   * @param statement SQL 语句
   * @param params 参数
   */
  async run(statement: string, params?: unknown[]): Promise<unknown> {
    return this.sendRequest({ type: 'run', statement, params })
  }

  /**
   * 执行读操作 - 单条
   * @param statement SQL 语句
   * @param params 参数
   */
  async get(statement: string, params?: unknown[]): Promise<unknown> {
    return this.sendRequest({ type: 'get', statement, params })
  }

  /**
   * 执行读操作 - 列表
   * @param statement SQL 语句
   * @param params 参数
   */
  async all(statement: string, params?: unknown[]): Promise<unknown[]> {
    return this.sendRequest({ type: 'all', statement, params }) as Promise<unknown[]>
  }

  /**
   * 执行语句
   * @param statement SQL 语句
   */
  async exec(statement: string): Promise<boolean> {
    return this.sendRequest({ type: 'exec', statement }) as Promise<boolean>
  }

  /**
   * 开启事务
   * @param caller 调用者标识
   * @param operation 操作描述
   * @param transactionId 事务 ID
   */
  async beginTransaction(caller: string, operation: string, transactionId: string): Promise<void> {
    await this.sendRequest({
      type: 'transaction_begin',
      transactionId,
      caller,
      operation
    })
  }

  /**
   * 结束事务
   * @param transactionId 事务 ID
   * @param commit true 提交，false 回滚
   */
  async endTransaction(transactionId: string, commit: boolean): Promise<void> {
    await this.sendRequest({
      type: 'transaction_end',
      transactionId,
      commit
    })
  }

  /**
   * 创建保存点
   * @param transactionId 事务 ID
   * @param savepointName 保存点名称
   */
  async createSavepoint(transactionId: string, savepointName: string): Promise<void> {
    await this.sendRequest({
      type: 'transaction_savepoint',
      transactionId,
      savepointName
    })
  }

  /**
   * 释放保存点
   * @param transactionId 事务 ID
   * @param savepointName 保存点名称
   */
  async releaseSavepoint(transactionId: string, savepointName: string): Promise<void> {
    await this.sendRequest({
      type: 'transaction_release_savepoint',
      transactionId,
      savepointName
    })
  }

  /**
   * 回滚到保存点
   * @param transactionId 事务 ID
   * @param savepointName 保存点名称
   */
  async rollbackToSavepoint(transactionId: string, savepointName: string): Promise<void> {
    await this.sendRequest({
      type: 'transaction_rollback_savepoint',
      transactionId,
      savepointName
    })
  }
}
