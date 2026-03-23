/**
 * 任务处理 Worker 线程入口
 * 负责处理任务下载、保存等重型操作，避免阻塞主进程事件循环
 */
import { parentPort } from 'node:worker_threads'
import log from '../util/LogUtil.ts'
import {
  WorkerMessage,
  WorkerMessageType,
  createWorkerMessage,
  WorkerInitMessage,
  WorkerReadyMessage,
  WorkerErrorMessage,
  TaskStartMessage,
  TaskPauseMessage,
  TaskResumeMessage,
  TaskCancelMessage,
  TaskProgressMessage,
  TaskCompleteMessage,
  TaskErrorMessage,
  TaskSaveWorkInfoMessage,
  TaskDownloadResourceMessage,
  DbQueryMessage,
  DbExecuteMessage
} from './WorkerMessageProtocol.ts'
import { initializeWorkerDatabase, getWorkerDatabaseProxy } from './WorkerDatabaseProxy.ts'

// 保存 parentPort 引用
const port = parentPort!
if (!port) {
  throw new Error('Worker 必须在 Worker 线程中运行')
}

// 数据库连接池引用
let connectionPool: unknown = null

/**
 * 发送任务进度消息
 */
function sendTaskProgress(taskId: number, progress: number, downloadedBytes: number, totalBytes: number, status: string): void {
  const message = createWorkerMessage<TaskProgressMessage>(WorkerMessageType.TASK_PROGRESS, {
    taskId,
    progress,
    downloadedBytes,
    totalBytes,
    status
  })
  port.postMessage(message)
}

/**
 * 发送任务完成消息
 */
function sendTaskComplete(taskId: number, workId: number): void {
  const message = createWorkerMessage<TaskCompleteMessage>(WorkerMessageType.TASK_COMPLETE, {
    taskId,
    workId
  })
  port.postMessage(message)
}

/**
 * 发送任务错误消息
 */
function sendTaskError(taskId: number, error: string): void {
  const message = createWorkerMessage<TaskErrorMessage>(WorkerMessageType.TASK_ERROR, {
    taskId,
    error
  })
  port.postMessage(message)
}

/**
 * 初始化 Worker
 */
async function initializeWorker(message: WorkerInitMessage): Promise<void> {
  try {
    log.info('TaskWorker', `初始化 Worker，数据库路径: ${message.databasePath}`)

    // 延迟导入 ConnectionPool，避免在非 Worker 环境中报错
    const { ConnectionPool } = await import('../core/classes/ConnectionPool.ts')
    const DataBaseConstant = await import('../constant/DataBaseConstant.ts')
    const DataBasePathValue = message.databasePath

    // 创建独立的数据库连接池
    connectionPool = new ConnectionPool({
      maxRead: 5,
      maxWrite: 5,
      idleTimeout: 30000,
      databasePath: DataBasePathValue + DataBaseConstant.default.DB_FILE_NAME
    })

    // 初始化数据库代理
    initializeWorkerDatabase(connectionPool)

    // 发送就绪消息
    const readyMessage = createWorkerMessage<WorkerReadyMessage>(WorkerMessageType.WORKER_READY, {})
    port.postMessage(readyMessage)

    log.info('TaskWorker', 'Worker 初始化完成')
  } catch (error) {
    log.error('TaskWorker', 'Worker 初始化失败', error)
    const errorMessage = createWorkerMessage<WorkerErrorMessage>(WorkerMessageType.WORKER_ERROR, {
      error: error instanceof Error ? error.message : String(error)
    })
    port.postMessage(errorMessage)
  }
}

/**
 * 处理任务开始
 */
