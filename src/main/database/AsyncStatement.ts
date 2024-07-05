import Database from 'better-sqlite3'
import LogUtil from '../util/LogUtil.ts'

export default class AsyncStatement {
  statement: Database.Statement

  constructor(statement: Database.Statement) {
    this.statement = statement
  }

  async run(...params: unknown[]): Promise<Database.RunResult> {
    // 开启事务之前获取虚拟的排它锁
    try {
      await global.connectionPool.acquireVisualLock()
      const runResult = this.statement.run(...params)
      LogUtil.debug(
        'AsyncStatement',
        `SQL: ${this.statement.source}\nPARAMS: ${JSON.stringify(params)}`
      )
      return runResult
    } finally {
      // 释放虚拟的排它锁
      global.connectionPool.releaseVisualLock()
    }
  }
  get(...params: unknown[]): unknown | undefined {
    return this.statement.get(...params)
  }
  all(...params: unknown[]): unknown[] {
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
