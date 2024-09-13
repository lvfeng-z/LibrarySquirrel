import Database from 'better-sqlite3'
import LogUtil from '../util/LogUtil.ts'
import { GlobalVarManager, GlobalVars } from '../GlobalVar.ts'

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
  private holdingVisualLock: boolean

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

  constructor(
    statement: Database.Statement<BindParameters, Result>,
    holdingVisualLock: boolean,
    caller: string
  ) {
    this.statement = statement
    this.holdingVisualLock = holdingVisualLock
    this.injectedLock = holdingVisualLock
    this.caller = caller
  }

  /**
   * run方法的封装
   * @param params
   */
  async run(...params: BindParameters): Promise<Database.RunResult> {
    try {
      // 获取排他锁
      if (!this.holdingVisualLock) {
        await GlobalVarManager.get(GlobalVars.WRITING_CONNECTION_POOL).acquireVisualLock(
          this.caller,
          this.statement.source
        )
        this.holdingVisualLock = true
      }
      const runResult = this.statement.run(...params)
      LogUtil.debug(
        'AsyncStatement',
        `[SQL] ${this.statement.source}\n[PARAMS] ${JSON.stringify(params)}`
      )
      return runResult
    } finally {
      // 释放排他锁
      if (this.holdingVisualLock && !this.injectedLock) {
        GlobalVarManager.get(GlobalVars.WRITING_CONNECTION_POOL).releaseVisualLock(this.caller)
      }
    }
  }
  get(...params: BindParameters): undefined | Result {
    LogUtil.debug(
      'AsyncStatement',
      `[SQL] ${this.statement.source}\n[PARAMS] ${JSON.stringify(params)}`
    )
    return this.statement.get(...params)
  }
  all(...params: BindParameters): Result[] {
    LogUtil.debug(
      'AsyncStatement',
      `[SQL] ${this.statement.source}\n[PARAMS] ${JSON.stringify(params)}`
    )
    return this.statement.all(...params)
  }
  iterate(...params: BindParameters): IterableIterator<Result> {
    return this.statement.iterate(...params)
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
    return this.statement.bind(...params)
  }
  columns(): Database.ColumnDefinition[] {
    return this.statement.columns()
  }
  safeIntegers(toggleState?: boolean): Database.Statement<BindParameters, Result> {
    return this.statement.safeIntegers(toggleState)
  }
}
