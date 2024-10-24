import SettingsService from '../service/SettingsService.js'
import pLimit from 'p-limit'
import { TaskStatusEnum } from '../constant/TaskStatusEnum.js'
import { isNullish, notNullish } from '../util/CommonUtil.js'
import { assertFalse } from '../util/AssertUtil.js'
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

  // public execute(): void {}
  // public refreshLimit(): void {}

  /**
   * 恢复任务
   * @param func
   * @param taskId 任务id
   * @param taskWriter 任务writer
   */
  public start(
    taskId: number,
    taskWriter: TaskWriter,
    func: () => Promise<TaskStatusEnum>
  ): Promise<TaskStatusEnum> {
    const writer = this.taskPool.get(taskId)
    if (isNullish(writer)) {
      return this.push(taskId, taskWriter, func)
    } else {
      assertFalse(
        TaskStatusEnum.PROCESSING === writer.status || TaskStatusEnum.PAUSE === writer.status,
        'TaskQueue',
        `任务${taskId}已经存在，不能开始`
      )
      return this.push(taskId, taskWriter, func)
    }
  }

  /**
   * 恢复任务
   * @param func
   * @param taskId 任务id
   * @param taskWriter 任务writer
   */
  public resume(
    taskId: number,
    taskWriter: TaskWriter,
    func: () => Promise<TaskStatusEnum>
  ): Promise<TaskStatusEnum> {
    const writer = this.taskPool.get(taskId)
    if (isNullish(writer)) {
      return this.push(taskId, taskWriter, func)
    } else {
      assertFalse(
        TaskStatusEnum.PROCESSING === writer.status,
        'TaskQueue',
        `任务${taskId}已经存在，不能恢复`
      )
      assertFalse(
        TaskStatusEnum.FINISHED === writer.status || TaskStatusEnum.FAILED === writer.status,
        'TaskQueue',
        `任务${taskId}已经结束，不能恢复`
      )
      return this.push(taskId, taskWriter, func)
    }
  }

  /**
   * 从任务池移除
   * @param taskId
   */
  remove(taskId: number) {
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
   * 更新任务writer状态
   * @param taskIds 任务id列表
   * @param taskStatus 任务状态
   */
  public updateStatusBatch(taskIds: number[], taskStatus: TaskStatusEnum): void {
    taskIds.forEach((id) => {
      const writer = this.getWriter(id)
      if (notNullish(writer)) {
        writer.status = taskStatus
      }
    })
  }

  /**
   * 插入任务
   * @param func
   * @param taskId 任务id
   * @param taskWriter 任务writer
   */
  private push(
    taskId: number,
    taskWriter: TaskWriter,
    func: () => Promise<TaskStatusEnum>
  ): Promise<TaskStatusEnum> {
    this.taskPool.set(taskId, taskWriter)
    const taskPromise = this.limit(() => func())

    // 确认任务结束或失败后，延迟2秒清除其writer
    taskPromise
      .then((taskStatus) => {
        taskWriter.status = taskStatus
        if (taskStatus === TaskStatusEnum.FINISHED) {
          setTimeout(() => this.taskPool.delete(taskId), 2000)
        }
      })
      .catch(() => {
        taskWriter.status = TaskStatusEnum.FAILED
        setTimeout(() => this.taskPool.delete(taskId), 2000)
      })
    return taskPromise
  }
}
