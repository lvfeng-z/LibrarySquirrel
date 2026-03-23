import { parentPort } from 'worker_threads'
import BetterSqlite3 from 'better-sqlite3'
import { DatabaseRequest, DatabaseResponse } from './DatabaseIpcTypes.ts'
import log from '../util/LogUtil.ts'
import { workerData } from 'worker_threads'
import { notNullish } from '@shared/util/CommonUtil.ts'

/**
 * 注册 REGEXP 函数到数据库连接
 */
function registerRegexpFunction(connection: BetterSqlite3.Database): void {
  connection.function('REGEXP', (pattern, string) => {
    const regex = new RegExp(pattern as string)
    return regex.test(string as string) ? 1 : 0
  })
}

/**
 * 数据库客户端封装
 * 在 Worker 线程中使用
 */
class DatabaseClient {
  private readonly connection: BetterSqlite3.Database

  constructor() {
    const dbPath = workerData.dbPath
    log.info('DatabaseWorker', `初始化数据库连接: ${dbPath}`)
    this.connection = new BetterSqlite3(dbPath)
    this.connection.pragma('journal_mode = WAL')
    this.connection.pragma('foreign_keys = ON')
    registerRegexpFunction(this.connection)
  }

  /**
   * 执行写操作
   */
  run(statement: string, params?: unknown[]): BetterSqlite3.RunResult {
    log.debug('DatabaseWorker', `[SQL] ${statement}`)
    return this.connection.prepare(statement).run(...(params || []))
  }

  /**
   * 执行读操作 - 单条
   */
  get(statement: string, params?: unknown[]): unknown {
    log.debug('DatabaseWorker', `[SQL] ${statement}`)
    return this.connection.prepare(statement).get(...(params || []))
  }

  /**
   * 执行读操作 - 列表
   */
  all(statement: string, params?: unknown[]): unknown[] {
    log.debug('DatabaseWorker', `[SQL] ${statement}`)
    return this.connection.prepare(statement).all(...(params || []))
  }

  /**
   * 执行语句
   */
  exec(statement: string): void {
    log.debug('DatabaseWorker', `[SQL] ${statement}`)
    this.connection.exec(statement)
  }

  /**
   * 开启事务
   */
  begin(): void {
    this.connection.exec('BEGIN')
    log.debug('DatabaseWorker', 'BEGIN')
  }

  /**
   * 提交事务
   */
  commit(): void {
    this.connection.exec('COMMIT')
    log.debug('DatabaseWorker', 'COMMIT')
  }

  /**
   * 回滚事务
   */
  rollback(): void {
    this.connection.exec('ROLLBACK')
    log.debug('DatabaseWorker', 'ROLLBACK')
  }

  /**
   * 创建保存点
   */
  savepoint(name: string): void {
    this.connection.exec(`SAVEPOINT ${name}`)
    log.debug('DatabaseWorker', `SAVEPOINT ${name}`)
  }

  /**
   * 释放保存点
   */
  release(name: string): void {
    this.connection.exec(`RELEASE ${name}`)
    log.debug('DatabaseWorker', `RELEASE ${name}`)
  }

  /**
   * 回滚到保存点
   */
  rollbackTo(name: string): void {
    this.connection.exec(`ROLLBACK TO SAVEPOINT ${name}`)
    log.debug('DatabaseWorker', `ROLLBACK TO SAVEPOINT ${name}`)
  }

  /**
   * 关闭连接
   */
  close(): void {
    this.connection.close()
  }
}

/**
 * 事务管理器
 * 管理嵌套事务
 */
class TransactionManager {
  private client: DatabaseClient
  private transactionStack: string[]
  private savepointCounter: number

  constructor(client: DatabaseClient) {
    this.client = client
    this.transactionStack = []
    this.savepointCounter = 0
  }

  /**
   * 开始最外层事务
   */
  begin(): void {
    this.client.begin()
    this.transactionStack.push('transaction')
  }

  /**
   * 创建保存点（嵌套事务）
   */
  savepoint(): string {
    const name = `sp${this.savepointCounter++}`
    this.client.savepoint(name)
    this.transactionStack.push(name)
    return name
  }

  /**
   * 提交
   */
  commit(): void {
    const top = this.transactionStack.pop()
    if (top === 'transaction') {
      this.client.commit()
    } else if (top) {
      this.client.release(top)
    }
  }

  /**
   * 回滚
   */
  rollback(): void {
    const top = this.transactionStack.pop()
    if (top === 'transaction') {
      this.client.rollback()
    } else if (top) {
      this.client.rollbackTo(top)
    }
  }

  /**
   * 检查是否在事务中
   */
  inTransaction(): boolean {
    return this.transactionStack.length > 0
  }
}

// 初始化数据库客户端和事务管理器
let databaseClient: DatabaseClient
let transactionManager: TransactionManager

/**
 * 初始化数据库连接
 */
function initialize(): void {
  databaseClient = new DatabaseClient()
  transactionManager = new TransactionManager(databaseClient)
}

/**
 * 处理数据库请求
 */
function handleRequest(request: DatabaseRequest): DatabaseResponse {
  const { id, type, statement, params, savepointName } = request

  try {
    let result: unknown

    switch (type) {
      case 'run':
        result = databaseClient.run(statement!, params)
        break
      case 'get':
        result = databaseClient.get(statement!, params)
        break
      case 'all':
        result = databaseClient.all(statement!, params)
        break
      case 'exec':
        databaseClient.exec(statement!)
        result = undefined
        break
      case 'begin':
        transactionManager.begin()
        result = undefined
        break
      case 'commit':
        transactionManager.commit()
        result = undefined
        break
      case 'rollback':
        transactionManager.rollback()
        result = undefined
        break
      case 'savepoint':
        result = transactionManager.savepoint()
        break
      case 'release':
        if (savepointName) {
          transactionManager.commit()
        }
        result = undefined
        break
      case 'rollbackTo':
        if (savepointName) {
          transactionManager.rollback()
        }
        result = undefined
        break
      default:
        throw new Error(`Unknown request type: ${type}`)
    }

    return {
      id,
      success: true,
      data: result
    }
  } catch (error) {
    log.error('DatabaseWorker', error, `\n[Request] ${JSON.stringify(request)}`)
    return {
      id,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

// 初始化并监听主线程消息
initialize()

if (notNullish(parentPort)) {
  // 通知主线程 Worker 已准备好
  parentPort.postMessage({ type: 'ready' })

  parentPort.on('message', (request: DatabaseRequest) => {
    const response: DatabaseResponse = handleRequest(request)
    parentPort!.postMessage(response)
  })

  log.info('DatabaseWorker', 'Database Worker 已启动并监听')
}
