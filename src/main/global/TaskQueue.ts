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

/**
 * 任务队列
 */
export class TaskQueue {
  /**
   * 操作队列
   * @private
   */
  private readonly operationQueue: TaskOperationObj[]

  /**
   * 任务池
   * @description 子任务当前的操作、操作是否完成、操作是否取消、任务的状态、任务的资源和写入流等数据封装在运行对象中，以任务id为键保存在这个map里
   * @private
   */
  private readonly taskMap: Map<number, TaskRunningObj>

  /**
   * 父任务池
   * @description 父任务的运行对象以id为键保存在这个map里，父任务的运行对象的children属性保存了其子任务的运行对象
   * @private
   */
  private readonly parentMap: Map<number, ParentRunningObj>

  /**
   * 任务服务
   * @private
   */
  private taskService: TaskService

  /**
   * 插件加载器
   * @private
   */
  private readonly pluginLoader: PluginLoader<TaskHandler>

  /**
   * 任务处理流
   * @private
   */
  private taskProcessStream: TaskProcessStream

  constructor() {
    this.operationQueue = []
    this.taskMap = new Map()
    this.parentMap = new Map()
    this.taskService = new TaskService()
    this.pluginLoader = new PluginLoader(new TaskHandlerFactory())
    this.taskProcessStream = new TaskProcessStream(this.pluginLoader)
    this.initializeStream()
  }

  /**
   * 插入单个操作
   * @param operation 操作
   * @param parentId 父任务id
   */
  public push(operation: TaskOperationObj, parentId?: number) {
    // 处理开始和恢复操作
    if (
      operation.operation === TaskOperation.START ||
      operation.operation === TaskOperation.RESUME
    ) {
      let taskRunningObj = this.taskMap.get(operation.taskId)
      if (notNullish(taskRunningObj)) {
        if (!taskRunningObj.taskOperationObj.done) {
          const operationStr = operation.operation === TaskOperation.START ? '开始' : '恢复'
          LogUtil.warn(
            'TaskQueue',
            `无法${operationStr}任务${operation.taskId}，队列中已经存在其他操作`
          )
          return
        }
        taskRunningObj.taskOperationObj = operation
        taskRunningObj.status = TaskStatusEnum.WAITING
      } else {
        // 操作添加到任务池和操作队列中
        taskRunningObj = new TaskRunningObj(
          operation.taskId,
          operation,
          TaskStatusEnum.WAITING,
          new TaskWriter(),
          parentId
        )
        this.taskMap.set(operation.taskId, taskRunningObj)
        this.operationQueue.push(operation)
        this.taskService.taskWaiting(operation.taskId)
        // 处理新任务
        this.taskProcessStream.addIterators([taskRunningObj][Symbol.iterator]())
      }
    } else if (operation.operation === TaskOperation.PAUSE) {
      this.taskService.getById(operation.taskId).then((task) => {
        assertNotNullish(task, 'TaskQueue', `任务id${operation.taskId}不可用，无法暂停此任务`)
        this.pauseTask(task)
      })
    } else if (operation.operation === TaskOperation.STOP) {
      this.taskService.getById(operation.taskId).then((task) => {
        assertNotNullish(task, 'TaskQueue', `任务id${operation.taskId}不可用，无法停止此任务`)
        this.stopTask(task)
      })
    }
  }

