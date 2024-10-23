import SettingsService from '../service/SettingsService.js'
import pLimit from 'p-limit'
import { TaskStatesEnum } from '../constant/TaskStatesEnum.js'
import { TaskTracker } from '../model/utilModels/TaskTracker.js'
import { Readable } from 'node:stream'
import fs from 'fs'
import { isNullish, notNullish } from '../util/CommonUtil.js'
import LogUtil from '../util/LogUtil.js'
import { assertFalse } from '../util/AssertUtil.js'

export class TaskQueue {
  /**
   * 异步限制器
   * @private
   */
  private limit: pLimit.Limit

  /**
   * 任务追踪器
   * @private
   */
  private readonly taskPool: Map<number, TaskTracker>

  constructor() {
    // 读取设置中的最大并行数
    const settings = SettingsService.getSettings()
    const maxSaveWorksPromise =
      settings.importSettings.maxParallelImport >= 1 ? settings.importSettings.maxParallelImport : 1
    this.limit = pLimit(maxSaveWorksPromise)
    this.taskPool = new Map<number, TaskTracker>()
  }

  // public execute(): void {}
  // public refreshLimit(): void {}

  /**
   * 恢复任务
   * @param func
   * @param taskId 任务id
   * @param taskTracker 任务追踪器
   */
  public start(
    taskId: number,
    taskTracker: TaskTracker,
    func: () => Promise<TaskStatesEnum>
  ): Promise<TaskStatesEnum> {
    const tracker = this.taskPool.get(taskId)
    if (isNullish(tracker)) {
      return this.push(taskId, taskTracker, func)
    } else {
      assertFalse(
        TaskStatesEnum.PROCESSING === tracker.status ||
          TaskStatesEnum.PAUSE === tracker.status ||
          TaskStatesEnum.WAITING === tracker.status,
        'TaskQueue',
        `任务${taskId}已经存在，不能开始`
      )
      return this.push(taskId, taskTracker, func)
    }
  }

  /**
   * 恢复任务
   * @param func
   * @param taskId 任务id
   * @param taskTracker 任务追踪器
   */
  public resume(
    taskId: number,
    taskTracker: TaskTracker,
    func: () => Promise<TaskStatesEnum>
  ): Promise<TaskStatesEnum> {
    const tracker = this.taskPool.get(taskId)
    if (isNullish(tracker)) {
      return this.push(taskId, taskTracker, func)
    } else {
      return this.push(taskId, taskTracker, func)
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
   * 获取任务追踪器
   * @param taskId 任务id
   */
  public getTracker(taskId: number): TaskTracker | undefined {
    return this.taskPool.get(taskId)
  }

  /**
   * 更新任务跟踪器
   * @param taskId 任务id
   * @param newTaskTracker 新的任务跟踪器属性
   */
  public updateTracker(
    taskId: number,
    newTaskTracker: {
      status?: number
      readStream?: Readable
      writeStream?: fs.WriteStream
      bytesSum?: number
      bytesWritten?: number
    }
  ): void {
    const old = this.getTracker(taskId)
    if (isNullish(old)) {
      LogUtil.warn('TaskService', `没有找到需要更新的任务跟踪器，taskId: ${taskId}`)
      return
    }
    if (newTaskTracker.status !== undefined) {
      old.status = newTaskTracker.status
    }
    if (newTaskTracker.bytesSum !== undefined) {
      old.bytesSum = newTaskTracker.bytesSum
    }
    if (newTaskTracker.readStream !== undefined) {
      old.readStream = newTaskTracker.readStream
    }
    if (newTaskTracker.writeStream !== undefined) {
      old.writeStream = newTaskTracker.writeStream
    }
    if (newTaskTracker.bytesWritten !== undefined) {
      old.bytesWritten = newTaskTracker.bytesWritten
    }
  }

  /**
   * 更新任务跟踪器状态
   * @param taskIds 任务id列表
   * @param taskStatus 任务状态
   */
  public updateStatusBatch(taskIds: number[], taskStatus: TaskStatesEnum): void {
    taskIds.forEach((id) => {
      const tracker = this.getTracker(id)
      if (notNullish(tracker)) {
        tracker.status = taskStatus
      }
    })
  }

  /**
   * 插入任务
   * @param func
   * @param taskId 任务id
   * @param taskTracker 任务追踪器
   */
  private push(
    taskId: number,
    taskTracker: TaskTracker,
    func: () => Promise<TaskStatesEnum>
  ): Promise<TaskStatesEnum> {
    this.taskPool.set(taskId, taskTracker)
    const taskPromise = this.limit(() => func())

    // 确认任务结束或失败后，延迟2秒清除其追踪器
    taskPromise
      .then((taskStatus) => {
        taskTracker.status = taskStatus
        if (taskStatus === TaskStatesEnum.FINISHED) {
          setTimeout(() => this.taskPool.delete(taskId), 2000)
        }
      })
      .catch(() => {
        taskTracker.status = TaskStatesEnum.FAILED
        setTimeout(() => this.taskPool.delete(taskId), 2000)
      })
    return taskPromise
  }
}
