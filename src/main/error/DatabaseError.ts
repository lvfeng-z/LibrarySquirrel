export default class DatabaseError extends Error {
  public readonly code: string
  public readonly originalError?: Error
  public readonly sql?: string
  public readonly params?: unknown

  constructor(message: string, code: string = 'DATABASE_ERROR', originalError?: Error, sql?: string, params?: unknown) {
    super(message)
    this.name = 'DatabaseError'
    this.code = code
    this.originalError = originalError
    this.sql = sql
    this.params = params

    // 保持正确的堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DatabaseError)
    }

    // 如果提供了原始错误，合并堆栈信息
    if (originalError && originalError.stack) {
      this.stack = `${this.stack}\nCaused by: ${originalError.stack}`
    }
  }
}