async function handleTaskStart(message: TaskStartMessage): Promise<void> {
  log.info('TaskWorker', `开始处理任务: ${message.taskId}`)
  try {
    // 获取任务信息并开始处理
    const db = getWorkerDatabaseProxy()
    const task = await db.queryOne<{
      id: number
      url: string
      site_id: number
      plugin_public_id: string
      plugin_contribution_id: number
      status: number
    }>('SELECT id, url, site_id, plugin_public_id, plugin_contribution_id, status FROM task WHERE id = ?', [message.taskId])

    if (!task) {
      sendTaskError(message.taskId, '任务不存在')
      return
    }

    // 这里可以添加更多任务处理逻辑
    // 例如：调用插件、保存作品信息等

    log.info('TaskWorker', `任务 ${message.taskId} 开始处理完成`)
  } catch (error) {
    log.error('TaskWorker', `处理任务 ${message.taskId} 失败`, error)
    sendTaskError(message.taskId, error instanceof Error ? error.message : String(error))
  }
}

/**
 * 处理任务暂停
 */
async function handleTaskPause(message: TaskPauseMessage): Promise<void> {
  log.info('TaskWorker', `暂停任务: ${message.taskId}`)
  try {
    const db = getWorkerDatabaseProxy()
    await db.execute('UPDATE task SET status = ? WHERE id = ?', [3, message.taskId]) // 3 = PAUSE
    sendTaskProgress(message.taskId, 0, 0, 0, 'PAUSED')
    log.info('TaskWorker', `任务 ${message.taskId} 已暂停`)
  } catch (error) {
    log.error('TaskWorker', `暂停任务 ${message.taskId} 失败`, error)
    sendTaskError(message.taskId, error instanceof Error ? error.message : String(error))
  }
}

/**
 * 处理任务恢复
 */
async function handleTaskResume(message: TaskResumeMessage): Promise<void> {
  log.info('TaskWorker', `恢复任务: ${message.taskId}`)
  try {
    const db = getWorkerDatabaseProxy()
    await db.execute('UPDATE task SET status = ? WHERE id = ?', [1, message.taskId]) // 1 = WAITING
    sendTaskProgress(message.taskId, 0, 0, 0, 'WAITING')
    log.info('TaskWorker', `任务 ${message.taskId} 已恢复`)
  } catch (error) {
    log.error('TaskWorker', `恢复任务 ${message.taskId} 失败`, error)
    sendTaskError(message.taskId, error instanceof Error ? error.message : String(error))
  }
}

/**
 * 处理任务取消
 */
async function handleTaskCancel(message: TaskCancelMessage): Promise<void> {
  log.info('TaskWorker', `取消任务: ${message.taskId}`)
  try {
    const db = getWorkerDatabaseProxy()
    await db.execute('UPDATE task SET status = ? WHERE id = ?', [4, message.taskId]) // 4 = FAILED
    sendTaskProgress(message.taskId, 0, 0, 0, 'CANCELLED')
    log.info('TaskWorker', `任务 ${message.taskId} 已取消`)
  } catch (error) {
    log.error('TaskWorker', `取消任务 ${message.taskId} 失败`, error)
    sendTaskError(message.taskId, error instanceof Error ? error.message : String(error))
  }
}

/**
 * 处理任务保存作品信息
 */
async function handleTaskSaveWorkInfo(message: TaskSaveWorkInfoMessage): Promise<void> {
  log.info('TaskWorker', `保存作品信息: ${message.taskId}`)
  try {
    const db = getWorkerDatabaseProxy()
    // 查询任务信息
    const task = await db.queryOne<{ id: number; url: string }>('SELECT id, url FROM task WHERE id = ?', [message.taskId])
    if (!task) {
      sendTaskError(message.taskId, '任务不存在')
      return
    }

    // TODO: 调用插件获取作品信息并保存
    // 这里需要调用主进程的插件系统

    log.info('TaskWorker', `任务 ${message.taskId} 作品信息保存完成`)
  } catch (error) {
    log.error('TaskWorker', `保存作品信息失败`, error)
    sendTaskError(message.taskId, error instanceof Error ? error.message : String(error))
  }
}

/**
 * 处理任务下载资源
 */
