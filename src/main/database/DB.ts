import BetterSqlite3 from 'better-sqlite3'
import LogUtil from '../util/LogUtil.ts'
import StringUtil from '../util/StringUtil.ts'
import AsyncStatement from './AsyncStatement.ts'
import Database from 'better-sqlite3'

/**
 * 数据库链接池封装
 */
export default class DB {
  /**
   * 数据库链接
   * @private
   */
  private readingConnection: BetterSqlite3.Database | undefined = undefined
  /**
   * 数据库链接
   * @private
   */
  private writingConnection: BetterSqlite3.Database | undefined = undefined
  /**
   * 调用者
   * @private
   */
  private readonly caller: string
  /**
   * acquire请求的缓存，防止异步调用prepare方法时重复请求链接
   * @private
   */
  private readingAcquirePromise: Promise<BetterSqlite3.Database> | null = null
  /**
   * acquire请求的缓存，防止异步调用prepare方法时重复请求链接
   * @private
   */
  private writingAcquirePromise: Promise<BetterSqlite3.Database> | null = null
  /**
   * 事务保存点计数器
   * @private
   */
  private savepointCounter = 0
  /**
   * 是否持有虚拟锁
   * @private
   */
  private holdingVisualLock: boolean

  constructor(caller: string) {
    if (StringUtil.isNotBlank(caller)) {
      this.caller = caller
    } else {
      this.caller = 'unknown'
    }
    this.holdingVisualLock = false

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
  public async run(statement: string, ...params: unknown[]): Promise<Database.RunResult> {
    return await (await this.prepare(statement, false)).run(...params)
  }
  public async get(statement: string, ...params: unknown[]): Promise<unknown | undefined> {
    return await (await this.prepare(statement, true)).get(...params)
  }
  public async all(statement: string, ...params: unknown[]): Promise<unknown[]> {
    return (await this.prepare(statement, true)).all(...params)
  }
  public async iterate(
    statement: string,
    ...params: unknown[]
  ): Promise<IterableIterator<unknown>> {
    return (await this.prepare(statement, true)).iterate(...params)
  }
  public async pluck(statement: string, toggleState?: boolean): Promise<Database.Statement> {
    return (await this.prepare(statement, true)).pluck(toggleState)
  }
  public async expand(statement: string, toggleState?: boolean): Promise<Database.Statement> {
    return (await this.prepare(statement, true)).expand(toggleState)
  }
  public async raw(statement: string, toggleState?: boolean): Promise<Database.Statement> {
    return (await this.prepare(statement, true)).raw(toggleState)
  }
  public async bind(statement: string, ...params: unknown[]): Promise<Database.Statement> {
    return (await this.prepare(statement, true)).bind(...params)
  }
  public async columns(statement: string): Promise<Database.ColumnDefinition[]> {
    return (await this.prepare(statement, true)).columns()
  }
  async safeIntegers(statement: string, toggleState?: boolean): Promise<Database.Statement> {
    return (await this.prepare(statement, true)).safeIntegers(toggleState)
  }

  /**
   * 预处理语句
   * @param statement 语句
   * @param readOrWrite 读还是写（true：读，false：写）
   */
  public async prepare(statement: string, readOrWrite: boolean): Promise<AsyncStatement> {
    const connectionPromise = this.acquire(readOrWrite)
    return connectionPromise.then((connection) => {
      const stmt = connection.prepare(statement)
      return new AsyncStatement(stmt, this.holdingVisualLock)
    })
  }

  /**
   * 释放连接
   */
  public release() {
    if (this.readingConnection != undefined) {
      global.readingConnectionPool.release(this.readingConnection)
      this.readingConnection = undefined
    }
    if (this.writingConnection != undefined) {
      global.writingConnectionPool.release(this.writingConnection)
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
   * 可嵌套的事务
   * @param fn 事务代码
   * @param name
   */
  public async nestedTransaction<F extends (db: DB) => Promise<unknown>>(
    fn: F,
    name: string
  ): Promise<unknown> {
    const connection = await this.acquire(false)
    // 记录是否为事务最外层保存点
    const isStartPoint = this.savepointCounter === 0
    // 创建一个当前层级的保存点
    const savepointName = `sp${this.savepointCounter++}`
    try {
      // 开启事务之前获取虚拟的排它锁
      if (!this.holdingVisualLock) {
        await global.writingConnectionPool.acquireVisualLock()
        this.holdingVisualLock = true
      }

      connection.exec(`SAVEPOINT ${savepointName}`)
      LogUtil.debug('DB', `${name}，SAVEPOINT ${savepointName}`)

      const result = await fn(this)

      // 事务代码顺利执行的话释放此保存点
      connection.exec(`RELEASE ${savepointName}`)
      this.savepointCounter--
      LogUtil.debug('DB', `${name}，RELEASE ${savepointName}，result: ${result}`)

      return result
    } catch (error) {
      // 如果是最外层保存点，通过ROLLBACK释放排他锁，防止异步执行多个事务时，某个事务发生异常，但是由于异步执行无法立即释放链接，导致排它锁一直存在
      if (isStartPoint) {
        connection.exec(`ROLLBACK`)
        LogUtil.info('DB', `${name}，ROLLBACK`)

        // 释放虚拟的排它锁
        global.writingConnectionPool.releaseVisualLock()
      } else {
        // 事务代码出现异常的话回滚至此保存点
        connection.exec(`ROLLBACK TO SAVEPOINT ${savepointName}`)
        LogUtil.info('DB', `${name}，ROLLBACK TO SAVEPOINT ${savepointName}`)
      }

      this.savepointCounter = 0
      LogUtil.error('DB', error)
      throw error
    } finally {
      // 释放虚拟的排它锁
      if (this.holdingVisualLock && isStartPoint) {
        global.writingConnectionPool.releaseVisualLock()
        this.holdingVisualLock = false
      }
    }
  }

  /**
   * 请求链接
   * @param readOrWrite 读还是写（true：读，false：写）
   * @private
   */
  private async acquire(readOrWrite: boolean): Promise<BetterSqlite3.Database> {
    if (readOrWrite) {
      if (this.readingConnection != undefined) {
        return this.readingConnection
      }
      if (this.readingAcquirePromise === null) {
        this.readingAcquirePromise = (async () => {
          this.readingConnection =
            (await global.readingConnectionPool.acquire()) as BetterSqlite3.Database
          this.readingAcquirePromise = null
          // 为每个链接注册REGEXP函数，以支持正则表达式
          this.readingConnection.function('REGEXP', (pattern, string) => {
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
          this.writingConnection =
            (await global.writingConnectionPool.acquire()) as BetterSqlite3.Database
          this.writingAcquirePromise = null
          // 为每个链接注册REGEXP函数，以支持正则表达式
          this.writingConnection.function('REGEXP', (pattern, string) => {
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
