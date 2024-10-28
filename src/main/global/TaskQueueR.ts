import { TaskStatusEnum } from '../constant/TaskStatusEnum.js'
import { assertNotNullish } from '../util/AssertUtil.js'
import LogUtil from '../util/LogUtil.js'
import TaskService from '../service/TaskService.js'
import { arrayNotEmpty } from '../util/CommonUtil.js'
import SettingsService from '../service/SettingsService.js'

export class TaskQueueR {
  private readonly queue: TaskQueueItem[]
  private taskMap: Map<number, TaskInfo>
  private taskService: TaskService
  private maxParallel: number
  private readonly processing: Promise<TaskStatusEnum>[]

  constructor() {
    this.queue = []
    this.taskMap = new Map()
    this.taskService = new TaskService()
    // 读取设置中的最大并行数
    const settings = SettingsService.getSettings()
    this.maxParallel =
      settings.importSettings.maxParallelImport >= 1 ? settings.importSettings.maxParallelImport : 1
    this.processing = []
  }

  public push(item: TaskQueueItem) {
    const enqueue = this.preprocess(item)
    if (enqueue) {
      this.queue.push(item)
    }
    if (arrayNotEmpty(this.queue) && this.maxParallel > this.processing.length) {
      this.execute()
    }
  }

  private execute() {
    while (arrayNotEmpty(this.queue)) {}
  }

  private consume() {}
  private getIndex(): Promise<number> {}

  /**
   * 预处理指令，如果这个指令不需要添加到队列中，返回false
   * @param item
   * @private
   */
  private preprocess(item: TaskQueueItem): boolean {
    if (TaskOperation.PAUSE === item.operation) {
      const taskInfo = this.taskMap.get(item.taskId)
      assertNotNullish(taskInfo, 'TaskQueueR', `无法暂停任务${item.taskId}，队列中没有这个任务`)
      const queueItem = taskInfo.queueItem
      assertNotNullish(queueItem, 'TaskQueueR', `暂停任务${item.taskId}时，任务的原操作意外为空`)
      const operation = queueItem.operation
      assertNotNullish(operation, 'TaskQueueR', `暂停任务${item.taskId}时，任务的原操作意外为空`)
      if (TaskOperation.START === operation || TaskOperation.RESUME === operation) {
        queueItem.canceled = true
        if (queueItem.processing) {
          // todo 暂停正在进行的任务
        }
        this.taskService.taskPaused(item.taskId)
      } else {
        const msg = `暂停任务时，任务的原操作出现了异常的值，operation: ${operation}`
        LogUtil.error('TaskQueueR', msg)
        throw new Error(msg)
      }
      return false
    } else if (TaskOperation.STOP === item.operation) {
      // todo 停止任务
      return false
    } else {
      return true
    }
  }
}

export class TaskQueueItem {
  public taskId: number
  public operation: TaskOperation
  public processing: boolean
  public canceled: boolean

  constructor(taskId: number, operation: TaskOperation) {
    this.taskId = taskId
    this.operation = operation
    this.processing = false
    this.canceled = false
  }
}

export class TaskInfo {
  public taskId: number
  public queueItem: TaskQueueItem | undefined
  public status: TaskStatusEnum

  constructor(taskId: number, status: TaskStatusEnum) {
    this.taskId = taskId
    this.queueItem = undefined
    this.status = status
  }
}

export enum TaskOperation {
  START = 1,
  PAUSE = 2,
  RESUME = 3,
  STOP = 4
}
