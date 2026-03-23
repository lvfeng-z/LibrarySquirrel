/**
 * Worker 消息协议定义
 * 定义主线程与 Worker 线程之间的通信消息类型
 */

/**
 * 消息类型枚举
 */
export enum WorkerMessageType {
  // 任务控制
  TASK_START = 'TASK_START',
  TASK_PAUSE = 'TASK_PAUSE',
  TASK_RESUME = 'TASK_RESUME',
  TASK_CANCEL = 'TASK_CANCEL',

  // 任务进度
  TASK_PROGRESS = 'TASK_PROGRESS',
  TASK_COMPLETE = 'TASK_COMPLETE',
  TASK_ERROR = 'TASK_ERROR',

  // 任务操作
  TASK_SAVE_WORK_INFO = 'TASK_SAVE_WORK_INFO',
  TASK_DOWNLOAD_RESOURCE = 'TASK_DOWNLOAD_RESOURCE',

  // 数据库操作
  DB_QUERY = 'DB_QUERY',
  DB_EXECUTE = 'DB_EXECUTE',

  // 文件操作
  FILE_SAVE_START = 'FILE_SAVE_START',
  FILE_SAVE_PROGRESS = 'FILE_SAVE_PROGRESS',
  FILE_SAVE_COMPLETE = 'FILE_SAVE_COMPLETE',
  FILE_SAVE_ERROR = 'FILE_SAVE_ERROR',

  // 系统
  WORKER_INIT = 'WORKER_INIT',
  WORKER_READY = 'WORKER_READY',
  WORKER_ERROR = 'WORKER_ERROR'
}

/**
 * 基础消息接口
 */
export interface BaseWorkerMessage {
  type: WorkerMessageType
  id: string
  timestamp: number
}

/**
 * Worker 初始化消息
 */
export interface WorkerInitMessage extends BaseWorkerMessage {
  type: WorkerMessageType.WORKER_INIT
  databasePath: string
}

/**
 * Worker 就绪消息
 */
export interface WorkerReadyMessage extends BaseWorkerMessage {
  type: WorkerMessageType.WORKER_READY
}

/**
 * 任务开始消息
 */
export interface TaskStartMessage extends BaseWorkerMessage {
  type: WorkerMessageType.TASK_START
  taskId: number
  workId?: number
  url: string
  pluginId: number
}

/**
 * 任务暂停消息
 */
export interface TaskPauseMessage extends BaseWorkerMessage {
  type: WorkerMessageType.TASK_PAUSE
  taskId: number
}

/**
 * 任务恢复消息
 */
export interface TaskResumeMessage extends BaseWorkerMessage {
  type: WorkerMessageType.TASK_RESUME
  taskId: number
}

/**
 * 任务取消消息
 */
export interface TaskCancelMessage extends BaseWorkerMessage {
  type: WorkerMessageType.TASK_CANCEL
  taskId: number
}

/**
 * 任务进度消息
 */
export interface TaskProgressMessage extends BaseWorkerMessage {
  type: WorkerMessageType.TASK_PROGRESS
  taskId: number
  progress: number
  downloadedBytes: number
  totalBytes: number
  status: string
}

/**
 * 任务完成消息
 */
export interface TaskCompleteMessage extends BaseWorkerMessage {
  type: WorkerMessageType.TASK_COMPLETE
  taskId: number
  workId: number
}

/**
 * 任务错误消息
 */
export interface TaskErrorMessage extends BaseWorkerMessage {
  type: WorkerMessageType.TASK_ERROR
  taskId: number
  error: string
}

/**
 * 任务保存作品信息消息
 */
export interface TaskSaveWorkInfoMessage extends BaseWorkerMessage {
  type: WorkerMessageType.TASK_SAVE_WORK_INFO
  taskId: number
  taskUrl: string
  pluginPublicId: string
  pluginContributionId: number
  siteId: number
  update: boolean
  existingWorkId?: number
}

/**
 * 任务下载资源消息
 */
export interface TaskDownloadResourceMessage extends BaseWorkerMessage {
  type: WorkerMessageType.TASK_DOWNLOAD_RESOURCE
  taskId: number
  workId: number
  taskUrl: string
  pluginPublicId: string
  pluginContributionId: number
  continuable: boolean
  pendingResourceId?: number
}

/**
 * 数据库查询消息
 */
export interface DbQueryMessage extends BaseWorkerMessage {
  type: WorkerMessageType.DB_QUERY
  sql: string
  params?: unknown[]
}

/**
 * 数据库执行消息
 */
export interface DbExecuteMessage extends BaseWorkerMessage {
  type: WorkerMessageType.DB_EXECUTE
  sql: string
  params?: unknown[]
}

/**
 * 文件保存开始消息
 */
export interface FileSaveStartMessage extends BaseWorkerMessage {
  type: WorkerMessageType.FILE_SAVE_START
  taskId: number
  fileName: string
  totalBytes: number
}

/**
 * 文件保存进度消息
 */
export interface FileSaveProgressMessage extends BaseWorkerMessage {
  type: WorkerMessageType.FILE_SAVE_PROGRESS
  taskId: number
  writtenBytes: number
  totalBytes: number
}

/**
 * 文件保存完成消息
 */
export interface FileSaveCompleteMessage extends BaseWorkerMessage {
  type: WorkerMessageType.FILE_SAVE_COMPLETE
  taskId: number
  filePath: string
  savedBytes: number
}

/**
 * 文件保存错误消息
 */
export interface FileSaveErrorMessage extends BaseWorkerMessage {
  type: WorkerMessageType.FILE_SAVE_ERROR
  taskId: number
  error: string
}

/**
 * Worker 错误消息
 */
export interface WorkerErrorMessage extends BaseWorkerMessage {
  type: WorkerMessageType.WORKER_ERROR
  error: string
  originalMessage?: BaseWorkerMessage
}

/**
 * 所有消息类型的联合类型
 */
export type WorkerMessage =
  | WorkerInitMessage
  | WorkerReadyMessage
  | TaskStartMessage
  | TaskPauseMessage
  | TaskResumeMessage
  | TaskCancelMessage
  | TaskProgressMessage
  | TaskCompleteMessage
  | TaskErrorMessage
  | TaskSaveWorkInfoMessage
  | TaskDownloadResourceMessage
  | DbQueryMessage
  | DbExecuteMessage
  | FileSaveStartMessage
  | FileSaveProgressMessage
  | FileSaveCompleteMessage
  | FileSaveErrorMessage
  | WorkerErrorMessage

/**
 * 创建带 id 的消息
 */
export function createWorkerMessage<T extends BaseWorkerMessage>(type: T['type'], extras: Omit<T, 'type' | 'id' | 'timestamp'>): T {
  return {
    type,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    ...extras
  } as T
}
