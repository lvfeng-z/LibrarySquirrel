import BetterSqlite3 from 'better-sqlite3'
import LogUtil from '../util/LogUtil'
import StringUtil from '../util/StringUtil'

/**
 * 数据库链接池封装
 */
export class DB {
  /**
   * 数据库链接
   * @private
   */
  private connection: BetterSqlite3.Database | undefined = undefined
  /**
   * 调用者
   * @private
   */
  private caller: string

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
   * 请求链接
   * @param statement
   */
  public async prepare(statement: string): Promise<BetterSqlite3.Statement> {
    if (this.connection == undefined) {
      this.connection = await global.connectionPool.acquire()
    }
    return (this.connection as BetterSqlite3.Database).prepare(statement)
  }

  /**
   * 释放连接
   */
  public release() {
    global.connectionPool.release(this.connection)
  }
}
