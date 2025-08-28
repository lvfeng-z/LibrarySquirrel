import DatabaseError from './DatabaseError.js'

export default class ForeignKeyConstraintError extends DatabaseError {
  public readonly tableName?: string
  public readonly constraintName?: string
  public readonly referencedTable?: string
  public readonly referencedColumn?: string
  public readonly violatingValue?: string

  constructor(
    message: string = 'FOREIGN KEY constraint failed',
    code: string = 'SQLITE_CONSTRAINT_FOREIGN_KEY',
    originalError?: Error,
    sql?: string,
    params?: unknown,
    tableName?: string,
    constraintName?: string,
    referencedTable?: string,
    referencedColumn?: string,
    violatingValue?: string
  ) {
    super(message, code, originalError, sql, params)
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
