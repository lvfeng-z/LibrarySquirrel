import DatabaseError from './DatabaseError.js'

export default class DatabaseSqlError extends DatabaseError {
  public readonly sql?: string
  public readonly params?: unknown

  constructor(code: string = 'DATABASE_SQL_ERROR', message: string, originalError?: Error, sql?: string, params?: unknown) {
    super(code, message, originalError)

    this.name = 'DatabaseSqlError'
    this.sql = sql
    this.params = params
  }
}
