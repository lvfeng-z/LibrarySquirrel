/**
 * 任务 Worker 客户端
 * 在主线程中使用，负责与 Worker 线程通信
 */
import { Worker } from 'node:worker_threads'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import log from '../util/LogUtil.ts'
import { DataBasePath } from '../util/DatabaseUtil.ts'
import {
  WorkerMessage,
  WorkerMessageType,
  createWorkerMessage,
  WorkerInitMessage,
  WorkerErrorMessage,
  TaskProgressMessage,
  TaskCompleteMessage,
  TaskErrorMessage,
  TaskStartMessage,
  TaskPauseMessage,
  TaskResumeMessage,
  TaskCancelMessage
} from './WorkerMessageProtocol.ts'

/**
 * 回调函数类型
 */
type MessageCallback = (message: WorkerMessage) => void
type WorkerErrorCallback = (error: Error) => void
type TaskErrorCallback = (taskId: number, error: Error) => void
type ProgressCallback = (taskId: number, progress: number, downloadedBytes: number, totalBytes: number) => void
type CompleteCallback = (taskId: number, workId: number) => void

/**
 * 任务 Worker 客户端类
 */
export class TaskWorkerClient {
  /**
   * Worker 实例
   */
  private worker: Worker | null = null

  /**
   * 是否已初始化
   */
  private initialized: boolean = false

  /**
   * 初始化 Promise
   */
  private initPromise: Promise<void> | null = null

  /**
   * 消息回调
   */
  private messageCallbacks: Map<string, MessageCallback> = new Map()

  /**
   * 错误回调
   */
  private errorCallbacks: Set<WorkerErrorCallback> = new Set()

  /**
   * 任务进度回调
   */
  private progressCallbacks: Map<number, ProgressCallback> = new Map()

  /**
   * 全局进度回调
   */
  private globalProgressCallbacks: Set<ProgressCallback> = new Set()

  /**
   * 任务完成回调
   */
  private completeCallbacks: Map<number, CompleteCallback> = new Map()

  /**
   * 全局完成回调
   */
  private globalCompleteCallbacks: Set<CompleteCallback> = new Set()

  /**
   * 任务错误回调
   */
  private errorHandlers: Map<number, TaskErrorCallback> = new Map()

  /**
   * 全局错误回调
   */
  private globalErrorCallbacks: Set<TaskErrorCallback> = new Set()

  /**
   * 获取 Worker 文件路径
   */
  private getWorkerPath(): string {
    // 获取 Worker 文件路径
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    return path.join(__dirname, 'TaskWorker.ts')
  }

  /**
   * 初始化 Worker
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = this.doInitialize()
    return this.initPromise
  }

  /**
   * 执行初始化
   */
  private async doInitialize(): Promise<void> {
    try {
      const workerPath = this.getWorkerPath()
      log.info('TaskWorkerClient', `初始化 Worker，路径: ${workerPath}`)

      const worker = new Worker(workerPath)
      this.worker = worker

      // 等待 Worker 就绪
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Worker 初始化超时'))
        }, 30000)

        const readyHandler = (message: WorkerMessage) => {
          if (message.type === WorkerMessageType.WORKER_READY) {
            clearTimeout(timeout)
            worker.off('message', readyHandler)
            worker.off('error', errorHandler)
            resolve()
          }
        }

        const errorHandler = (err: Error) => {
          clearTimeout(timeout)
          worker.off('message', readyHandler)
          worker.off('error', errorHandler)
          reject(err)
        }

