import BetterSqlite3, { Transaction } from 'better-sqlite3'
import LogUtil from '../util/LogUtil.ts'
import StringUtil from '../util/StringUtil.ts'

/**
 * 数据库链接池封装
 */
export default class DB {
  /**
   * 数据库链接
   * @private
   */
  private connection: BetterSqlite3.Database | undefined = undefined
  /**
   * 调用者
   * @private
   */
  private readonly caller: string
  /**
   * acquire请求的缓存，防止异步调用prepare方法时重复请求链接
   * @private
   */
  private acquirePromise: Promise<BetterSqlite3.Database> | null = null

  constructor(caller: string) {
    if (StringUtil.isNotBlank(caller)) {
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
   * @param statement
   */
  public async prepare(statement: string): Promise<BetterSqlite3.Statement> {
    const connectionPromise = this.acquire()
    return connectionPromise.then((connection) => connection.prepare(statement))
  }

  /**
   * 释放连接
   */
  public release() {
    if (this.connection != undefined) {
      global.connectionPool.release(this.connection)
    }
  }

  /**
   * 执行语句
   */
  public async exec(statement: string): Promise<BetterSqlite3.Database> {
    const connectionPromise = this.acquire()
    return connectionPromise.then((connection) => connection.exec(statement))
  }

  /**
   * 事务
   */
  public async transaction<F extends (...params: any[]) => Promise<unknown>>(
    fn: F
  ): Promise<Transaction<F>> {
    const connection = await this.acquire()
    try {
      return connection.transaction(fn)
    } catch (error) {
      LogUtil.error('DB', error)
      throw error
    }
  }

  /**
   * 请求链接
   * @private
   */
  public async acquire(): Promise<BetterSqlite3.Database> {
    if (this.connection != undefined) {
      return this.connection
    }
    if (this.acquirePromise === null) {
      this.acquirePromise = (async () => {
        this.connection = (await global.connectionPool.acquire()) as BetterSqlite3.Database
        this.acquirePromise = null
        // 为每个链接注册REGEXP函数，以支持正则表达式
        this.connection.function('REGEXP', (pattern, string) => {
          const regex = new RegExp(pattern as string)
          return regex.test(string as string) ? 1 : 0
        })
        return this.connection
      })()
    }
    return this.acquirePromise
  }

  /**
   * 实例销毁之前的回调
   * @private
   */
  private beforeDestroy(): void {
    if (this.connection !== undefined && this.connection !== null) {
      this.release()
      LogUtil.info(this.caller, '数据库链接在封装实例销毁时被释放')
    }
  }
}
