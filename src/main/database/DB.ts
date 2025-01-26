import BetterSqlite3 from 'better-sqlite3'
import Database from 'better-sqlite3'
import LogUtil from '../util/LogUtil.ts'
import StringUtil from '../util/StringUtil.ts'
import AsyncStatement from './AsyncStatement.ts'
import { GlobalVar, GlobalVars } from '../base/GlobalVar.ts'
import { Connection, RequestWeight } from './ConnectionPool.ts'

/**
 * 数据库链接池封装
 */
export default class DB {
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
  /**
   * 事务保存点计数器
   * @private
   */
  private savepointCounter = 0

  /**
   * 是否处于事务中
   * @private
   */
  private inTransaction: boolean = false
  /**
   * 是否持有排他锁
   * @private
   */
  private holdingWriteLock: boolean

  constructor(caller: string) {
    if (StringUtil.isNotBlank(caller)) {
      this.caller = caller
    } else {
      this.caller = 'unknown'
    }
    this.holdingWriteLock = false

    // 封装类被回收时，释放链接
    const weakThis = new WeakRef(this)
    const fin = new FinalizationRegistry((callback: () => void) => callback())
    fin.register(this, this.beforeDestroy, weakThis)
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
    return await (await this.prepare<BindParameters, Result>(statement, false)).run(...params).catch((error) => {
      LogUtil.error(this.caller, error)
      throw error
    })
  }
  public async get<BindParameters extends unknown[], Result = unknown>(
    statement: string,
    ...params: BindParameters
  ): Promise<Result | undefined> {
    return this.prepare<BindParameters, Result>(statement, true)
      .then((asyncStatement) => asyncStatement.get(...params))
      .catch((error) => {
        LogUtil.error(this.caller, error)
        throw error
      })
  }
  public async all<BindParameters extends unknown[], Result = unknown>(
    statement: string,
    ...params: BindParameters
  ): Promise<Result[]> {
    return this.prepare<BindParameters, Result>(statement, true)
      .then((asyncStatement) => asyncStatement.all(...params))
      .catch((error) => {
        LogUtil.error(this.caller, error)
        throw error
      })
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
   * 预处理语句
   * @param statement 语句
   * @param read 读还是写（true：读，false：写）
   */
  public async prepare<BindParameters extends unknown[], Result = unknown>(
    statement: string,
    read: boolean
  ): Promise<AsyncStatement<BindParameters, Result>> {
    // 如果实例处于事务中，则无论读写，这次请求都作为写操作，这是为了在同一个DB对象中能够查看到事务未提交的更改
    let readOnly: boolean
    if (read) {
      readOnly = !this.inTransaction
    } else {
      readOnly = false
    }
    const connectionPromise = this.acquire(readOnly)
    return connectionPromise
      .then((connection) => {
        LogUtil.debug(this.caller, `[PREPARE-SQL] ${statement}`)
        const stmt = connection.prepare<BindParameters, Result>(statement)
        return new AsyncStatement<BindParameters, Result>(stmt, this.holdingWriteLock, this.caller)
      })
      .catch((error) => {
        LogUtil.error(this.caller, `[PREPARE-SQL] ${statement}`, error)
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
    return connectionPromise.then((connection) => connection.exec(statement))
  }

  /**
   * 事务
   * @param fn 事务代码
   * @param operation 操作说明
   */
  public async transaction<F extends (db: DB) => Promise<R>, R>(fn: F, operation: string): Promise<R> {
    const connection = await this.acquire(false)
    // 记录是否为事务最外层保存点
    const isStartPoint = this.savepointCounter === 0
    // 标记当前DB实例处于事务中
    this.inTransaction = true
    // 创建一个当前层级的保存点
    const savepointName = `sp${this.savepointCounter++}`
    // 开启事务之前获取排他锁
    if (!this.holdingWriteLock) {
      await GlobalVar.get(GlobalVars.CONNECTION_POOL).acquireLock(this.caller, operation)
      this.holdingWriteLock = true
    }

    try {
      connection.exec(`SAVEPOINT ${savepointName}`)
      LogUtil.debug(this.caller, `${operation}，SAVEPOINT ${savepointName}`)
    } catch (error) {
      // 释放排他锁
      if (this.holdingWriteLock && isStartPoint) {
        GlobalVar.get(GlobalVars.CONNECTION_POOL).releaseLock(`${this.caller}_${operation}`)
        this.holdingWriteLock = false
      }
      LogUtil.error(this.caller, `创建保存点失败，释放排他锁: ${operation}，SAVEPOINT ${savepointName}`, error)
      throw error
    }

    return fn(this)
      .then((result) => {
        // 事务代码顺利执行的话释放此保存点
        connection.exec(`RELEASE ${savepointName}`)
        this.savepointCounter--
        LogUtil.debug(this.caller, `${operation}，RELEASE ${savepointName}，result: ${result}`)

        // 如果是最外层保存点，标记当前DB实例已经不处于事务中
        if (isStartPoint) {
          this.inTransaction = false
        }

        return result
      })
      .catch((error) => {
        // 如果是最外层保存点，通过ROLLBACK释放排他锁，防止异步执行多个事务时，某个事务发生异常，但是由于异步执行无法立即释放链接，导致排他锁一直无法释放
        if (isStartPoint) {
          connection.exec(`ROLLBACK`)
          LogUtil.debug(this.caller, `${operation}，ROLLBACK`)

          // 标记当前DB实例已经不处于事务中
          this.inTransaction = false

          // 释放排他锁
          GlobalVar.get(GlobalVars.CONNECTION_POOL).releaseLock(`${this.caller}_${operation}`)
          this.holdingWriteLock = false
        } else {
          // 事务代码出现异常的话回滚至此保存点
          connection.exec(`ROLLBACK TO SAVEPOINT ${savepointName}`)
          LogUtil.debug(this.caller, `${operation}，ROLLBACK TO SAVEPOINT ${savepointName}`)
        }

        this.savepointCounter--
        LogUtil.error(this.caller, error)
        throw error
      })
      .finally(() => {
        // 释放排他锁
        if (this.holdingWriteLock && isStartPoint) {
          GlobalVar.get(GlobalVars.CONNECTION_POOL).releaseLock(`${this.caller}_${operation}`)
          this.holdingWriteLock = false
        }
      })
  }

  /**
   * 请求链接
   * @param readOnly 读还是写（true：读，false：写）
   * @private
   */
  private async acquire(readOnly: boolean): Promise<BetterSqlite3.Database> {
    if (readOnly) {
      if (this.readingConnection != undefined) {
        return this.readingConnection.connection
      }
      if (this.readingAcquirePromise === null) {
        this.readingAcquirePromise = (async () => {
          this.readingConnection = await GlobalVar.get(GlobalVars.CONNECTION_POOL).acquire(true, RequestWeight.LOW)
          this.readingAcquirePromise = null
          // 为每个链接注册REGEXP函数，以支持正则表达式
          this.readingConnection.connection.function('REGEXP', (pattern, string) => {
            const regex = new RegExp(pattern as string)
            return regex.test(string as string) ? 1 : 0
          })
          return this.readingConnection
        })()
      }
      return this.readingAcquirePromise.then((connection) => connection.connection)
    } else {
      if (this.writingConnection != undefined) {
        return this.writingConnection.connection
      }
      if (this.writingAcquirePromise === null) {
        this.writingAcquirePromise = (async () => {
          this.writingConnection = await GlobalVar.get(GlobalVars.CONNECTION_POOL).acquire(false, RequestWeight.LOW)
          this.writingAcquirePromise = null
          // 为每个链接注册REGEXP函数，以支持正则表达式
          this.writingConnection.connection.function('REGEXP', (pattern, string) => {
            const regex = new RegExp(pattern as string)
            return regex.test(string as string) ? 1 : 0
          })
          return this.writingConnection
        })()
      }
      return this.writingAcquirePromise.then((connection) => connection.connection)
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
