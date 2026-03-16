import BetterSqlite3 from 'better-sqlite3'
import Database from 'better-sqlite3'
import LogUtil from '../util/LogUtil.ts'
import { Connection, RequestWeight } from '../core/classes/ConnectionPool.ts'
import { getConnectionPool } from '../core/connectionPool.ts'
import { isNotBlank } from '@shared/util/StringUtil.ts'
import { TransactionContext } from './TransactionContext.ts'

/**
 * 数据库客户端
 */
export default class DatabaseClient {
  /**
   * 数据库链接
   * @private
   */
  private readingConnection: Connection | undefined = undefined
  /**
   * 数据库链接
   * @private
   */
  private writingConnection: Connection | undefined = undefined
  /**
   * 调用者
   * @private
   */
  private readonly caller: string
  /**
   * acquire请求的缓存，防止异步调用prepare方法时重复请求链接
   * @private
   */
  private readingAcquirePromise: Promise<Connection> | null = null
  /**
   * acquire请求的缓存，防止异步调用prepare方法时重复请求链接
   * @private
   */
  private writingAcquirePromise: Promise<Connection> | null = null

  constructor(caller: string) {
    if (isNotBlank(caller)) {
      this.caller = caller
    } else {
      this.caller = 'unknown'
    }

    // 封装类被回收时，释放链接
    const weakThis = new WeakRef(this)
    const fin = new FinalizationRegistry((callback: () => void) => callback())
    fin.register(this, this.beforeDestroy, weakThis)
  }

  /**
   * 预处理语句
   * @param statement 语句
   * @param read 读还是写（true：读，false：写）
   */
  public async prepare<BindParameters extends unknown[], Result = unknown>(
    statement: string,
    read: boolean
  ): Promise<Database.Statement<BindParameters, Result>> {
    // 为了在同一个DB对象中能够查看到事务未提交的更改，如果处于事务中，则无论读写，这次请求都作为写操作
    let readOnly: boolean
    if (read) {
      readOnly = !TransactionContext.inTransaction()
    } else {
      readOnly = false
    }
    const connectionPromise = this.acquire(readOnly)
    return connectionPromise
      .then((connection) => {
        LogUtil.debug(this.caller, `${(connection.readonly ? 'R-' : 'W-') + connection.index} [PREPARE-SQL] ${statement}`)
        return connection.connection.prepare<BindParameters, Result>(statement)
      })
      .catch((error) => {
        LogUtil.error(this.caller, `[PREPARE-SQL] ${statement}`, error)
        throw error
      })
  }

