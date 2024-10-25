import SettingsService from '../service/SettingsService.js'
import pLimit from 'p-limit'
import { TaskStatusEnum } from '../constant/TaskStatusEnum.js'
import { assertFalse, assertTrue } from '../util/AssertUtil.js'
import TaskWriter from '../util/TaskWriter.js'

export class TaskQueue {
  /**
   * 异步限制器
   * @private
   */
  private limit: pLimit.Limit

  /**
   * 任务writer
   * @private
   */
  private readonly taskPool: Map<number, TaskWriter>

  constructor() {
    // 读取设置中的最大并行数
    const settings = SettingsService.getSettings()
    const maxSaveWorksPromise =
      settings.importSettings.maxParallelImport >= 1 ? settings.importSettings.maxParallelImport : 1
    this.limit = pLimit(maxSaveWorksPromise)
    this.taskPool = new Map<number, TaskWriter>()
  }

  // public refreshLimit(): void {}

  /**
   * 开始任务
   * @param func
   * @param taskId 任务id
   */
  public start(taskId: number, func: () => Promise<TaskStatusEnum>): Promise<TaskStatusEnum> {
    assertTrue(this.exists(taskId), 'TaskQueue', `无法开始任务${taskId}，队列中找不到这个任务`)
    const status = this.getStatus(taskId)
    assertFalse(
      TaskStatusEnum.PROCESSING === status || TaskStatusEnum.PAUSE === status,
      'TaskQueue',
      `任务${taskId}已经存在，不能开始`
    )
    return this.execute(taskId, func)
  }

  /**
   * 恢复任务
   * @param func
   * @param taskId 任务id
   */
  public resume(taskId: number, func: () => Promise<TaskStatusEnum>): Promise<TaskStatusEnum> {
    assertTrue(this.exists(taskId), 'TaskQueue', `无法恢复任务${taskId}，队列中找不到这个任务`)
    const status = this.getStatus(taskId)
    assertFalse(
      TaskStatusEnum.PROCESSING === status,
      'TaskQueue',
      `任务${taskId}已经正在进行中，无法恢复`
    )
    assertFalse(
      TaskStatusEnum.FINISHED === status || TaskStatusEnum.FAILED === status,
      'TaskQueue',
      `任务${taskId}已经结束，不能恢复`
    )
    return this.execute(taskId, func)
  }

  /**
   * 插入任务
   * @param taskId 任务id
   * @param taskWriter 任务writer
   */
  public push(taskId: number, taskWriter: TaskWriter): void {
    assertFalse(this.taskPool.has(taskId), 'TaskQueue', `任务队列中已经存在任务${taskId}`)
    this.taskPool.set(taskId, taskWriter)
  }

  /**
   * 判断任务是否存在于队列中
   * @param taskId
   */
  public exists(taskId: number): boolean {
    return this.taskPool.has(taskId)
  }

  /**
   * 获取任务的状态
   * @param taskId
   */
  public getStatus(taskId: number): TaskStatusEnum | undefined {
    return this.taskPool.get(taskId)?.status
  }

  /**
   * 从任务池移除
   * @param taskId
   */
  public remove(taskId: number) {
    this.taskPool.delete(taskId)
  }

  /**
   * 获取任务writer
   * @param taskId 任务id
   */
  public getWriter(taskId: number): TaskWriter | undefined {
    return this.taskPool.get(taskId)
  }

  /**
   *
   * @param taskId
   * @param func
   * @private
   */
  private execute(taskId: number, func: () => Promise<TaskStatusEnum>) {
    const taskPromise = this.limit(() => func())

    // 确认任务结束或失败后，延迟2秒清除其writer
    taskPromise
      .then((taskStatus) => {
        if (taskStatus === TaskStatusEnum.FINISHED) {
          setTimeout(() => this.taskPool.delete(taskId), 2000)
        }
      })
      .catch(() => {
        setTimeout(() => this.taskPool.delete(taskId), 2000)
      })
    return taskPromise
  }
}