async function handleTaskDownloadResource(message: TaskDownloadResourceMessage): Promise<void> {
  log.info('TaskWorker', `下载资源: ${message.taskId}, workId: ${message.workId}`)
  try {
    const db = getWorkerDatabaseProxy()

    // 更新任务状态为进行中
    await db.execute('UPDATE task SET status = ? WHERE id = ?', [2, message.taskId]) // 2 = PROCESSING

    // TODO: 调用插件下载资源并保存

    // 模拟下载进度
    for (let i = 0; i <= 100; i += 10) {
      sendTaskProgress(message.taskId, i, i * 1000, 10000, 'PROCESSING')
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    // 完成
    sendTaskComplete(message.taskId, message.workId)
    log.info('TaskWorker', `任务 ${message.taskId} 资源下载完成`)
  } catch (error) {
    log.error('TaskWorker', `下载资源失败`, error)
    sendTaskError(message.taskId, error instanceof Error ? error.message : String(error))
  }
}

/**
 * 处理数据库查询
 */
async function handleDbQuery(message: DbQueryMessage): Promise<void> {
  try {
    const db = getWorkerDatabaseProxy()
    await db.query(message.sql, message.params)
    log.info('TaskWorker', `数据库查询完成: ${message.sql}`)
  } catch (error) {
    log.error('TaskWorker', '数据库查询失败', error)
  }
}

/**
 * 处理数据库执行
 */
async function handleDbExecute(message: DbExecuteMessage): Promise<void> {
  try {
    const db = getWorkerDatabaseProxy()
    const result = await db.execute(message.sql, message.params)
    log.info('TaskWorker', `数据库执行完成: ${message.sql}, changes: ${result.changes}`)
  } catch (error) {
    log.error('TaskWorker', '数据库执行失败', error)
  }
}

/**
 * 消息处理映射
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const messageHandlers: Partial<Record<WorkerMessageType, (message: any) => Promise<void>>> = {
  [WorkerMessageType.WORKER_INIT]: async (msg: WorkerMessage) => {
    await initializeWorker(msg as WorkerInitMessage)
  },
  [WorkerMessageType.TASK_START]: async (msg: WorkerMessage) => {
    await handleTaskStart(msg as TaskStartMessage)
  },
  [WorkerMessageType.TASK_PAUSE]: async (msg: WorkerMessage) => {
    await handleTaskPause(msg as TaskPauseMessage)
  },
  [WorkerMessageType.TASK_RESUME]: async (msg: WorkerMessage) => {
    await handleTaskResume(msg as TaskResumeMessage)
  },
  [WorkerMessageType.TASK_CANCEL]: async (msg: WorkerMessage) => {
    await handleTaskCancel(msg as TaskCancelMessage)
  },
  [WorkerMessageType.TASK_SAVE_WORK_INFO]: async (msg: WorkerMessage) => {
    await handleTaskSaveWorkInfo(msg as TaskSaveWorkInfoMessage)
  },
  [WorkerMessageType.TASK_DOWNLOAD_RESOURCE]: async (msg: WorkerMessage) => {
    await handleTaskDownloadResource(msg as TaskDownloadResourceMessage)
  },
  [WorkerMessageType.DB_QUERY]: async (msg: WorkerMessage) => {
    await handleDbQuery(msg as DbQueryMessage)
  },
  [WorkerMessageType.DB_EXECUTE]: async (msg: WorkerMessage) => {
    await handleDbExecute(msg as DbExecuteMessage)
  }
}

/**
 * 消息接收处理
 */
port.on('message', async (message: WorkerMessage) => {
  try {
    const handler = messageHandlers[message.type]
    if (handler) {
      await handler(message)
    } else {
      log.warn('TaskWorker', `未处理的消息类型: ${message.type}`)
    }
  } catch (error) {
    log.error('TaskWorker', '处理消息失败', error)
    const errorMessage = createWorkerMessage<WorkerErrorMessage>(WorkerMessageType.WORKER_ERROR, {
      error: error instanceof Error ? error.message : String(error),
      originalMessage: message
    })
    port.postMessage(errorMessage)
  }
})

/**
 * 错误处理
 */
port.on('error', (error) => {
  log.error('TaskWorker', 'Worker 错误', error)
})

/**
 * 退出处理
 */
port.on('close', () => {
  log.info('TaskWorker', 'Worker 关闭')
  // 清理资源
  if (connectionPool) {
    // 关闭数据库连接池
    // connectionPool.close()
  }
})

log.info('TaskWorker', 'Worker 启动')
