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
import Task from '../model/Task.js'

export class TaskQueue {
  private readonly queue: TaskQueueItem[]
  private readonly taskMap: Map<number, TaskRunningObj>
  private taskService: TaskService
  private readonly pluginLoader: PluginLoader<TaskHandler>
  private taskProcessStream: TaskProcessStream

  constructor() {
    this.queue = []
    this.taskMap = new Map()
    this.taskService = new TaskService()
    this.pluginLoader = new PluginLoader(new TaskHandlerFactory())
    this.taskProcessStream = new TaskProcessStream(this.pluginLoader)
    this.initializeStream()
  }

  public push(item: TaskQueueItem) {
    // 处理开始和恢复操作
    if (item.operation === TaskOperation.START || item.operation === TaskOperation.RESUME) {
      let taskRunningObj = this.taskMap.get(item.taskId)
      if (notNullish(taskRunningObj)) {
        if (!taskRunningObj.queueItem.done) {
          const operationStr = item.operation === TaskOperation.START ? '开始' : '恢复'
          LogUtil.warn('TaskQueue', `无法${operationStr}任务${item.taskId}，队列中已经存在其他操作`)
          return
        }
        taskRunningObj.queueItem = item
        taskRunningObj.status = TaskStatusEnum.WAITING
      } else {
        // 操作添加到任务池和操作队列中
        taskRunningObj = new TaskRunningObj(
          item.taskId,
          item,
          TaskStatusEnum.WAITING,
          new TaskWriter()
        )
        this.taskMap.set(item.taskId, taskRunningObj)
        this.queue.push(item)
        this.taskService.taskWaiting(item.taskId)
        // 处理新任务
        this.taskProcessStream.addIterators([taskRunningObj][Symbol.iterator]())
      }
    } else if (item.operation === TaskOperation.PAUSE) {
      this.taskService.getById(item.taskId).then((task) => {
        assertNotNullish(task, 'TaskQueue', `任务id${item.taskId}不可用，无法暂停此任务`)
        this.pauseTask(item.taskId, task)
      })
    } else if (item.operation === TaskOperation.STOP) {
      this.taskService.getById(item.taskId).then((task) => {
        assertNotNullish(task, 'TaskQueue', `任务id${item.taskId}不可用，无法停止此任务`)
        this.stopTask(item.taskId, task)
      })
    }
  }

  public pushBatch(taskIds: number[], taskOperation: TaskOperation) {
    if (taskOperation === TaskOperation.START || taskOperation === TaskOperation.RESUME) {
      const operableIds: number[] = []
      const taskRunningObjs = taskIds
        .filter((taskId) => {
          const taskRunningObj = this.taskMap.get(taskId)
          if (notNullish(taskRunningObj) && !taskRunningObj.queueItem.done) {
            const operationStr = taskOperation === TaskOperation.START ? '开始' : '恢复'
            LogUtil.warn('TaskQueue', `无法${operationStr}任务${taskId}，队列中已经存在其他操作`)
            return false
          }
          return true
        })
        .map((taskId) => {
          const queueItem = new TaskQueueItem(taskId, taskOperation)
          let taskRunningObj = this.taskMap.get(taskId)
          if (isNullish(taskRunningObj)) {
            taskRunningObj = new TaskRunningObj(
              queueItem.taskId,
              queueItem,
              TaskStatusEnum.WAITING,
              new TaskWriter()
            )
            this.taskMap.set(queueItem.taskId, taskRunningObj)
          } else {
            taskRunningObj.queueItem = queueItem
            taskRunningObj.status = TaskStatusEnum.WAITING
          }
          this.queue.push(queueItem)
          LogUtil.info('TaskQueue', `任务${taskId}进入队列`)
          operableIds.push(taskId)
          return taskRunningObj
        })
      // 所有任务设置为等待中
      this.taskService.updateStatusBatchById(operableIds, TaskStatusEnum.WAITING)

      this.taskProcessStream.addIterators(taskRunningObjs[Symbol.iterator]())
    } else if (taskOperation === TaskOperation.PAUSE) {
      this.taskService
        .listByIds(taskIds)
        .then((tasks) => tasks.forEach((task) => this.pauseTask(task.id as number, task)))
    } else if (taskOperation === TaskOperation.STOP) {
      this.taskService
        .listByIds(taskIds)
        .then((tasks) => tasks.forEach((task) => this.stopTask(task.id as number, task)))
    }
  }

