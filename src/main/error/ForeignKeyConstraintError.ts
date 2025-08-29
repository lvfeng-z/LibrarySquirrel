import DatabaseSqlError from './DatabaseSqlError.js'

export default class ForeignKeyConstraintError extends DatabaseSqlError {
  public readonly tableName?: string
  public readonly constraintName?: string
  public readonly referencedTable?: string
  public readonly referencedColumn?: string
  public readonly violatingValue?: string

  constructor(
    code: string = 'SQLITE_CONSTRAINT_FOREIGN_KEY',
    message: string = 'FOREIGN KEY constraint failed',
    originalError?: Error,
    sql?: string,
    params?: unknown,
    tableName?: string,
    constraintName?: string,
    referencedTable?: string,
    referencedColumn?: string,
    violatingValue?: string
  ) {
    super(code, message, originalError, sql, params)
    this.name = 'ForeignKeyConstraintError'
    this.tableName = tableName
    this.constraintName = constraintName
    this.referencedTable = referencedTable
    this.referencedColumn = referencedColumn
    this.violatingValue = violatingValue
  }

  public static isForeignKeyConstraintError(error: unknown) {
    return (
      (error as { code: string; message: string }).code === 'SQLITE_CONSTRAINT_TRIGGER' &&
      (error as { code: string; message: string }).message === 'FOREIGN KEY constraint failed'
    )
  }
}
