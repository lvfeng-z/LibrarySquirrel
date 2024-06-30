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
  /**
   * 事务保存点计数器
   * @private
   */
  private savepointCounter = 0
  /**
   * 事务保存点数组
   * @private
   */
  private savepointNames: string[] = []

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
   * 简单的事务
   * @param fn 事务代码
   */
  public async simpleTransaction<F extends (db: DB) => Promise<unknown>>(fn: F): Promise<void> {
    const connection = await this.acquire()
    try {
      connection.exec('BEGIN')
      await fn(this)
      connection.exec('COMMIT')
    } catch (error) {
      connection.exec('ROLLBACK')
      LogUtil.error('DB', error)
      throw error
    }
  }

  /**
   * 可嵌套的事务
   * @param fn 事务代码
   */
  public async nestedTransaction<F extends (db: DB) => Promise<unknown>>(fn: F): Promise<unknown> {
    const connection = await this.acquire()
    try {
      // 创建一个当前层级的保存点
      const savepointName = `sp${this.savepointCounter++}`
      this.savepointNames.push(savepointName)
      connection.exec(`SAVEPOINT ${savepointName}`)

      const result = await fn(this)

      // 事务代码顺利执行的话释放此保存点
      connection.exec(`RELEASE ${savepointName}`)
      this.savepointNames.pop()
      return result
    } catch (error) {
      // 事务代码出现异常的话回滚至此保存点
      if (this.savepointNames.length > 0) {
        const lastSavepoint = this.savepointNames[this.savepointNames.length - 1]
        connection.exec(`ROLLBACK TO SAVEPOINT ${lastSavepoint}`)
      }

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