  /**
   * 批量插入操作
   * @param tasks 需要操作的任务
   * @param taskOperation 要执行的操作
   */
  public pushBatch(tasks: Task[], taskOperation: TaskOperation) {
    if (taskOperation === TaskOperation.START || taskOperation === TaskOperation.RESUME) {
      const operableIds: number[] = []
      const taskRunningObjs = tasks
        .filter((task) => {
          assertNotNullish(task.id)
          const taskRunningObj = this.taskMap.get(task.id)
          if (notNullish(taskRunningObj) && !taskRunningObj.taskOperationObj.done) {
            const operationStr = taskOperation === TaskOperation.START ? '开始' : '恢复'
            LogUtil.warn('TaskQueue', `无法${operationStr}任务${task}，队列中已经存在其他操作`)
            return false
          }
          return true
        })
        .map((task) => {
          assertNotNullish(task.id)
          const operationObj = new TaskOperationObj(task.id, taskOperation)
          let taskRunningObj = this.taskMap.get(task.id)
          if (isNullish(taskRunningObj)) {
            taskRunningObj = new TaskRunningObj(
              operationObj.taskId,
              operationObj,
              TaskStatusEnum.WAITING,
              new TaskWriter(),
              task.pid
            )
            this.taskMap.set(operationObj.taskId, taskRunningObj)
          } else {
            taskRunningObj.taskOperationObj = operationObj
            taskRunningObj.status = TaskStatusEnum.WAITING
          }
          this.operationQueue.push(operationObj)
          LogUtil.info('TaskQueue', `任务${task.id}进入队列`)
          operableIds.push(task.id)
          return taskRunningObj
        })
      // 所有任务设置为等待中
      this.taskService.updateStatusBatchById(operableIds, TaskStatusEnum.WAITING)
      // 刷新父任务状态
      this.setChildrenOfParent(taskRunningObjs)

      this.taskProcessStream.addIterators(taskRunningObjs[Symbol.iterator]())
    } else if (taskOperation === TaskOperation.PAUSE) {
      tasks.forEach((task) => this.pauseTask(task))
    } else if (taskOperation === TaskOperation.STOP) {
      tasks.forEach((task) => this.stopTask(task))
    }
  }

  /**
   * 暂停任务
   * @param task 要停暂停的任务
   * @private
   */
  private pauseTask(task: Task) {
    assertNotNullish(task.id, 'TaskQueue', `暂停任务时，任务id意外为空`)
    const taskId = task.id
    const taskRunningObj = this.taskMap.get(taskId)
    assertNotNullish(taskRunningObj, 'TaskQueue', `无法暂停任务${taskId}，队列中没有这个任务`)
    const operationObj = taskRunningObj.taskOperationObj
    const operation = operationObj.operation
    if (TaskOperation.START === operation || TaskOperation.RESUME === operation) {
      operationObj.canceled = true
      this.removeFromQueue(operationObj)
      if (operationObj.processing) {
        this.taskService.pauseTask(task, this.pluginLoader, taskRunningObj.taskWriter)
      } else {
        operationObj.done = true
      }
      taskRunningObj.status = TaskStatusEnum.PAUSE
      this.refreshParentStatus([taskRunningObj.parentId])
      this.taskService.taskPaused(taskId)
    } else {
      const msg = `暂停任务时，任务的原操作出现了异常的值，operation: ${operation}`
      LogUtil.error('TaskQueue', msg)
      throw new Error(msg)
    }
  }

  /**
   * 停止任务
   * @param task 要停止的任务
   * @private
   */
  private stopTask(task: Task) {
    assertNotNullish(task.id, 'TaskQueue', `暂停任务时，任务id意外为空`)
    const taskId = task.id
    const taskRunningObj = this.taskMap.get(taskId)
    assertNotNullish(taskRunningObj, 'TaskQueue', `无法停止任务${taskId}，队列中没有这个任务`)
    const operationObj = taskRunningObj.taskOperationObj
    const operation = operationObj.operation
    if (TaskOperation.START === operation || TaskOperation.RESUME === operation) {
      operationObj.canceled = true
      this.removeFromQueue(operationObj)
      if (operationObj.processing) {
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

  /**
   * 初始化任务处理流
   * @private
   */
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
        taskRunningObj.taskOperationObj.done = true

        this.removeFromQueue(taskRunningObj.taskOperationObj)
        if (
          TaskStatusEnum.FINISHED === taskRunningObj.status ||
          TaskStatusEnum.FAILED === taskRunningObj.status
        ) {
          this.removeFromMap(taskRunningObj.taskId)
        }
        this.refreshParentStatus([taskRunningObj.parentId])
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
        this.removeFromQueue(taskRunningObj.taskOperationObj)
        this.removeFromMap(taskRunningObj.taskId)
      }
    )
    this.taskProcessStream.on('finish', () => LogUtil.info('TaskQueue', '任务队列完成'))
  }

