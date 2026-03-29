import { parentPort, workerData } from 'worker_threads'
import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'

// 导出模块路径（用于 electron-vite ?modulePath 导入）
export default fileURLToPath(import.meta.url)

interface WorkerInitData {
  databasePath: string
}

interface DatabaseRequest {
  id: string
  type: 'run' | 'get' | 'all' | 'exec' | 'prepare' | 'close'
  statement?: string
  params?: unknown[]
}

interface DatabaseResponse {
  id: string
  success: boolean
  result?: unknown
  error?: string
}

// 初始化数据库连接
const initData = workerData as WorkerInitData
let db: Database.Database | undefined

function initDatabase(): void {
  if (!db) {
    db = new Database(initData.databasePath)
    // 注册 REGEXP 函数
    db.function('REGEXP', (pattern, string) => {
      const regex = new RegExp(pattern as string)
      return regex.test(string as string) ? 1 : 0
    })
  }
}

// 处理数据库请求
function handleRequest(request: DatabaseRequest): DatabaseResponse {
  if (!db) {
    initDatabase()
  }

  try {
    switch (request.type) {
      case 'run': {
        const result = db!.prepare(request.statement!).run(...(request.params || []))
        return { id: request.id, success: true, result }
      }
      case 'get': {
        const result = db!.prepare(request.statement!).get(...(request.params || []))
        return { id: request.id, success: true, result }
      }
      case 'all': {
        const result = db!.prepare(request.statement!).all(...(request.params || []))
        return { id: request.id, success: true, result }
      }
      case 'exec': {
        db!.exec(request.statement!)
        return { id: request.id, success: true, result: true }
      }
      case 'prepare': {
        // 预处理语句在 worker 中执行，返回一个可序列化的结果
        // 注意：Statement 对象不能跨线程传递，这里我们返回语句标识
        return { id: request.id, success: true, result: { statement: request.statement } }
      }
      case 'close': {
        if (db) {
          db.close()
          db = undefined
        }
        return { id: request.id, success: true, result: true }
      }
      default:
        return { id: request.id, success: false, error: `Unknown request type: ${request.type}` }
    }
  } catch (error) {
    return {
      id: request.id,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

// 监听主线程消息
if (parentPort) {
  parentPort.on('message', (request: DatabaseRequest) => {
    const response = handleRequest(request)
    parentPort!.postMessage(response)
  })

  // 初始化数据库连接
  initDatabase()

  // 通知主线程 worker 已就绪
  parentPort.postMessage({ type: 'ready' })
}
