import DatabaseError from './DatabaseError.js'

export default class DatabaseClientNotFoundError extends DatabaseError {
  constructor(message: string = 'Failed to get database client instance, database client instance not found', originalError?: Error) {
    super('DATABASE_CLIENT_NOT_FOUND_ERROR', message, originalError)

    this.name = 'DatabaseClientNotFoundError'
  }
}