  /**
   * 从操作队列中移除操作
   * @param operationObj 操作实例
   * @private
   */
  private removeFromQueue(operationObj: TaskOperationObj) {
    this.operationQueue.slice(this.operationQueue.indexOf(operationObj), 1)
  }

  /**
   * 从子任务池中移除任务运行实例
   * @param taskId 子任务id
   * @private
   */
  private removeFromMap(taskId: number) {
    this.taskMap.delete(taskId)
  }

  /**
   * 在父任务池中设置父任务的子任务
   * @param runningObjs 子任务运行实例列表
   * @private
   */
  private setChildrenOfParent(runningObjs: TaskRunningObj[]) {
    const parentWaitingRefresh: number[] = []
    runningObjs.forEach((runningObj) => {
      if (notNullish(runningObj.parentId) && runningObj.parentId !== -1) {
        let parent = this.parentMap.get(runningObj.parentId)
        if (isNullish(parent)) {
          parent = new ParentRunningObj(runningObj.parentId, TaskStatusEnum.WAITING)
          this.parentMap.set(runningObj.parentId, parent)
        }
        parent.children.set(runningObj.taskId, runningObj)
        parentWaitingRefresh.push(runningObj.parentId)
      }
    })
    this.refreshParentStatus(parentWaitingRefresh)
  }

  /**
   * 刷新父任务的状态（包括父任务池和数据库）
   * @param parentIds 父任务Id列表
   * @private
   */
  private async refreshParentStatus(parentIds: number[]) {
    for (const id of parentIds) {
      const parentRunningObj = this.parentMap.get(id)
      if (notNullish(parentRunningObj)) {
        const allChildren = await this.taskService.listChildrenTask(id)
        allChildren.forEach((children) => {
          if (!parentRunningObj.children.has(children.id as number)) {
            const taskStatus = new TaskStatus(
              children.id as number,
              children.status as TaskStatusEnum
            )
            parentRunningObj.children.set(children.id as number, taskStatus)
          }
        })

        const children = Array.from(parentRunningObj.children.values())
        const processing = children.filter(
          (child) => TaskStatusEnum.PROCESSING === child.status
        ).length
        const waiting = children.filter((child) => TaskStatusEnum.WAITING === child.status).length
        const paused = children.filter((child) => TaskStatusEnum.PAUSE === child.status).length
        const finished = children.filter((child) => TaskStatusEnum.FINISHED === child.status).length
        const failed = children.filter((child) => TaskStatusEnum.FAILED === child.status).length

        let newStatus: TaskStatusEnum = parentRunningObj.status
        if (processing > 0) {
          newStatus = TaskStatusEnum.PROCESSING
        } else if (waiting > 0) {
          newStatus = TaskStatusEnum.WAITING
        } else if (paused > 0) {
          newStatus = TaskStatusEnum.PAUSE
        } else if (finished > 0 && failed > 0) {
          newStatus = TaskStatusEnum.PARTLY_FINISHED
        } else if (finished > 0) {
          newStatus = TaskStatusEnum.FINISHED
        } else if (failed > 0) {
          newStatus = TaskStatusEnum.FAILED
        } else {
          LogUtil.warn(
            'TaskQueue',
            `刷新父任务状态时出现异常，processing: ${processing} waiting ${waiting} paused: ${paused} finished: ${finished} failed: ${failed}`
          )
        }

        if (parentRunningObj.status !== newStatus) {
          const parent = new Task()
          parent.id = parentRunningObj.taskId
          parent.status = newStatus
          this.taskService.updateById(parent)
        }
      }
    }
  }
}

/**
 * 任务操作对象
 */
export class TaskOperationObj {
  /**
   * 任务id
   */
  public taskId: number
  /**
   * 操作
   */
  public operation: TaskOperation
  /**
   * 是否进行中
   */
  public processing: boolean
  /**
   * 是否被取消
   */
  public canceled: boolean
  /**
   * 是否已完成
   */
  public done: boolean

  constructor(taskId: number, operation: TaskOperation) {
    this.taskId = taskId
    this.operation = operation
    this.processing = false
    this.canceled = false
    this.done = false
  }
}