  /**
   * run方法的封装
   * @param statement
   * @param params
   */
  public async run<BindParameters extends unknown[], Result = unknown>(
    statement: string,
    ...params: BindParameters
  ): Promise<Database.RunResult> {
    try {
      const prepare = await this.prepare<BindParameters, Result>(statement, false)
      LogUtil.debug(this.caller, `[SQL] ${statement}\n\t[PARAMS] ${JSON.stringify(params)}`)
      return prepare.run(...params)
    } catch (error) {
      LogUtil.error(this.caller, error, `\n[SQL] ${statement}\n\t[PARAMS] ${JSON.stringify(params)}`)
      throw error
    }
  }
  public async get<BindParameters extends unknown[], Result = unknown>(
    statement: string,
    ...params: BindParameters
  ): Promise<Result | undefined> {
    try {
      const prepare = await this.prepare<BindParameters, Result>(statement, true)
      LogUtil.debug(this.caller, `[SQL] ${statement}\n\t[PARAMS] ${JSON.stringify(params)}`)
      return prepare.get(...params)
    } catch (error) {
      LogUtil.error(this.caller, error, `\n[SQL] ${statement}\n\t[PARAMS] ${JSON.stringify(params)}`)
      throw error
    }
  }
  public async all<BindParameters extends unknown[], Result = unknown>(
    statement: string,
    ...params: BindParameters
  ): Promise<Result[]> {
    try {
      const prepare = await this.prepare<BindParameters, Result>(statement, true)
      LogUtil.debug(this.caller, `[SQL] ${statement}\n\t[PARAMS] ${JSON.stringify(params)}`)
      return prepare.all(...params)
    } catch (error) {
      LogUtil.error(this.caller, error, `\n[SQL] ${statement}\n\t[PARAMS] ${JSON.stringify(params)}`)
      throw error
    }
  }
  public async iterate<BindParameters extends unknown[], Result = unknown>(
    statement: string,
    ...params: BindParameters
  ): Promise<IterableIterator<Result>> {
    return this.prepare<BindParameters, Result>(statement, true)
      .then((r) => r.iterate(...params))
      .catch((error) => {
        LogUtil.error(this.caller, error)
        throw error
      })
  }
  public async pluck(statement: string, toggleState?: boolean): Promise<Database.Statement> {
    return this.prepare(statement, true)
      .then((r) => r.pluck(toggleState))
      .catch((error) => {
        LogUtil.error(this.caller, error)
        throw error
      })
  }
  public async expand(statement: string, toggleState?: boolean): Promise<Database.Statement> {
    return this.prepare(statement, true)
      .then((r) => r.expand(toggleState))
      .catch((error) => {
        LogUtil.error(this.caller, error)
        throw error
      })
  }
  public async raw(statement: string, toggleState?: boolean): Promise<Database.Statement> {
    return this.prepare(statement, true)
      .then((r) => r.raw(toggleState))
      .catch((error) => {
        LogUtil.error(this.caller, error)
        throw error
      })
  }
  public async bind<BindParameters extends unknown[], Result = unknown>(
    statement: string,
    ...params: BindParameters
  ): Promise<Database.Statement<BindParameters, Result>> {
    return this.prepare<BindParameters, Result>(statement, true)
      .then((asyncStatement) => asyncStatement.bind(...params))
      .catch((error) => {
        LogUtil.error(this.caller, error)
        throw error
      })
  }
  public async columns(statement: string): Promise<Database.ColumnDefinition[]> {
    return this.prepare(statement, true)
      .then((r) => r.columns())
      .catch((error) => {
        LogUtil.error(this.caller, error)
        throw error
      })
  }
  async safeIntegers(statement: string, toggleState?: boolean): Promise<Database.Statement> {
    return this.prepare(statement, true)
      .then((r) => r.safeIntegers(toggleState))
      .catch((error) => {
        LogUtil.error(this.caller, error)
        throw error
      })
  }

  /**
   * 释放连接
   */
  public release() {
    if (this.readingConnection != undefined) {
      this.readingConnection.release()
      this.readingConnection = undefined
    }
    if (this.writingConnection != undefined) {
      this.writingConnection.release()
      this.writingConnection = undefined
    }
  }

  /**
   * 执行语句
   */
  public async exec(statement: string): Promise<BetterSqlite3.Database> {
    const connectionPromise = this.acquire(false)
    return connectionPromise.then((connection) => connection.connection.exec(statement))
  }

  /**
   * 请求链接
   * 优先从事务上下文获取连接，其次从连接池获取
   * @param readOnly 读还是写（true：读，false：写）
   * @private
   */
  private async acquire(readOnly: boolean): Promise<Connection> {
    // 优先从事务上下文获取连接
    const ctxConn = TransactionContext.getConnection()
    if (ctxConn !== undefined) {
      return ctxConn
    }

    if (readOnly) {
      if (this.readingConnection != undefined) {
        return this.readingConnection
      }
      if (this.readingAcquirePromise === null) {
        this.readingAcquirePromise = (async () => {
          this.readingConnection = await getConnectionPool().acquire(true, RequestWeight.LOW)
          this.readingAcquirePromise = null
          // 为每个链接注册REGEXP函数，以支持正则表达式
          this.readingConnection.connection.function('REGEXP', (pattern, string) => {
            const regex = new RegExp(pattern as string)
            return regex.test(string as string) ? 1 : 0
          })
          return this.readingConnection
        })()
      }
      return this.readingAcquirePromise
    } else {
      if (this.writingConnection != undefined) {
        return this.writingConnection
      }
      if (this.writingAcquirePromise === null) {
        this.writingAcquirePromise = (async () => {
          this.writingConnection = await getConnectionPool().acquire(false, RequestWeight.LOW)
          this.writingAcquirePromise = null
          // 为每个链接注册REGEXP函数，以支持正则表达式
          this.writingConnection.connection.function('REGEXP', (pattern, string) => {
            const regex = new RegExp(pattern as string)
            return regex.test(string as string) ? 1 : 0
          })
          return this.writingConnection
        })()
      }
      return this.writingAcquirePromise
    }
  }

  /**
   * 实例销毁之前的回调
   * @private
   */
  private beforeDestroy(): void {
    this.release()
    LogUtil.info(this.caller, '数据库链接在封装实例销毁时被释放')
  }
}
