import { Worker } from 'worker_threads'
import { WorkerStatusEnum } from '../../constant/WorkerStatusEnum.ts'
import { notNullish } from '@shared/util/CommonUtil.ts'
import log from '../../util/LogUtil.ts'
import TaskProgressDTO from '@shared/model/dto/TaskProgressDTO.ts'
import Task from '@shared/model/entity/Task.ts'
import { SendMsgToRender } from '../EventToRender.ts'
import { RenderEvent } from '../EventToRender.ts'
import { TaskStatus } from './TaskStatus.ts'

/**
 * 工作线程初始化数据
 */
interface TaskWorkerInitData {
  workerId: number
  threadType: string
}

/**
 * 工作线程任务消息（主线程 → Worker 线程）
 */
interface WorkerTaskMessage {
  type: 'start' | 'pause' | 'resume' | 'stop'
  taskId?: number
  taskData?: unknown
}

/**
 * 暂停操作解决回调
 */
type PauseResolve = (result: boolean) => void

/**
 * Worker 线程进度消息（Worker 线程 → 主线程）
 */
interface WorkerProgressMessage {
  type: 'progress' | 'statusChange' | 'complete' | 'error' | 'paused'
  taskId: number
  status?: number
  progress?: TaskProgressDTO
  error?: string
}

/**
 * 工作线程类（主线程端）
 *
 * 职责：管理单个工作线程的生命周期，调度任务执行
 */
export class TaskWorker {
  /**
   * 工作线程 ID
   */
  private readonly workerId: number

  /**
   * 工作线程状态
   */
  private status: WorkerStatusEnum = WorkerStatusEnum.IDLE

  /**
   * 当前任务 ID
   */
  private taskId: number | null = null

  /**
   * 底层 Worker 实例
   */
  private worker: Worker | null = null

  /**
   * 任务完成回调
   */
  private onTaskComplete: ((workerId: number) => void) | null = null

  /**
   * 任务进度回调
   */
  private onTaskProgress: ((taskId: number, progress: TaskProgressDTO) => void) | null = null

  /**
   * 暂停操作解决回调
   */
  private pauseResolve: PauseResolve | null = null

  /**
   * Worker 入口文件路径
   */
  private static readonly WORKER_ENTRY_PATH = __dirname + '/taskWorkerEntry.js'

  constructor(workerId: number) {
    this.workerId = workerId
  }

  /**
   * 设置任务完成回调
   * @param callback 回调函数
   */
  setOnTaskComplete(callback: (workerId: number) => void): void {
    this.onTaskComplete = callback
  }

  /**
   * 设置任务进度回调
   * @param callback 回调函数
   */
  setOnTaskProgress(callback: (taskId: number, progress: TaskProgressDTO) => void): void {
    this.onTaskProgress = callback
  }

  /**
   * 获取工作线程 ID
   */
  getWorkerId(): number {
    return this.workerId
  }

  /**
   * 获取当前状态
   */
  getStatus(): WorkerStatusEnum {
    return this.status
  }

  /**
   * 获取当前任务 ID
   */
  getTaskId(): number | null {
    return this.taskId
  }

  /**
   * 启动任务
   * @param taskStatus 任务运行实例
   */
  async start(taskStatus: TaskStatus): Promise<void> {
    if (this.status !== WorkerStatusEnum.IDLE) {
      log.warn(this.constructor.name, `工作线程 ${this.workerId} 已在使用中，无法启动新任务`)
      return
    }

    this.taskId = taskStatus.taskId
    this.status = WorkerStatusEnum.RUNNING

    // 创建 Worker 线程
    this.worker = new Worker(TaskWorker.WORKER_ENTRY_PATH, {
      workerData: {
        workerId: this.workerId,
        threadType: 'task'
      } as TaskWorkerInitData
    })

    // 监听 Worker 线程消息
    this.worker.on('message', (message: WorkerProgressMessage) => {
      this.handleWorkerMessage(message)
    })

    this.worker.on('error', (error: Error) => {
      log.error(this.constructor.name, `工作线程 ${this.workerId} 错误: ${error.message}`)
      this.status = WorkerStatusEnum.IDLE
      this.taskId = null
    })

    this.worker.on('exit', (code: number) => {
      if (code !== 0) {
        log.warn(this.constructor.name, `工作线程 ${this.workerId} 退出，code: ${code}`)
      }
      this.status = WorkerStatusEnum.IDLE
      this.taskId = null
      this.worker = null
    })

    // 发送任务开始消息
    this.sendMessage({
      type: 'start',
      taskId: taskStatus.taskId,
      taskData: {
        task: taskStatus.getTaskData(),
        pluginPublicId: taskStatus.getPluginPublicId(),
        contributionInfo: taskStatus.getContributionInfo(),
        workdir: taskStatus.getWorkdir(),
        workId: taskStatus.getWorkId()
      }
    })
  }

  /**
   * 暂停任务
   * @returns Promise<boolean> - 暂停是否成功，等待 worker 确认暂停完成后才返回
   */
  async pause(): Promise<boolean> {
    if (this.status !== WorkerStatusEnum.RUNNING) {
      log.warn(this.constructor.name, `工作线程 ${this.workerId} 处于 ${this.status} 状态，无法暂停`)
      return false
    }

    // 发送暂停消息并等待 worker 确认暂停完成
    return new Promise<boolean>((resolve) => {
      this.pauseResolve = resolve
      this.sendMessage({ type: 'pause' })
    })
  }

