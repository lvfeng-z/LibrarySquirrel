import Database from 'better-sqlite3'
import LogUtil from '../util/LogUtil.ts'
import { GlobalVar, GlobalVars } from '../base/GlobalVar.ts'
import { NotNullish } from '../util/CommonUtil.js'

/**
 * 封装的Better-SQLit3 Statement类
 */
export default class AsyncStatement<BindParameters extends unknown[], Result = unknown> {
  /**
   * Better-SQLit3的Statement对象
   * @private
   */
  private statement: Database.Statement<BindParameters, Result>

  /**
   * 是否持有排他锁
   * @private
   */
  private holdingWriteLock: boolean

  /**
   * 排他锁是不是注入的
   * @private
   */
  private readonly injectedLock: boolean

  /**
   * 调用者
   * @private
   */
  private readonly caller: string

  constructor(statement: Database.Statement<BindParameters, Result>, holdingWriteLock: boolean, caller: string) {
    this.statement = statement
    this.holdingWriteLock = holdingWriteLock
    this.injectedLock = holdingWriteLock
    this.caller = caller
  }

  /**
   * BetterSqlite3 Statement的run方法的封装
   * @param params
   */
  async run(...params: BindParameters): Promise<Database.RunResult> {
    try {
      // 获取排他锁
      if (!this.holdingWriteLock) {
        await GlobalVar.get(GlobalVars.CONNECTION_POOL).acquireLock(this.caller, this.statement.source)
        this.holdingWriteLock = true
      }
      const runResult = this.statement.run(...params.filter(NotNullish))
      LogUtil.debug('AsyncStatement', `[SQL] ${this.statement.source}\n\t[PARAMS] ${JSON.stringify(params)}`)
      return runResult
    } finally {
      // 释放排他锁
      if (this.holdingWriteLock && !this.injectedLock) {
        GlobalVar.get(GlobalVars.CONNECTION_POOL).releaseLock(this.caller)
      }
    }
  }
  get(...params: BindParameters): undefined | Result {
    LogUtil.debug('AsyncStatement', `[SQL] ${this.statement.source}\n\t[PARAMS] ${JSON.stringify(params)}`)
    return this.statement.get(...params.filter(NotNullish))
  }
  all(...params: BindParameters): Result[] {
    LogUtil.debug('AsyncStatement', `[SQL] ${this.statement.source}\n\t[PARAMS] ${JSON.stringify(params)}`)
    return this.statement.all(...params.filter(NotNullish))
  }
  iterate(...params: BindParameters): IterableIterator<Result> {
    return this.statement.iterate(...params.filter(NotNullish))
  }
  pluck(toggleState?: boolean): Database.Statement<BindParameters, Result> {
    return this.statement.pluck(toggleState)
  }
  expand(toggleState?: boolean): Database.Statement<BindParameters, Result> {
    return this.statement.expand(toggleState)
  }
  raw(toggleState?: boolean): Database.Statement<BindParameters, Result> {
    return this.statement.raw(toggleState)
  }
  bind(...params: BindParameters): Database.Statement<BindParameters, Result> {
    return this.statement.bind(...params.filter(NotNullish))
  }
  columns(): Database.ColumnDefinition[] {
    return this.statement.columns()
  }
  safeIntegers(toggleState?: boolean): Database.Statement<BindParameters, Result> {
    return this.statement.safeIntegers(toggleState)
  }
}
