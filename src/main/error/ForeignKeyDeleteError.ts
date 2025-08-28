import ForeignKeyConstraintError from './ForeignKeyConstraintError.js'

export default class ForeignKeyDeleteError extends ForeignKeyConstraintError {
  constructor(
    message: string = 'Cannot delete record due to existing foreign key references',
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
      'SQLITE_CONSTRAINT_FOREIGN_KEY_DELETE',
      originalError,
      sql,
      params,
      tableName,
      constraintName,
      referencedTable,
      referencedColumn,
      violatingValue
    )
    this.name = 'ForeignKeyDeleteError'
  }
}
