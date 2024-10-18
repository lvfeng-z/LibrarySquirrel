import SettingsService from '../service/SettingsService.js'
import pLimit from 'p-limit'
import { TaskStatesEnum } from '../constant/TaskStatesEnum.js'
import { TaskTracker } from '../model/utilModels/TaskTracker.js'
import { Readable } from 'node:stream'
import fs from 'fs'
import { isNullish } from '../util/CommonUtil.js'
import LogUtil from '../util/LogUtil.js'

export class TaskQueue {
  /**
   * 任务队列
   * @private
   */
  private queue: pLimit.Limit

  /**
   * 任务追踪器
   * @private
   */
  private readonly taskTrackers: Record<number, TaskTracker>

  constructor() {
    // 读取设置中的最大并行数
    const settings = SettingsService.getSettings()
    const maxSaveWorksPromise =
      settings.importSettings.maxParallelImport >= 1 ? settings.importSettings.maxParallelImport : 1
    this.queue = pLimit(maxSaveWorksPromise)
    this.taskTrackers = {}
  }

  // public execute(): void {}
  // public refreshLimit(): void {}
  /**
   * 插入任务
   * @param task 任务
   * @param taskId 任务id
   * @param taskTracker 任务追踪器
   */
  public push(
    task: () => Promise<TaskStatesEnum>,
    taskId: number,
    taskTracker: TaskTracker
  ): Promise<TaskStatesEnum> {
    const taskPromise = this.queue(task)
    this.addTracker(taskId, taskTracker, taskPromise)
    return taskPromise
  }

  /**
   * 获取任务追踪器
   * @param taskId 任务id
   */
  public getTracker(taskId: number): TaskTracker {
    return this.taskTrackers[taskId]
  }

  /**
   * 新增任务追踪器
   * @param taskId 任务id
   * @param taskTracker 任务追踪器
   * @param taskEndHandler 任务结束的promise
   * @private
   */
  private addTracker(
    taskId: number,
    taskTracker: TaskTracker,
    taskEndHandler: Promise<TaskStatesEnum>
  ): void {
    this.taskTrackers[taskId] = taskTracker
    // 确认任务结束或失败后，延迟2秒清除其追踪器
    taskEndHandler
      .then((taskStatus) => {
        taskTracker.status = taskStatus
        if (taskStatus === TaskStatesEnum.FINISHED) {
          setTimeout(() => delete this.taskTrackers[taskId], 2000)
        }
      })
      .catch(() => {
        taskTracker.status = TaskStatesEnum.FAILED
        setTimeout(() => delete this.taskTrackers[taskId], 2000)
      })
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
  }
}
