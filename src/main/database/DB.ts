import BetterSqlite3 from 'better-sqlite3'
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

    // 封装类被回收时，释放链接，并提醒应该手动释放链接
    const finalizationRegistry = new FinalizationRegistry(() => {
      this.release()
      LogUtil.warn(this.caller, '数据库链接被垃圾回收机制释放，请手动释放链接！')
    })
    finalizationRegistry.register(this, undefined)
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
   * 请求链接
   * @private
   */
  private async acquire(): Promise<BetterSqlite3.Database> {
    if (this.connection != undefined) {
      return this.connection
    }
    if (this.acquirePromise === null) {
      this.acquirePromise = (async () => {
        this.connection = (await global.connectionPool.acquire()) as BetterSqlite3.Database
        this.acquirePromise = null
        return this.connection
      })()
    }
    return this.acquirePromise
  }
}
