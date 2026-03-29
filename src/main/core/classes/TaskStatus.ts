import { TaskStatusEnum } from '../../constant/TaskStatusEnum.ts'
import Task from '@shared/model/entity/Task.ts'

/**
 * 任务运行实例
 *
 * 职责：管理单个任务的完整信息，包括状态追踪
 * 用于保存在 TaskQueue.taskMap 中，实现对所有活动任务的监控
 */
export class TaskStatus {
  /**
   * 任务 ID
   */
  readonly taskId: number

  /**
   * 任务状态
   */
  status: TaskStatusEnum

  /**
   * 父任务 ID
   */
  readonly parentId: number | null | undefined

  /**
   * 任务信息
   */
  private readonly taskInfo: Task

  /**
   * 插件公开 ID
   */
  private readonly pluginPublicId: string

  /**
   * 贡献点文件路径
   */
  private readonly contributionPath: string

  /**
   * 工作目录
   */
  private readonly workdir: string

  /**
   * 清理定时器 ID
   */
  clearTimeoutId: NodeJS.Timeout | undefined

  /**
   * 任务变更是否已存储到数据库
   */
  taskChangeStored: boolean

  constructor(
    taskId: number,
    status: TaskStatusEnum,
    parentId: number | null | undefined,
    taskInfo: Task,
    pluginPublicId: string,
    contributionPath: string,
    workdir: string
  ) {
    this.taskId = taskId
    this.status = status
    this.parentId = parentId
    this.taskInfo = taskInfo
    this.pluginPublicId = pluginPublicId
    this.contributionPath = contributionPath
    this.workdir = workdir
    this.clearTimeoutId = undefined
    this.taskChangeStored = false
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
   * 获取贡献点文件路径
   */
  getContributionInfo(): string {
    return this.contributionPath
  }

  /**
   * 获取工作目录
   */
  getWorkdir(): string {
    return this.workdir
  }

  /**
   * 改变任务状态
   * @param status 新的状态
   * @param taskChangeStored 任务变更是否已存储
   */
  changeStatus(status: TaskStatusEnum, taskChangeStored: boolean): void {
    this.status = status
    this.taskChangeStored = taskChangeStored
  }

  /**
   * 是否处于等待状态
   */
  waiting(): boolean {
    return this.status === TaskStatusEnum.WAITING
  }

  /**
   * 是否处于处理中状态
   */
  processing(): boolean {
    return this.status === TaskStatusEnum.PROCESSING
  }

  /**
   * 是否处于暂停状态
   */
  paused(): boolean {
    return this.status === TaskStatusEnum.PAUSE
  }

  /**
   * 是否已结束（完成或失败）
   */
  over(): boolean {
    return this.status === TaskStatusEnum.FINISHED || this.status === TaskStatusEnum.FAILED
  }

  /**
   * 是否是活动状态（等待、处理中、暂停）
   */
  isActive(): boolean {
    return this.waiting() || this.processing() || this.paused()
  }
}
