import ForeignKeyConstraintError from './ForeignKeyConstraintError.js'

export default class ForeignKeyInsertError extends ForeignKeyConstraintError {
  constructor(
    message: string = 'Cannot insert or update record due to missing foreign key reference',
    originalError?: Error,
    sql?: string,
    params?: unknown,
    tableName?: string,
    constraintName?: string,
    referencedTable?: string,
    referencedColumn?: string,
    violatingValue?: string
  ) {
    super(
      message,
      'SQLITE_CONSTRAINT_FOREIGN_KEY_INSERT',
      originalError,
      sql,
      params,
      tableName,
      constraintName,
      referencedTable,
      referencedColumn,
      violatingValue
    )
    this.name = 'ForeignKeyInsertError'
  }
}
