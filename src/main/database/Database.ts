import BetterSqlite3 from 'better-sqlite3'
import { TransactionContext } from './TransactionContext.ts'
import { DatabaseRequest, DatabaseResponse, generateRequestId } from '../worker/DatabaseIpcTypes.ts'
import { getDbWorker } from '../core/dbWorker.ts'

const pendingRequests = new Map()
/**
 * 数据库访问入口
 * 将请求转发到 Worker 线程执行
 * 事务中自动使用主线程连接
 */
export class Database {
  /**
   * 执行写操作 (INSERT/UPDATE/DELETE)
   * @param statement SQL 语句
   * @param params 参数
   * @returns 执行结果
   */
  static async run<BindParameters extends unknown[]>(statement: string, ...params: BindParameters): Promise<BetterSqlite3.RunResult> {
    // 事务中：不通过 Worker，直接使用 TransactionContext 的连接
    if (TransactionContext.inTransaction()) {
      return TransactionContext.runInCurrentTransaction(statement, params)
    }

    return this.sendRequest<BetterSqlite3.RunResult>('run', { statement, params })
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
    // 事务中
    if (TransactionContext.inTransaction()) {
      return TransactionContext.getFromCurrentTransaction(statement, params) as Result | undefined
    }

    return this.sendRequest<Result>('get', { statement, params })
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
    // 事务中
    if (TransactionContext.inTransaction()) {
      return TransactionContext.allFromCurrentTransaction(statement, params) as Result[]
    }

    return this.sendRequest<Result[]>('all', { statement, params })
  }

  /**
   * 执行语句
   */
  public static async exec(statement: string): Promise<BetterSqlite3.Database> {
    await this.sendRequest<void>('exec', { statement })
    return {} as BetterSqlite3.Database
  }

  /**
   * 检查是否在事务中
   */
  static inTransaction(): boolean {
    return TransactionContext.inTransaction()
  }

  /**
   * 发送请求到 Worker 并等待响应
   */
  static async sendRequest<T>(
    type: DatabaseRequest['type'],
    options?: {
      statement?: string
      params?: unknown[]
      savepointName?: string
    }
  ): Promise<T> {
    const id = generateRequestId()
    const request: DatabaseRequest = {
      id,
      type,
      statement: options?.statement,
      params: options?.params,
      savepointName: options?.savepointName
    }

    return new Promise((resolve, reject) => {
      pendingRequests.set(id, { resolve: resolve as (value: unknown) => void, reject })

      const dbWorker = getDbWorker()
      dbWorker.on('message', (msg: DatabaseResponse) => {
        if (id === msg.id) {
          if (msg.success) {
            resolve(msg.data as T)
          } else {
            reject(msg.error)
          }
        }
      })
      dbWorker.postMessage(request)

      // 添加超时处理
      setTimeout(() => {
        if (pendingRequests.has(id)) {
          pendingRequests.delete(id)
          reject(new Error(`数据库操作超时: ${type}`))
        }
      }, 1000)
    })
  }
}