        worker.on('message', readyHandler)
        worker.on('error', errorHandler)
      })

      // 发送初始化消息
      const dbPath = DataBasePath()
      const initMessage = createWorkerMessage<WorkerInitMessage>(WorkerMessageType.WORKER_INIT, {
        databasePath: dbPath
      })
      worker.postMessage(initMessage)

      // 等待初始化完成
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Worker 初始化超时'))
        }, 30000)

        const readyHandler = (message: WorkerMessage) => {
          if (message.type === WorkerMessageType.WORKER_READY) {
            clearTimeout(timeout)
            worker.off('message', readyHandler)
            worker.off('error', errorHandler)
            this.initialized = true
            resolve()
          }
        }

        const errorHandler = (err: Error) => {
          clearTimeout(timeout)
          worker.off('message', readyHandler)
          worker.off('error', errorHandler)
          reject(err)
        }

        worker.on('message', readyHandler)
        worker.on('error', errorHandler)
      })

      // 设置消息监听
      this.setupMessageListeners()

      log.info('TaskWorkerClient', 'Worker 初始化完成')
    } catch (error) {
      log.error('TaskWorkerClient', 'Worker 初始化失败', error)
      throw error
    }
  }

  /**
   * 设置消息监听
   */
  private setupMessageListeners(): void {
    const worker = this.worker
    if (!worker) {
      return
    }

    worker.on('message', (message: WorkerMessage) => {
      this.handleMessage(message)
    })

    worker.on('error', (err: Error) => {
      log.error('TaskWorkerClient', 'Worker 错误', err)
      this.errorCallbacks.forEach((callback) => callback(err))
    })

    worker.on('exit', (code) => {
      log.info('TaskWorkerClient', `Worker 退出，code: ${code}`)
      this.initialized = false
    })
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(message: WorkerMessage): void {
    switch (message.type) {
      case WorkerMessageType.TASK_PROGRESS: {
        const progressMsg = message as TaskProgressMessage
        // 触发任务特定的回调
        const callback = this.progressCallbacks.get(progressMsg.taskId)
        if (callback) {
          callback(progressMsg.taskId, progressMsg.progress, progressMsg.downloadedBytes, progressMsg.totalBytes)
        }
        // 触发全局回调
        this.globalProgressCallbacks.forEach((cb) => cb(progressMsg.taskId, progressMsg.progress, progressMsg.downloadedBytes, progressMsg.totalBytes))
        break
      }
      case WorkerMessageType.TASK_COMPLETE: {
        const completeMsg = message as TaskCompleteMessage
        // 触发任务特定的回调
        const callback = this.completeCallbacks.get(completeMsg.taskId)
        if (callback) {
          callback(completeMsg.taskId, completeMsg.workId)
        }
        // 触发全局回调
        this.globalCompleteCallbacks.forEach((cb) => cb(completeMsg.taskId, completeMsg.workId))
        break
      }
      case WorkerMessageType.TASK_ERROR: {
        const errorMsg = message as TaskErrorMessage
        // 触发任务特定的回调
        const callback = this.errorHandlers.get(errorMsg.taskId)
        if (callback) {
          callback(errorMsg.taskId, new Error(errorMsg.error))
        }
        // 触发全局回调
        this.globalErrorCallbacks.forEach((cb) => cb(errorMsg.taskId, new Error(errorMsg.error)))
        break
      }
      case WorkerMessageType.FILE_SAVE_PROGRESS: {
        // 文件保存进度处理
        break
      }
      case WorkerMessageType.FILE_SAVE_COMPLETE: {
        // 文件保存完成处理
        break
      }
      case WorkerMessageType.FILE_SAVE_ERROR: {
        // 文件保存错误处理
        break
      }
      case WorkerMessageType.WORKER_ERROR: {
        const errorMsg = message as WorkerErrorMessage
        log.error('TaskWorkerClient', 'Worker 错误', errorMsg.error)
        break
      }
      default:
      // 其他消息类型
    }

    // 触发通用消息回调
    const callback = this.messageCallbacks.get(message.id)
    if (callback) {
      callback(message)
      this.messageCallbacks.delete(message.id)
    }
  }

  /**
   * 发送消息到 Worker
   */
  private sendMessage<T extends WorkerMessage>(message: T): void {
    const worker = this.worker
    if (!worker || !this.initialized) {
      throw new Error('Worker 未初始化')
    }
    worker.postMessage(message)
  }

  /**
   * 开始任务
   */
  async startTask(taskId: number, workId: number | undefined, url: string, pluginId: number): Promise<void> {
    await this.initialize()

    const message = createWorkerMessage<TaskStartMessage>(WorkerMessageType.TASK_START, {
      taskId,
      workId,
      url,
      pluginId
    })
    this.sendMessage(message)
  }

  /**
   * 暂停任务
   */
  async pauseTask(taskId: number): Promise<void> {
    await this.initialize()

    const message = createWorkerMessage<TaskPauseMessage>(WorkerMessageType.TASK_PAUSE, {
      taskId
    })
    this.sendMessage(message)
  }

  /**
   * 恢复任务
   */
  async resumeTask(taskId: number): Promise<void> {
    await this.initialize()

    const message = createWorkerMessage<TaskResumeMessage>(WorkerMessageType.TASK_RESUME, {
      taskId
    })
    this.sendMessage(message)
  }

  /**
   * 取消任务
   */
  async cancelTask(taskId: number): Promise<void> {
    await this.initialize()

    const message = createWorkerMessage<TaskCancelMessage>(WorkerMessageType.TASK_CANCEL, {
      taskId
    })
    this.sendMessage(message)
  }

  /**
   * 注册进度回调
   */
  onProgress(taskId: number, callback: ProgressCallback): void {
    this.progressCallbacks.set(taskId, callback)
  }

  /**
   * 注册完成回调
   */
  onComplete(taskId: number, callback: CompleteCallback): void {
    this.completeCallbacks.set(taskId, callback)
  }

  /**
   * 注册错误回调
   */
  onError(taskId: number, callback: TaskErrorCallback): void {
    this.errorHandlers.set(taskId, callback)
  }

  /**
   * 注册通用错误回调
   */
  onWorkerError(callback: WorkerErrorCallback): void {
    this.errorCallbacks.add(callback)
  }

  /**
   * 注册全局进度回调
   * @param callback 进度回调函数
   */
  onGlobalProgress(callback: ProgressCallback): void {
    this.globalProgressCallbacks.add(callback)
  }

  /**
   * 移除全局进度回调
   * @param callback 进度回调函数
   */
  offGlobalProgress(callback: ProgressCallback): void {
    this.globalProgressCallbacks.delete(callback)
  }

  /**
   * 注册全局完成回调
   * @param callback 完成回调函数
   */
  onGlobalComplete(callback: CompleteCallback): void {
    this.globalCompleteCallbacks.add(callback)
  }

  /**
   * 移除全局完成回调
   * @param callback 完成回调函数
   */
  offGlobalComplete(callback: CompleteCallback): void {
    this.globalCompleteCallbacks.delete(callback)
  }

  /**
   * 注册全局错误回调
   * @param callback 错误回调函数
   */
  onGlobalError(callback: TaskErrorCallback): void {
    this.globalErrorCallbacks.add(callback)
  }

  /**
   * 移除全局错误回调
   * @param callback 错误回调函数
   */
  offGlobalError(callback: TaskErrorCallback): void {
    this.globalErrorCallbacks.delete(callback)
  }

  /**
   * 移除进度回调
   */
  offProgress(taskId: number): void {
    this.progressCallbacks.delete(taskId)
  }

  /**
   * 移除完成回调
   */
  offComplete(taskId: number): void {
    this.completeCallbacks.delete(taskId)
  }

  /**
   * 移除错误回调
   */
  offError(taskId: number): void {
    this.errorHandlers.delete(taskId)
  }

  /**
   * 终止 Worker
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate()
      this.worker = null
      this.initialized = false
      this.initPromise = null
      log.info('TaskWorkerClient', 'Worker 已终止')
    }
  }

  /**
   * 检查是否已初始化
   */
  isReady(): boolean {
    return this.initialized
  }
}

// 单例实例
let taskWorkerClient: TaskWorkerClient | null = null

/**
 * 获取 TaskWorkerClient 单例
 */
export function getTaskWorkerClient(): TaskWorkerClient {
  if (!taskWorkerClient) {
    taskWorkerClient = new TaskWorkerClient()
  }
  return taskWorkerClient
}
