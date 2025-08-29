import BetterSqlite3 from 'better-sqlite3'
import Database from 'better-sqlite3'
import LogUtil from '../util/LogUtil.ts'
import StringUtil from '../util/StringUtil.ts'
import { GVar, GVarEnum } from '../base/GVar.ts'
import { Connection, RequestWeight } from './ConnectionPool.ts'

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
  private holdingLock: boolean

  constructor(caller: string) {
    if (StringUtil.isNotBlank(caller)) {
      this.caller = caller
    } else {
      this.caller = 'unknown'
    }
    this.holdingLock = false

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
    // 为了在同一个DB对象中能够查看到事务未提交的更改，如果实例处于事务中，则无论读写，这次请求都作为写操作
    let readOnly: boolean
    if (read) {
      readOnly = !this.inTransaction
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
    const connectionPool = GVar.get(GVarEnum.CONNECTION_POOL)
    try {
      // 获取排他锁
      if (!this.holdingLock) {
        await connectionPool.acquireLock(this.caller, statement)
        this.holdingLock = true
      }
      const prepare = await this.prepare<BindParameters, Result>(statement, false)
      LogUtil.debug(this.caller, `[SQL] ${statement}\n\t[PARAMS] ${JSON.stringify(params)}`)
      return prepare.run(...params)
    } catch (error) {
      LogUtil.error(this.caller, error, `\n[SQL] ${statement}\n\t[PARAMS] ${JSON.stringify(params)}`)
      throw error
    } finally {
      if (this.holdingLock && !this.inTransaction) {
        connectionPool.releaseLock(this.caller)
        this.holdingLock = false
      }
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
   * 事务
   * @param fn 事务代码
   * @param operation 操作说明
   */
  public async transaction<R>(fn: (db?: DatabaseClient) => Promise<R>, operation: string): Promise<R> {
    const connection = await this.acquire(false)
    // 记录是否为事务最外层保存点
    const isStartPoint = this.savepointCounter === 0
    // 标记当前DB实例处于事务中
    this.inTransaction = true
    // 创建一个当前层级的保存点
    const savepointName = `sp${this.savepointCounter++}`
    // 开启事务之前获取排他锁
    if (!this.holdingLock) {
      await GVar.get(GVarEnum.CONNECTION_POOL).acquireLock(this.caller, operation)
      this.holdingLock = true
    }

    try {
      connection.connection.exec(`SAVEPOINT ${savepointName}`)
      LogUtil.debug(this.caller, `${operation}，SAVEPOINT ${savepointName}`)
    } catch (error) {
      // 释放排他锁
      if (this.holdingLock && isStartPoint) {
        GVar.get(GVarEnum.CONNECTION_POOL).releaseLock(`${this.caller}_${operation}`)
        this.holdingLock = false
      }
      LogUtil.error(this.caller, `创建保存点失败，释放排他锁: ${operation}，SAVEPOINT ${savepointName}`, error)
      throw error
    }

    return fn(this)
      .then((result) => {
        // 事务代码顺利执行的话释放此保存点
        connection.connection.exec(`RELEASE ${savepointName}`)
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
          connection.connection.exec(`ROLLBACK`)
          LogUtil.debug(this.caller, `${operation}，ROLLBACK`)

          // 标记当前DB实例已经不处于事务中
          this.inTransaction = false

          // 释放排他锁
          GVar.get(GVarEnum.CONNECTION_POOL).releaseLock(`${this.caller}_${operation}`)
          this.holdingLock = false
        } else {
          // 事务代码出现异常的话回滚至此保存点
          connection.connection.exec(`ROLLBACK TO SAVEPOINT ${savepointName}`)
          LogUtil.debug(this.caller, `${operation}，ROLLBACK TO SAVEPOINT ${savepointName}`)
        }

        this.savepointCounter--
        LogUtil.error(this.caller, error)
        throw error
      })
      .finally(() => {
        // 释放排他锁
        if (this.holdingLock && isStartPoint) {
          GVar.get(GVarEnum.CONNECTION_POOL).releaseLock(`${this.caller}_${operation}`)
          this.holdingLock = false
        }
      })
  }

  /**
   * 请求链接
   * @param readOnly 读还是写（true：读，false：写）
   * @private
   */
  private async acquire(readOnly: boolean): Promise<Connection> {
    if (readOnly) {
      if (this.readingConnection != undefined) {
        return this.readingConnection
      }
      if (this.readingAcquirePromise === null) {
        this.readingAcquirePromise = (async () => {
          this.readingConnection = await GVar.get(GVarEnum.CONNECTION_POOL).acquire(true, RequestWeight.LOW)
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
          this.writingConnection = await GVar.get(GVarEnum.CONNECTION_POOL).acquire(false, RequestWeight.LOW)
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
