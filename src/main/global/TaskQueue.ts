import { TaskStatusEnum } from '../constant/TaskStatusEnum.js'
import { assertNotNullish } from '../util/AssertUtil.js'
import LogUtil from '../util/LogUtil.js'
import TaskService from '../service/TaskService.js'
import { arrayNotEmpty, isNullish, notNullish } from '../util/CommonUtil.js'
import SettingsService from '../service/SettingsService.js'
import { Transform, TransformCallback, Writable } from 'node:stream'
import PluginLoader from '../plugin/PluginLoader.js'
import { TaskHandler, TaskHandlerFactory } from '../plugin/TaskHandler.js'
import TaskDTO from '../model/dto/TaskDTO.js'
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
   * 任务信息保存流
   * @private
   */
  private taskInfoStream: TaskInfoStream

  /**
   * 任务资源保存流
   * @private
   */
  private taskResourceStream: TaskResourceStream

  /**
   * 任务状态改变流
   * @private
   */
  private taskStatusChangeStream: TaskStatusChangeStream

  constructor() {
    this.operationQueue = []
    this.taskMap = new Map()
    this.parentMap = new Map()
    this.taskService = new TaskService()
    this.pluginLoader = new PluginLoader(new TaskHandlerFactory())
    this.taskInfoStream = new TaskInfoStream(this.pluginLoader)
    this.taskResourceStream = new TaskResourceStream(this.pluginLoader)
    this.taskStatusChangeStream = new TaskStatusChangeStream()
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
        this.taskInfoStream.addTask([taskRunningObj])
      }
    } else if (operation.operation === TaskOperation.PAUSE) {
      this.taskService.getById(operation.taskId).then((task) => {
        assertNotNullish(task, 'TaskQueue', `任务id${operation.taskId}不可用，无法暂停此任务`)
        this.pauseTask([task])
      })
    } else if (operation.operation === TaskOperation.STOP) {
      this.taskService.getById(operation.taskId).then((task) => {
        assertNotNullish(task, 'TaskQueue', `任务id${operation.taskId}不可用，无法停止此任务`)
        this.stopTask([task])
      })
    }
  }

  /**
   * 批量插入操作
   * @param tasks 需要操作的任务
   * @param taskOperation 要执行的操作
   */
  public async pushBatch(tasks: Task[], taskOperation: TaskOperation) {
    if (taskOperation === TaskOperation.START || taskOperation === TaskOperation.RESUME) {
      const taskRunningStatusList: TaskResourceSaveResult[] = [] // 用于更新数据库中任务的数据
      // 创建运行对象
      const taskRunningObjs = tasks
        .map((task) => {
          assertNotNullish(task.id)
          const operationObj = new TaskOperationObj(task.id, taskOperation)
          let taskRunningObj = this.taskMap.get(task.id)
          if (notNullish(taskRunningObj)) {
            if (taskRunningObj.taskOperationObj.done()) {
              // todo 可能需要判断一下TaskWriter是否为空
              taskRunningObj.taskOperationObj = operationObj
              taskRunningObj.status = TaskStatusEnum.WAITING
            } else {
              const operationStr = taskOperation === TaskOperation.START ? '开始' : '恢复'
              LogUtil.warn('TaskQueue', `无法${operationStr}任务${task}，队列中已经存在其他操作`)
              return
            }
          } else {
            taskRunningObj = new TaskRunningObj(
              operationObj.taskId,
              operationObj,
              TaskStatusEnum.WAITING,
              new TaskWriter(),
              task.pid
            )
            this.taskMap.set(operationObj.taskId, taskRunningObj)
          }
          this.operationQueue.push(operationObj)
          LogUtil.info('TaskQueue', `任务${task.id}进入队列`)
          taskRunningStatusList.push({
            taskRunningObj: taskRunningObj,
            status: TaskStatusEnum.WAITING
          })
          return taskRunningObj
        })
        .filter(notNullish)
      // 所有任务设置为等待中
      this.taskStatusChangeStream.addTask(taskRunningStatusList)
      // 刷新父任务状态
      this.setChildrenOfParent(taskRunningObjs)

      // 开始任务，从信息保存流开始；恢复任务，从资源保存流开始
      if (TaskOperation.START === taskOperation) {
        this.taskInfoStream.addTask(taskRunningObjs)
      } else {
        this.taskResourceStream.addTask(taskRunningObjs)
      }
    } else if (taskOperation === TaskOperation.PAUSE) {
      this.pauseTask(tasks)
      const parentIdWaitingRefresh: Set<number> = new Set(
        tasks.map((task) => task.pid).filter(notNullish)
      )
      this.refreshParentStatus(Array.from(parentIdWaitingRefresh))
    } else if (taskOperation === TaskOperation.STOP) {
      this.pauseTask(tasks)
      const parentIdWaitingRefresh: Set<number> = new Set(
        tasks.map((task) => task.pid).filter(notNullish)
      )
      this.refreshParentStatus(Array.from(parentIdWaitingRefresh))
    }
  }

  /**
   * 暂停任务
   * @param tasks 要停暂停的任务
   * @private
   */
  private pauseTask(tasks: Task[]) {
    const taskSaveResultList: TaskResourceSaveResult[] = []
    for (const task of tasks) {
      if (isNullish(task.id)) {
        LogUtil.error('TaskQueue', `暂停任务时，任务id意外为空`)
        continue
      }
      const taskId = task.id
      const taskRunningObj = this.taskMap.get(taskId)
      if (isNullish(taskRunningObj)) {
        LogUtil.error('TaskQueue', `无法暂停任务${taskId}，队列中没有这个任务`)
        continue
      }
      const operationObj = taskRunningObj.taskOperationObj
      const operation = operationObj.operation
      if (TaskOperation.START === operation || TaskOperation.RESUME === operation) {
        if (!operationObj.done()) {
          // canceled设为true，尚未开始的任务会暂停
          operationObj.status = OperationStatus.CANCEL
          this.removeFromQueue(operationObj)
          // 对于已开始的任务，调用taskService的pauseTask进行暂停
          if (operationObj.processing()) {
            this.taskService.pauseTask(task, this.pluginLoader, taskRunningObj.taskWriter)
          } else {
            operationObj.status = OperationStatus.CANCEL
          }
          taskRunningObj.status = TaskStatusEnum.PAUSE
          LogUtil.info('TaskService', `任务${taskRunningObj.taskId}暂停`)
          taskSaveResultList.push({
            task: task,
            taskRunningObj: taskRunningObj,
            status: TaskStatusEnum.PAUSE
          })
        }
      } else {
        const msg = `暂停任务时，任务的原操作出现了异常的值，operation: ${operation}`
        LogUtil.error('TaskQueue', msg)
      }
    }
    this.taskStatusChangeStream.addTask(taskSaveResultList)
  }

  /**
   * 停止任务
   * @param tasks 要停止的任务
   * @private
   */
  private stopTask(tasks: Task[]) {
    const taskSaveResultList: TaskResourceSaveResult[] = []
    for (const task of tasks) {
      assertNotNullish(task.id, 'TaskQueue', `暂停任务时，任务id意外为空`)
      const taskId = task.id
      const taskRunningObj = this.taskMap.get(taskId)
      assertNotNullish(taskRunningObj, 'TaskQueue', `无法暂停任务${taskId}，队列中没有这个任务`)
      const operationObj = taskRunningObj.taskOperationObj
      const operation = operationObj.operation
      if (TaskOperation.START === operation || TaskOperation.RESUME === operation) {
        if (!operationObj.done) {
          // canceled设为true，尚未开始的任务会暂停
          operationObj.status = OperationStatus.CANCEL
          this.removeFromQueue(operationObj)
          // 对于已开始的任务，调用taskService的pauseTask进行暂停
          if (operationObj.processing()) {
            this.taskService.pauseTask(task, this.pluginLoader, taskRunningObj.taskWriter)
          } else {
            operationObj.status = OperationStatus.CANCEL
          }
          taskRunningObj.status = TaskStatusEnum.PAUSE
          taskSaveResultList.push({
            task: task,
            taskRunningObj: taskRunningObj,
            status: TaskStatusEnum.PAUSE
          })
        }
      } else {
        const msg = `暂停任务时，任务的原操作出现了异常的值，operation: ${operation}`
        LogUtil.error('TaskQueue', msg)
      }
    }
    this.taskStatusChangeStream.addTask(taskSaveResultList)
  }

  /**
   * 获取任务进度
   * @param taskId 任务id
   */
  public getSchedule(taskId: number): TaskScheduleDTO | undefined {
    // 父任务的进度
    const parentRunningObj = this.parentMap.get(taskId)
    if (notNullish(parentRunningObj)) {
      const childrenNum = parentRunningObj.children.size
      let finished = 0
      parentRunningObj.children.forEach((child) => {
        if (child.status === TaskStatusEnum.FINISHED) {
          finished++
        }
      })

      const schedule = (finished / childrenNum) * 100

      return new TaskScheduleDTO({
        id: taskId,
        status: parentRunningObj.status,
        schedule: schedule,
        total: parentRunningObj.children.size,
        finished: finished
      })
    }

    // 子任务的进度
    const taskRunningObj = this.taskMap.get(taskId)
    if (isNullish(taskRunningObj)) {
      return undefined
    }
    if (TaskStatusEnum.FINISHED === taskRunningObj.status) {
      return new TaskScheduleDTO({
        id: taskId,
        status: TaskStatusEnum.FINISHED,
        schedule: 100,
        total: undefined,
        finished: undefined
      })
    }
    const writer = taskRunningObj.taskWriter
    if (
      TaskStatusEnum.PROCESSING === taskRunningObj.status ||
      TaskStatusEnum.PAUSE === taskRunningObj.status
    ) {
      if (writer.bytesSum === 0) {
        return new TaskScheduleDTO({
          id: taskId,
          status: taskRunningObj.status,
          schedule: 0,
          total: undefined,
          finished: undefined
        })
      } else if (notNullish(writer.writable)) {
        const schedule = (writer.writable.bytesWritten / writer.bytesSum) * 100
        return new TaskScheduleDTO({
          id: taskId,
          status: taskRunningObj.status,
          schedule: schedule,
          total: undefined,
          finished: undefined
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
    const handleError = (error: Error, task: TaskDTO, taskRunningObj: TaskRunningObj) => {
      LogUtil.error('TaskQueue', `处理任务时出错，taskId: ${task.id}，error: ${error.message}`)
      taskRunningObj.status = TaskStatusEnum.FAILED
      this.taskService.taskFailed(taskRunningObj.taskId).then(() => {
        this.removeFromQueue(taskRunningObj.taskOperationObj)
        this.removeFromMap(taskRunningObj.taskId)
      })
      this.refreshParentStatus([taskRunningObj.parentId])
    }
    // 信息保存流
    this.taskInfoStream.on('error', handleError)
    // 资源保存流
    this.taskResourceStream.on('saveStart', (taskRunningObj: TaskRunningObj) => {
      this.taskStatusChangeStream.addTask([
        {
          taskRunningObj: taskRunningObj,
          status: TaskStatusEnum.PROCESSING
        }
      ])
      const parentRunningObj = this.parentMap.get(taskRunningObj.parentId)
      if (notNullish(parentRunningObj) && parentRunningObj.status !== TaskStatusEnum.PROCESSING) {
        parentRunningObj.status = TaskStatusEnum.PROCESSING
      }
    })
    this.taskResourceStream.on('data', (data: TaskResourceSaveResult) => {
      const saveResult = data.status
      const taskRunningObj = data.taskRunningObj
      this.removeFromQueue(taskRunningObj.taskOperationObj)
      if (saveResult === TaskStatusEnum.FINISHED) {
        LogUtil.info('TaskService', `任务${data.taskRunningObj.taskId}完成`)
        this.removeFromMap(taskRunningObj.taskId)
      } else if (saveResult === TaskStatusEnum.FAILED) {
        LogUtil.info('TaskService', `任务${data.taskRunningObj.taskId}失败`)
      }
      this.refreshParentStatus([taskRunningObj.parentId])
    })
    this.taskResourceStream.on('error', handleError)
    this.taskResourceStream.on('finish', () => LogUtil.info('TaskQueue', '任务队列完成'))
    // 保存结果处理流
    this.taskStatusChangeStream.on('error', handleError)

    // 连接
    this.taskInfoStream.pipe(this.taskResourceStream)
    this.taskResourceStream.pipe(this.taskStatusChangeStream)
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
   * 从子任务池中移除任务运行实例
   * @param taskId 子任务id
   * @private
   */
  private removeFromParentMap(taskId: number) {
    this.parentMap.delete(taskId)
  }

  /**
   * 在父任务池中设置父任务的子任务
   * @param runningObjs 子任务运行实例列表
   * @private
   */
  private setChildrenOfParent(runningObjs: TaskRunningObj[]) {
    const parentWaitingRefreshSet: Set<number> = new Set()
    runningObjs.forEach((runningObj) => {
      if (notNullish(runningObj.parentId) && runningObj.parentId !== -1) {
        let parent = this.parentMap.get(runningObj.parentId)
        if (isNullish(parent)) {
          parent = new ParentRunningObj(runningObj.parentId, TaskStatusEnum.WAITING)
          this.parentMap.set(runningObj.parentId, parent)
        }
        parent.children.set(runningObj.taskId, runningObj)
        parentWaitingRefreshSet.add(runningObj.parentId)
      }
    })
    const parentWaitingRefresh = Array.from(parentWaitingRefreshSet)
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
          parentRunningObj.status = newStatus
          const parent = new Task()
          parent.id = parentRunningObj.taskId
          parent.status = newStatus
          this.taskService.updateById(parent)
        }

        // 清除不再活跃的父任务
        if (processing === 0 && paused === 0 && waiting === 0) {
          this.removeFromParentMap(id)
        }
      }
    }
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
 * 操作状态
 */
enum OperationStatus {
  WAITING = 1,
  PROCESSING = 2,
  CANCEL = 3,
  FINISHED = 4
}

/**
 * 任务操作对象
 */
class TaskOperationObj {
  /**
   * 任务id
   */
  public taskId: number
  /**
   * 操作
   */
  public operation: TaskOperation
  /**
   * 操作状态
   */
  public status: OperationStatus

  constructor(taskId: number, operation: TaskOperation) {
    this.taskId = taskId
    this.operation = operation
    this.status = OperationStatus.WAITING
  }

  public done(): boolean {
    return this.status === OperationStatus.CANCEL || this.status === OperationStatus.FINISHED
  }

  public waiting(): boolean {
    return this.status === OperationStatus.WAITING
  }

  public processing(): boolean {
    return this.status === OperationStatus.PROCESSING
  }

  public cancel(): boolean {
    return this.status === OperationStatus.CANCEL
  }

  public finished(): boolean {
    return this.status === OperationStatus.FINISHED
  }
}

/**
 * 任务状态
 */
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
class TaskRunningObj extends TaskStatus {
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
  /**
   * 作品信息是否已经保存
   */
  public worksInfoCompleted: boolean

  constructor(
    taskId: number,
    taskOperationObj: TaskOperationObj,
    status: TaskStatusEnum,
    taskWriter: TaskWriter,
    parentId?: number | null | undefined,
    worksInfoCompleted?: boolean
  ) {
    super(taskId, status)
    this.taskOperationObj = taskOperationObj
    this.taskWriter = taskWriter
    this.parentId = isNullish(parentId) ? -1 : parentId
    this.worksInfoCompleted = isNullish(worksInfoCompleted) ? false : worksInfoCompleted
  }
}

/**
 * 父任务运行对象
 */
class ParentRunningObj extends TaskStatus {
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
 * 任务信息保存流
 */
class TaskInfoStream extends Transform {
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
   * 任务运行对象列表
   * @private
   */
  private readonly runningObjs: TaskRunningObj[]
  /**
   * 是否正在循环写入
   * @private
   */
  private writeable: boolean
  /**
   * 缓冲区是否可写入
   * @private
   */
  private looping: boolean

  constructor(pluginLoader: PluginLoader<TaskHandler>) {
    super({ objectMode: true, highWaterMark: 64 }) // 设置为对象模式
    this.taskService = new TaskService()
    this.pluginLoader = pluginLoader
    this.runningObjs = []
    this.writeable = true
    this.looping = false
    this.on('drain', () => {
      this.writeable = true
      this.loopSaveInfo()
    })
  }

  async _transform(
    chunk: { taskRunningObj: TaskRunningObj; resumeMode: boolean },
    _encoding: string,
    callback: TransformCallback
  ): Promise<void> {
    try {
      const task = await this.taskService.getById(chunk.taskRunningObj.taskId)
      // 开始保存任务信息
      assertNotNullish(task, 'TaskQueue', `下载任务${chunk.taskRunningObj.taskId}失败，任务id无效`)
      const result = await this.taskService.saveWorksInfo(task, this.pluginLoader)
      if (result) {
        chunk.taskRunningObj.worksInfoCompleted = true
        this.push(chunk)
        callback()
      } else {
        this.handleError(chunk.taskRunningObj, callback, undefined, task)
      }
    } catch (error) {
      this.handleError(chunk.taskRunningObj, callback, error as Error)
    }
  }

  /**
   * 添加任务信息保存操作
   * @param tasks
   */
  public addTask(tasks: TaskRunningObj[]) {
    this.runningObjs.push(...tasks)
    this.loopSaveInfo()
  }

  /**
   * 开始保存任务信息
   * @private
   */
  private loopSaveInfo() {
    if (!this.looping) {
      this.looping = true
      while (this.writeable) {
        this.writeable = this.processNext()
      }
      this.looping = false
      this.writeable = true
    }
  }

  /**
   * 处理下一个
   * @private
   */
  private processNext(): boolean {
    const next = this.runningObjs.shift()
    if (notNullish(next)) {
      return this.write({
        taskRunningObj: next,
        resumeMode: next.taskOperationObj.operation === TaskOperation.RESUME
      })
    } else {
      return false
    }
  }

  /**
   * 处理_transform的错误
   * @param taskRunningObj
   * @param callback
   * @param error
   * @param task
   * @private
   */
  private handleError(
    taskRunningObj: TaskRunningObj,
    callback: () => void,
    error?: Error,
    task?: Task
  ) {
    const msg = `下载任务${taskRunningObj.taskId}失败`
    if (isNullish(error)) {
      error = new Error(msg)
    } else {
      error.message = msg + '，' + error.message
    }
    LogUtil.error('TaskQueue', error)
    this.emit('error', error, task, taskRunningObj)
    callback()
  }
}

/**
 * 任务资源保存流
 */
class TaskResourceStream extends Transform {
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
  /**
   * 任务运行对象列表
   * @private
   */
  private readonly runningObjs: TaskRunningObj[]
  /**
   * 等待作品信息保存完成的运行对象列表
   * @private
   */
  private readonly waitingInfoFinishList: TaskRunningObj[]
  /**
   * 是否正在循环写入
   * @private
   */
  private writeable: boolean
  /**
   * 缓冲区是否可写入
   * @private
   */
  private looping: boolean

  constructor(pluginLoader: PluginLoader<TaskHandler>) {
    super({ objectMode: true, highWaterMark: 64 }) // 设置为对象模式
    this.taskService = new TaskService()
    this.pluginLoader = pluginLoader
    // 读取设置中的最大并行数
    const settings = SettingsService.getSettings()
    this.maxParallel =
      settings.importSettings.maxParallelImport >= 1 ? settings.importSettings.maxParallelImport : 1
    this.processing = 0
    this.limited = false
    this.runningObjs = []
    this.waitingInfoFinishList = []
    this.looping = false
    this.writeable = true
    this.on('drain', () => {
      this.writeable = true
      this.loopSaveResource()
    })
  }

  _transform(
    chunk: { taskRunningObj: TaskRunningObj; resumeMode: boolean },
    _encoding: string,
    callback: TransformCallback
  ): void {
    const taskRunningObj = chunk.taskRunningObj
    if (taskRunningObj.worksInfoCompleted) {
      this.taskService.getById(taskRunningObj.taskId).then((task) => {
        assertNotNullish(task, 'TaskQueue', `处理任务${taskRunningObj.taskId}失败，任务id无效`)
        const taskWriter = taskRunningObj.taskWriter

        // todo 检查在之前是否有操作因为信息未保存被推到waitingInfoFinishList
        // 开始之前检查操作是否被取消
        if (taskRunningObj.taskOperationObj.cancel()) {
          callback()
          return
        }
        taskRunningObj.taskOperationObj.status = OperationStatus.PROCESSING
        taskRunningObj.status = TaskStatusEnum.PROCESSING
        // 发出任务开始保存的事件
        this.emit('saveStart', taskRunningObj)

        // 开始任务
        const saveResultPromise: Promise<TaskStatusEnum> = chunk.resumeMode
          ? this.taskService.resumeTask(task, this.pluginLoader, taskWriter)
          : this.taskService.startTask(task, this.pluginLoader, taskWriter)

        this.processing++
        // 如果并行量达到限制，limited设为true
        this.limited = this.processing >= this.maxParallel

        saveResultPromise
          .then((saveResult: TaskStatusEnum) => {
            taskRunningObj.taskOperationObj.status = OperationStatus.FINISHED
            taskRunningObj.status = saveResult
            if (TaskStatusEnum.PAUSE !== saveResult) {
              this.push({ task: task, taskRunningObj: taskRunningObj, status: saveResult })
            }
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
      })
    } else {
      this.waitingInfoFinishList.push(taskRunningObj)
      callback()
    }
  }

  /**
   * 添加资源保存操作
   * @param tasks
   */
  public addTask(tasks: TaskRunningObj[]) {
    this.runningObjs.push(...tasks)
    this.loopSaveResource()
  }

  /**
   * 开始保存任务信息
   * @private
   */
  private loopSaveResource() {
    if (!this.looping) {
      this.looping = true
      while (this.writeable) {
        this.writeable = this.processNext()
      }
      this.looping = false
      this.writeable = true
    }
  }

  /**
   * 处理下一个
   * @private
   */
  private processNext(): boolean {
    let next: TaskRunningObj | undefined = this.waitingInfoFinishList.shift()
    if (notNullish(next)) {
      return this.write({
        taskRunningObj: next,
        resumeMode: next.taskOperationObj.operation === TaskOperation.RESUME
      })
    } else {
      next = this.runningObjs.shift()
      if (notNullish(next)) {
        return this.write({
          taskRunningObj: next,
          resumeMode: next.taskOperationObj.operation === TaskOperation.RESUME
        })
      } else {
        return false
      }
    }
  }
}

/**
 * 任务资源保存结果对象
 */
interface TaskResourceSaveResult {
  task?: Task
  taskRunningObj: TaskRunningObj
  status: TaskStatusEnum
}

/**
 * 任务状态改变流
 */
class TaskStatusChangeStream extends Writable {
  /**
   * 任务服务
   * @private
   */
  private taskService: TaskService
  /**
   * 资源保存结果列表
   * @private
   */
  private saveResultList: TaskResourceSaveResult[]
  /**
   * 是否正在循环写入
   * @private
   */
  private looping: boolean
  /**
   * 缓冲区是否可写入
   * @private
   */
  private writeable: boolean
  /**
   * 批量更新的缓冲区
   * @private
   */
  private readonly batchUpdateBuffer: Task[]

  constructor() {
    super({ objectMode: true, highWaterMark: 10 })
    this.taskService = new TaskService()
    this.saveResultList = []
    this.looping = false
    this.writeable = true
    this.batchUpdateBuffer = []
    this.on('drain', () => {
      this.writeable = true
      this.loopSaveResult()
    })
  }

  async _write(
    chunk: TaskResourceSaveResult[] | TaskResourceSaveResult,
    _encoding: string,
    callback: TransformCallback
  ): Promise<void> {
    try {
      let tempTasks: Task[]
      if (chunk instanceof Array) {
        tempTasks = chunk.map((saveResult) => {
          const tempTask = new Task()
          tempTask.id = saveResult.taskRunningObj.taskId
          tempTask.status = saveResult.status
          return tempTask
        })
      } else {
        const tempTask = new Task()
        tempTask.id = chunk.taskRunningObj.taskId
        tempTask.status = chunk.status
        tempTasks = [tempTask]
      }
      this.batchUpdateBuffer.push(...tempTasks)
      if (this.batchUpdateBuffer.length >= 100 || !arrayNotEmpty(this.saveResultList)) {
        const temp = this.batchUpdateBuffer.splice(0, this.batchUpdateBuffer.length)
        this.taskService.updateBatchById(temp)
      }
    } catch (error) {
      LogUtil.error('TaskQueue', error)
    } finally {
      callback()
    }
  }

  /**
   * 添加处理结果
   * @param tasks
   */
  public addTask(tasks: TaskResourceSaveResult[]) {
    this.saveResultList.push(...tasks)
    this.loopSaveResult()
  }

  /**
   * 开始处理任务保存结果
   * @private
   */
  private loopSaveResult() {
    if (!this.looping) {
      this.looping = true
      while (this.writeable) {
        this.writeable = this.processNext()
      }
      this.looping = false
      this.writeable = true
    }
  }

  /**
   * 处理下一批
   * @private
   */
  private processNext(): boolean {
    const deleteCount = Math.min(100, this.saveResultList.length)
    const next = this.saveResultList.splice(0, deleteCount)
    if (arrayNotEmpty(next)) {
      return this.write(next)
    } else {
      return false
    }
  }
}
