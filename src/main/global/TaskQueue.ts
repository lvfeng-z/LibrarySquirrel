import { TaskStatusEnum } from '../constant/TaskStatusEnum.js'
import { assertNotNullish } from '../util/AssertUtil.js'
import LogUtil from '../util/LogUtil.js'
import TaskService from '../service/TaskService.js'
import { isNullish, notNullish } from '../util/CommonUtil.js'
import SettingsService from '../service/SettingsService.js'
import { Transform, TransformCallback } from 'node:stream'
import PluginLoader from '../plugin/PluginLoader.js'
import { TaskHandler, TaskHandlerFactory } from '../plugin/TaskHandler.js'
import TaskDTO from '../model/dto/TaskDTO.js'
import TaskSaveResult from '../model/utilModels/TaskSaveResult.js'
import TaskWriter from '../util/TaskWriter.js'
import TaskScheduleDTO from '../model/dto/TaskScheduleDTO.js'

export class TaskQueue {
  private readonly queue: TaskQueueItem[]
  private readonly taskMap: Map<number, TaskInfo>
  private taskService: TaskService
  private taskProcessStream: TaskProcessStream

  constructor() {
    this.queue = []
    this.taskMap = new Map()
    this.taskService = new TaskService()
    this.taskProcessStream = new TaskProcessStream(
      this.taskMap,
      new PluginLoader(new TaskHandlerFactory())
    )
    this.initializeHandlers()
  }

  public push(item: TaskQueueItem) {
    // 处理暂停和停止操作
    const enqueue = this.preprocess(item)
    // 处理开始和恢复操作
    if (enqueue) {
      if (this.taskMap.has(item.taskId)) {
        const operationStr = item.operation === TaskOperation.START ? '开始' : '恢复'
        LogUtil.warn('TaskQueueR', `无法${operationStr}任务${item.taskId}，队列中已经存在其他操作`)
      } else {
        // 操作添加到任务池和操作队列中
        const taskInfo = new TaskInfo(item.taskId, item, TaskStatusEnum.WAITING, new TaskWriter())
        this.taskMap.set(item.taskId, taskInfo)
        this.queue.push(item)
        // 处理新任务
        this.taskProcessStream.addIterators([item][Symbol.iterator]())
      }
    }
  }

  public pushBatch(taskIds: number[], taskOperation: TaskOperation) {
    const queueItems = taskIds
      .filter((taskId) => {
        const exists = this.taskMap.has(taskId)
        if (exists) {
          LogUtil.warn('TaskQueueR', `无法开始任务${taskId}，队列中已经存在其他操作`)
        }
        return !exists
      })
      .map((taskId) => {
        const item = new TaskQueueItem(taskId, taskOperation)
        const taskInfo = new TaskInfo(item.taskId, item, TaskStatusEnum.WAITING, new TaskWriter())
        this.queue.push(item)
        this.taskMap.set(item.taskId, taskInfo)
        LogUtil.info('TaskQueueR', `任务${taskId}进入队列`)
        return item
      })

    this.taskProcessStream.addIterators(queueItems[Symbol.iterator]())
  }

  private initializeHandlers() {
    this.taskProcessStream.on('data', (data: { task: TaskDTO; saveResult: TaskSaveResult }) => {
      const task = data.task
      const saveResult = data.saveResult
      assertNotNullish(task.id)
      const taskInfo = this.taskMap.get(task.id)
      assertNotNullish(taskInfo, 'TaskQueueR', `任务${task.id}结束时在任务池中找不到这个任务`)
      taskInfo.status = saveResult.status
      assertNotNullish(
        taskInfo.queueItem,
        'TaskQueueR',
        `任务${task.id}结束时在任务池中找不到这个任务的操作对象`
      )
      this.queue.slice(this.queue.indexOf(taskInfo.queueItem), 1)
      this.taskMap.delete(taskInfo.taskId)
    })
    this.taskProcessStream.on('error', async (error: Error, task: TaskDTO) => {
      assertNotNullish(task.id)
      const taskInfo = this.taskMap.get(task.id)
      assertNotNullish(
        taskInfo,
        'TaskQueueR',
        `处理任务时出错，taskId: ${task.id}，error: ${error.message}`
      )
      taskInfo.status = TaskStatusEnum.FAILED
      assertNotNullish(
        taskInfo.queueItem,
        'TaskQueueR',
        `任务${task.id}结束时在任务池中找不到这个任务的操作对象`
      )
      this.queue.slice(this.queue.indexOf(taskInfo.queueItem), 1)
      this.taskMap.delete(taskInfo.taskId)
    })
    this.taskProcessStream.on('finish', () => LogUtil.info('TaskQueueR', '任务队列完成'))
  }

