/**
 * 数据库操作请求类型
 * 用于主线程与 Worker 线程之间的通信
 */
export interface DatabaseRequest {
  id: string
  type: 'run' | 'get' | 'all' | 'exec' | 'begin' | 'commit' | 'rollback' | 'savepoint' | 'release' | 'rollbackTo'
  statement?: string
  params?: unknown[]
  savepointName?: string
}

/**
 * 数据库操作响应类型
 */
export interface DatabaseResponse {
  id: string
  success: boolean
  data?: unknown
  error?: string
}

/**
 * 生成唯一请求ID
 */
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}