  /**
   * 恢复任务
   */
  async resume(): Promise<void> {
    if (this.status !== WorkerStatusEnum.PAUSED) {
      log.warn(this.constructor.name, `工作线程 ${this.workerId} 处于 ${this.status} 状态，无法恢复`)
      return
    }

    this.sendMessage({ type: 'resume' })
  }

  /**
   * 停止任务
   */
  async stop(): Promise<void> {
    if (this.status === WorkerStatusEnum.IDLE || this.status === WorkerStatusEnum.STOPPED) {
      log.warn(this.constructor.name, `工作线程 ${this.workerId} 处于 ${this.status} 状态，无法停止`)
      return
    }

    this.sendMessage({ type: 'stop' })
  }

  /**
   * 释放工作线程（归还到线程池）
   */
  release(): void {
    if (notNullish(this.worker)) {
      this.worker.terminate()
      this.worker = null
    }
    this.status = WorkerStatusEnum.IDLE
    this.taskId = null
  }

  /**
   * 处理 Worker 线程消息
   */
  private handleWorkerMessage(message: WorkerProgressMessage): void {
    switch (message.type) {
      case 'progress':
        if (notNullish(message.progress)) {
          SendMsgToRender(RenderEvent.TASK_STATUS_UPDATE_TASK, [message.progress])
          // 通知进度回调
          if (this.onTaskProgress !== null && message.taskId !== undefined) {
            this.onTaskProgress(message.taskId, message.progress)
          }
        }
        break
      case 'statusChange':
        log.debug(this.constructor.name, `工作线程 ${this.workerId} 任务 ${message.taskId} 状态变更: ${message.status}`)
        // 更新 Worker 状态
        if (message.status !== undefined) {
          this.status = message.status
        }
        break
      case 'paused':
        log.debug(this.constructor.name, `工作线程 ${this.workerId} 任务 ${message.taskId} 已暂停`)
        // 更新 Worker 状态为空闲
        this.status = WorkerStatusEnum.IDLE
        this.taskId = null
        // 解决暂停 Promise，让 pauseTask 继续执行
        if (this.pauseResolve !== null) {
          this.pauseResolve(true)
          this.pauseResolve = null
        }
        break
      case 'complete':
        log.info(this.constructor.name, `工作线程 ${this.workerId} 任务 ${message.taskId} 完成`)
        this.status = WorkerStatusEnum.IDLE
        this.taskId = null
        this.notifyTaskComplete()
        break
      case 'error':
        log.error(this.constructor.name, `工作线程 ${this.workerId} 任务 ${message.taskId} 错误: ${message.error}`)
        this.status = WorkerStatusEnum.IDLE
        this.taskId = null
        this.notifyTaskComplete()
        break
    }
  }

  /**
   * 通知任务完成
   */
  private notifyTaskComplete(): void {
    if (this.onTaskComplete !== null) {
      this.onTaskComplete(this.workerId)
    }
  }

  /**
   * 发送消息到 Worker 线程
   */
  private sendMessage(message: WorkerTaskMessage): void {
    if (notNullish(this.worker)) {
      this.worker.postMessage(message)
    }
  }
}

/**
 * 贡献点文件路径信息
 */
export interface ContributionFilePathInfo {
  /** 插件入口文件路径 */
  entryPath: string
  /** 贡献点键名 */
  key: string
  /** 贡献点 ID */
  contributionId: string
}

/**
 * 任务运行实例包装器
 * @description 用于传递给工作线程的任务信息
 */
export class TaskRunInstanceWrapper {
  /**
   * 任务 ID
   */
  readonly taskId: number

  /**
   * 任务信息
   */
  private readonly taskInfo: Task

  /**
   * 插件公开 ID
   */
  private readonly pluginPublicId: string

  /**
   * 贡献点文件路径信息
   */
  private readonly contributionInfo: ContributionFilePathInfo

  /**
   * 工作目录
   */
  private readonly workdir: string

  /**
   * 作品 ID
   */
  private readonly workId: number

  constructor(
    taskId: number,
    taskInfo: Task,
    pluginPublicId: string,
    contributionInfo: ContributionFilePathInfo,
    workdir: string,
    workId: number
  ) {
    this.taskId = taskId
    this.taskInfo = taskInfo
    this.pluginPublicId = pluginPublicId
    this.contributionInfo = contributionInfo
    this.workdir = workdir
    this.workId = workId
  }

  /**
   * 获取任务数据
   */
  getTaskData(): Task {
    return this.taskInfo
  }

  /**
   * 获取插件公开 ID
   */
  getPluginPublicId(): string {
    return this.pluginPublicId
  }

  /**
   * 获取贡献点文件路径信息
   */
  getContributionInfo(): ContributionFilePathInfo {
    return this.contributionInfo
  }

  /**
   * 获取工作目录
   */
  getWorkdir(): string {
    return this.workdir
  }

  /**
   * 获取作品 ID
   */
  getWorkId(): number {
    return this.workId
  }
}
