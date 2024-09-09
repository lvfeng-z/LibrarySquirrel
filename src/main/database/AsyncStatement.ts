import Database from 'better-sqlite3'
import LogUtil from '../util/LogUtil.ts'
import { GlobalVarManager, GlobalVars } from '../GlobalVar.ts'

/**
 * 封装的Better-SQLit3 Statement类
 */
export default class AsyncStatement {
  /**
   * Better-SQLit3的Statement对象
   * @private
   */
  private statement: Database.Statement

  /**
   * 是否持有虚拟锁
   * @private
   */
  private holdingVisualLock: boolean

  /**
   * 虚拟锁是不是注入的
   * @private
   */
  private readonly injectedLock: boolean

  /**
   * 调用者
   * @private
   */
  private readonly caller: string

  constructor(statement: Database.Statement, holdingVisualLock: boolean, caller: string) {
    this.statement = statement
    this.holdingVisualLock = holdingVisualLock
    this.injectedLock = holdingVisualLock
    this.caller = caller
  }

  /**
   * run方法的封装
   * @param params
   */
  async run(...params: unknown[]): Promise<Database.RunResult> {
    try {
      // 获取虚拟的排它锁
      if (!this.holdingVisualLock) {
        await GlobalVarManager.get(GlobalVars.WRITING_CONNECTION_POOL).acquireVisualLock(
          this.caller
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
      // 释放虚拟的排它锁
      if (this.holdingVisualLock && !this.injectedLock) {
        GlobalVarManager.get(GlobalVars.WRITING_CONNECTION_POOL).releaseVisualLock(this.caller)
      }
    }
  }
  get(...params: unknown[]): unknown | undefined {
    LogUtil.debug(
      'AsyncStatement',
      `[SQL] ${this.statement.source}\n[PARAMS] ${JSON.stringify(params)}`
    )
    return this.statement.get(...params)
  }
  all(...params: unknown[]): unknown[] {
    LogUtil.debug(
      'AsyncStatement',
      `[SQL] ${this.statement.source}\n[PARAMS] ${JSON.stringify(params)}`
    )
    return this.statement.all(...params) as unknown[]
  }
  iterate(...params: unknown[]): IterableIterator<unknown> {
    return this.statement.iterate(...params) as IterableIterator<unknown>
  }
  pluck(toggleState?: boolean): Database.Statement {
    return this.statement.pluck(toggleState) as Database.Statement
  }
  expand(toggleState?: boolean): Database.Statement {
    return this.statement.expand(toggleState) as Database.Statement
  }
  raw(toggleState?: boolean): Database.Statement {
    return this.statement.raw(toggleState) as Database.Statement
  }
  bind(...params: unknown[]): Database.Statement {
    return this.statement.bind(...params) as Database.Statement
  }
  columns(): Database.ColumnDefinition[] {
    return this.statement.columns()
  }
  safeIntegers(toggleState?: boolean): Database.Statement {
    return this.statement.safeIntegers(toggleState) as Database.Statement
  }
}