class TaskStatus {
  /**
   * 任务id
   */
  taskId: number
  /**
   * 任务状态
   */
  status: TaskStatusEnum

  constructor(taskId: number, status: TaskStatusEnum) {
    this.taskId = taskId
    this.status = status
  }
}

/**
 * 任务运行对象
 */
export class TaskRunningObj extends TaskStatus {
  /**
   * 任务操作对象
   */
  public taskOperationObj: TaskOperationObj
  /**
   * 写入器
   */
  public taskWriter: TaskWriter
  /**
   * 父任务id
   */
  public parentId: number

  constructor(
    taskId: number,
    taskOperationObj: TaskOperationObj,
    status: TaskStatusEnum,
    taskWriter: TaskWriter,
    parentId?: number | null | undefined
  ) {
    super(taskId, status)
    this.taskOperationObj = taskOperationObj
    this.taskWriter = taskWriter
    this.parentId = isNullish(parentId) ? -1 : parentId
  }
}

/**
 * 父任务运行对象
 */
export class ParentRunningObj extends TaskStatus {
  /**
   * 子任务
   */
  public children: Map<number, TaskRunningObj | TaskStatus>

  constructor(taskId: number, status: TaskStatusEnum) {
    super(taskId, status)
    this.children = new Map<number, TaskRunningObj>()
  }
}

/**
 * 任务操作
 */
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
  /**
   * 任务服务
   * @private
   */
  private taskService: TaskService
  /**
   * 插件加载器
   * @private
   */
  private readonly pluginLoader: PluginLoader<TaskHandler>
  /**
   * 任务操作迭代器列表
   * @private
   */
  private readonly iterators: IterableIterator<TaskRunningObj>[]
  /**
   * 是否正在消耗迭代器
   * @private
   */
  private consuming: boolean
  /**
   * 最大并行下载量
   * @private
   */
  private maxParallel: number
  /**
   * 正在进行的下载数量
   * @private
   */
  private processing: number
  /**
   * 是否被限制
   * @private
   */
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
    if (taskRunningObj.taskOperationObj.canceled) {
      callback()
      return
    }

    // 开始任务，同时在队列中标记为进行中
    taskRunningObj.taskOperationObj.processing = true
    taskRunningObj.status = TaskStatusEnum.PROCESSING
    const saveResultPromise: Promise<TaskSaveResult> = chunk.resumeMode
      ? this.taskService.resumeTask(task, this.pluginLoader, taskWriter)
      : this.taskService.startTask(task, this.pluginLoader, taskWriter)

    this.processing++
    // 如果并行量达到限制，limited设为true
    this.limited = this.processing >= this.maxParallel

    saveResultPromise
      .then((saveResult: TaskSaveResult) => {
        this.push({ task: task, taskRunningObj: taskRunningObj, saveResult: saveResult })
        this.processing--
        // 如果处于限制状态，则在此次下载完成之后解开限制
        if (this.limited) {
          this.limited = false
          callback()
        }
      })
      .catch((err) => {
        this.emit('error', err, task, taskRunningObj)
        this.processing--
        // 如果处于限制状态，则在此次下载失败之后解开限制
        if (this.limited) {
          this.limited = false
          callback()
        }
      })

    // 如果处于限制状态，则不调用callback进行下一个处理
    if (!this.limited) {
      callback()
    }
  }

  /**
   * 添加任务操作迭代器
   * @param tasks
   */
  public addIterators(tasks: IterableIterator<TaskRunningObj>) {
    this.iterators.push(tasks)
    this.consumeIterators()
  }

  /**
   * 消耗任务操作迭代器
   * @private
   */
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
          const write = () => {
            const taskDTO = new TaskDTO(task)
            this.write({
              task: taskDTO,
              taskRunningObj: taskRunningObj,
              resumeMode: taskRunningObj.taskOperationObj.operation === TaskOperation.RESUME
            })
          }
          // 如果是开始，保存作品信息
          if (TaskOperation.START === taskRunningObj.taskOperationObj.operation) {
            this.taskService.saveWorksInfo(task, this.pluginLoader).then(() => {
              write()
            })
          } else {
            write()
          }
        })
      }
    }
  }
}