  private pauseTask(taskId: number, task: Task) {
    const taskRunningObj = this.taskMap.get(taskId)
    assertNotNullish(taskRunningObj, 'TaskQueue', `无法暂停任务${taskId}，队列中没有这个任务`)
    const queueItem = taskRunningObj.queueItem
    const operation = queueItem.operation
    if (TaskOperation.START === operation || TaskOperation.RESUME === operation) {
      queueItem.canceled = true
      this.removeFromQueue(queueItem)
      if (queueItem.processing) {
        this.taskService.pauseTask(task, this.pluginLoader, taskRunningObj.taskWriter)
      } else {
        queueItem.done = true
      }
      taskRunningObj.status = TaskStatusEnum.PAUSE
      this.taskService.taskPaused(taskId)
    } else {
      const msg = `暂停任务时，任务的原操作出现了异常的值，operation: ${operation}`
      LogUtil.error('TaskQueue', msg)
      throw new Error(msg)
    }
  }

  private stopTask(taskId: number, task: Task) {
    const taskRunningObj = this.taskMap.get(taskId)
    assertNotNullish(taskRunningObj, 'TaskQueue', `无法停止任务${taskId}，队列中没有这个任务`)
    const queueItem = taskRunningObj.queueItem
    const operation = queueItem.operation
    if (TaskOperation.START === operation || TaskOperation.RESUME === operation) {
      queueItem.canceled = true
      this.removeFromQueue(queueItem)
      if (queueItem.processing) {
        this.taskService.pauseTask(task, this.pluginLoader, taskRunningObj.taskWriter)
      }
      taskRunningObj.status = TaskStatusEnum.PAUSE
      this.taskService.taskPaused(taskId)
    } else {
      const msg = `暂停任务时，任务的原操作出现了异常的值，operation: ${operation}`
      LogUtil.error('TaskQueue', msg)
      throw new Error(msg)
    }
  }

  /**
   * 获取任务进度
   * @param taskId 任务id
   */
  public getSchedule(taskId: number): TaskScheduleDTO | undefined {
    const taskRunningObj = this.taskMap.get(taskId)
    if (isNullish(taskRunningObj)) {
      return undefined
    }
    if (TaskStatusEnum.FINISHED === taskRunningObj.status) {
      return new TaskScheduleDTO({ id: taskId, status: TaskStatusEnum.FINISHED, schedule: 100 })
    }
    const writer = taskRunningObj.taskWriter
    if (
      TaskStatusEnum.PROCESSING === taskRunningObj.status ||
      TaskStatusEnum.PAUSE === taskRunningObj.status
    ) {
      if (writer.bytesSum === 0) {
        // LogUtil.warn('TaskService', `计算任务进度时，资源总量为0`)
        return new TaskScheduleDTO({ id: taskId, status: taskRunningObj.status, schedule: 0 })
      } else if (notNullish(writer.writable)) {
        const schedule = (writer.writable.bytesWritten / writer.bytesSum) * 100
        return new TaskScheduleDTO({
          id: taskId,
          status: taskRunningObj.status,
          schedule: schedule
        })
      }
    }
    return undefined
  }