  /**
   * 获取任务进度
   * @param taskId 任务id
   */
  public getSchedule(taskId: number): TaskScheduleDTO | undefined {
    const taskInfo = this.taskMap.get(taskId)
    if (isNullish(taskInfo)) {
      return undefined
    }
    if (TaskStatusEnum.FINISHED === taskInfo.status) {
      return new TaskScheduleDTO({ id: taskId, status: TaskStatusEnum.FINISHED, schedule: 100 })
    }
    const writer = taskInfo.taskWriter
    if (TaskStatusEnum.PROCESSING === taskInfo.status || TaskStatusEnum.PAUSE === taskInfo.status) {
      if (writer.bytesSum === 0) {
        LogUtil.warn('TaskService', `计算任务进度时，资源总量为0`)
        return new TaskScheduleDTO({ id: taskId, status: taskInfo.status, schedule: 0 })
      } else if (notNullish(writer.writable)) {
        const schedule = (writer.writable.bytesWritten / writer.bytesSum) * 100
        return new TaskScheduleDTO({ id: taskId, status: taskInfo.status, schedule: schedule })
      }
    }
    return undefined
  }

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
          taskInfo.taskWriter.pause()
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
  public taskWriter: TaskWriter

  constructor(
    taskId: number,
    queueItem: TaskQueueItem,
    status: TaskStatusEnum,
    taskWriter: TaskWriter
  ) {
    this.taskId = taskId
    this.queueItem = queueItem
    this.status = status
    this.taskWriter = taskWriter
  }
}

export enum TaskOperation {
  START = 1,
  PAUSE = 2,
  RESUME = 3,
  STOP = 4
}

/**
 * 任务处理流
 */
class TaskProcessStream extends Transform {
  private taskService: TaskService
  private taskMap: Map<number, TaskInfo>
  private readonly pluginLoader: PluginLoader<TaskHandler>
  private readonly iterators: IterableIterator<TaskQueueItem>[]
  private consuming: boolean
  private maxParallel: number
  private processing: number
  private limited: boolean

  constructor(taskMap: Map<number, TaskInfo>, pluginLoader: PluginLoader<TaskHandler>) {
    super({ objectMode: true }) // 设置为对象模式
    this.taskService = new TaskService()
    this.taskMap = taskMap
    this.pluginLoader = pluginLoader
    this.iterators = []
    this.consuming = false
    // 读取设置中的最大并行数
    const settings = SettingsService.getSettings()
    this.maxParallel =
      settings.importSettings.maxParallelImport >= 1 ? settings.importSettings.maxParallelImport : 1
    this.processing = 0
    this.limited = false
  }

  _transform(
    chunk: { task: TaskDTO; resumeMode: boolean },
    _encoding: string,
    callback: TransformCallback
  ): void {
    const task = chunk.task
    assertNotNullish(task.id)

    const taskInfo = this.taskMap.get(task.id)
    assertNotNullish(taskInfo, 'TaskQueueR', `处理任务${task.id}时，taskWriter意外为空`)
    const taskWriter = taskInfo.taskWriter
    const saveResultPromise: Promise<TaskSaveResult> = chunk.resumeMode
      ? this.taskService.resumeTask(task, this.pluginLoader, taskWriter)
      : this.taskService.processTask(task, this.pluginLoader, taskWriter)

    this.processing++
    this.limited = this.processing >= this.maxParallel

    saveResultPromise
      .then((saveResult: TaskSaveResult) => {
        this.push({ task: task, taskRunningObj: taskRunningObj, saveResult: saveResult })
        this.processing--
        if (this.limited) {
          this.limited = false
          callback()
        }
        this.push({ task: task, saveResult: saveResult })
      })
      .catch((err) => {
        this.emit('error', err, task, taskRunningObj)
        this.processing--
        if (this.limited) {
          this.limited = false
          callback()
        }
      })
    if (!this.limited) {
      callback()
    }
  }

  public addIterators(tasks: IterableIterator<TaskQueueItem>) {
    this.iterators.push(tasks)
    this.consumeIterators()
  }

  /**
   * 处理任务
   * @param tasks
   * @private
   */
  private process(tasks: IterableIterator<TaskQueueItem>) {
    // 将任务列表写入流中，启动处理过程
    let done: boolean | undefined = false
    while (!done) {
      const next: IteratorResult<TaskQueueItem> = tasks.next()
      const taskQueueItem: TaskQueueItem = next.value
      done = next.done
      if (!done && !taskQueueItem.canceled) {
        this.taskService.getById(taskQueueItem.taskId).then((task) => {
          assertNotNullish(task, 'TaskQueueR', `处理任务${taskQueueItem.taskId}失败，任务id无效`)
          const taskDTO = new TaskDTO(task)
          this.write({
            task: taskDTO,
            resumeMode: taskQueueItem.operation === TaskOperation.RESUME
          })
        })
      }
    }
  }

  private consumeIterators() {
    if (!this.consuming) {
      this.consuming = true
      while (this.iterators.length > 0) {
        const next = this.iterators.shift()
        if (notNullish(next)) {
          this.process(next)
        }
      }
      this.consuming = false
    }
  }
}