  private initializeStream() {
    this.taskProcessStream.on(
      'data',
      (data: { task: TaskDTO; taskRunningObj: TaskRunningObj; saveResult: TaskSaveResult }) => {
        const saveResult = data.saveResult
        const taskRunningObj = data.taskRunningObj
        assertNotNullish(
          taskRunningObj,
          'TaskQueue',
          `任务${taskRunningObj.taskId}结束时在任务池中找不到这个任务`
        )
        taskRunningObj.status = saveResult.status
        taskRunningObj.queueItem.done = true

        this.removeFromQueue(taskRunningObj.queueItem)
        if (
          TaskStatusEnum.FINISHED === taskRunningObj.status ||
          TaskStatusEnum.FAILED === taskRunningObj.status
        ) {
          this.removeFromMap(taskRunningObj.taskId)
        }
      }
    )
    this.taskProcessStream.on(
      'error',
      async (error: Error, task: TaskDTO, taskRunningObj: TaskRunningObj) => {
        assertNotNullish(
          taskRunningObj,
          'TaskQueue',
          `处理任务时出错，taskId: ${task.id}，error: ${error.message}`
        )
        taskRunningObj.status = TaskStatusEnum.FAILED
        this.removeFromQueue(taskRunningObj.queueItem)
        this.removeFromMap(taskRunningObj.taskId)
      }
    )
    this.taskProcessStream.on('finish', () => LogUtil.info('TaskQueue', '任务队列完成'))
  }

  private removeFromQueue(queueItem: TaskQueueItem) {
    this.queue.slice(this.queue.indexOf(queueItem), 1)
  }

  private removeFromMap(taskId: number) {
    this.taskMap.delete(taskId)
  }
}

export class TaskQueueItem {
  public taskId: number
  public operation: TaskOperation
  public processing: boolean
  public canceled: boolean
  public done: boolean

  constructor(taskId: number, operation: TaskOperation) {
    this.taskId = taskId
    this.operation = operation
    this.processing = false
    this.canceled = false
    this.done = false
  }
}

export class TaskRunningObj {
  public taskId: number
  public queueItem: TaskQueueItem
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
  private readonly pluginLoader: PluginLoader<TaskHandler>
  private readonly iterators: IterableIterator<TaskRunningObj>[]
  private consuming: boolean
  private maxParallel: number
  private processing: number
  private limited: boolean

  constructor(pluginLoader: PluginLoader<TaskHandler>) {
    super({ objectMode: true }) // 设置为对象模式
    this.taskService = new TaskService()
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
    chunk: { task: TaskDTO; taskRunningObj: TaskRunningObj; resumeMode: boolean },
    _encoding: string,
    callback: TransformCallback
  ): void {
    const task = chunk.task
    const taskRunningObj = chunk.taskRunningObj
    const taskWriter = taskRunningObj.taskWriter

    // 开始之前检查操作是否被取消
    if (taskRunningObj.queueItem.canceled) {
      callback()
      return
    }

    // 开始任务，同时在队列中标记为进行中
    taskRunningObj.queueItem.processing = true
    taskRunningObj.status = TaskStatusEnum.PROCESSING
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

  public addIterators(tasks: IterableIterator<TaskRunningObj>) {
    this.iterators.push(tasks)
    this.consumeIterators()
  }

  /**
   * 处理任务
   * @param tasks
   * @private
   */
  private process(tasks: IterableIterator<TaskRunningObj>) {
    // 将任务列表写入流中，启动处理过程
    let done: boolean | undefined = false
    while (!done) {
      const next: IteratorResult<TaskRunningObj> = tasks.next()
      const taskRunningObj: TaskRunningObj = next.value
      done = next.done
      if (!done) {
        this.taskService.getById(taskRunningObj.taskId).then((task) => {
          assertNotNullish(task, 'TaskQueue', `处理任务${taskRunningObj.taskId}失败，任务id无效`)
          const taskDTO = new TaskDTO(task)
          this.write({
            task: taskDTO,
            taskRunningObj: taskRunningObj,
            resumeMode: taskRunningObj.queueItem.operation === TaskOperation.RESUME
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
