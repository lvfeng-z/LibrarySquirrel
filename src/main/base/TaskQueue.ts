import { TaskStatusEnum } from '../constant/TaskStatusEnum.js'
import { AssertNotNullish } from '../util/AssertUtil.js'
import LogUtil from '../util/LogUtil.js'
import TaskService from '../service/TaskService.js'
import WorksService from '../service/WorksService.js'
import { ArrayIsEmpty, ArrayNotEmpty, IsNullish, NotNullish } from '../util/CommonUtil.js'
import { Readable, Transform, TransformCallback, Writable } from 'node:stream'
import PluginLoader from '../plugin/PluginLoader.js'
import { TaskHandler, TaskHandlerFactory } from '../plugin/TaskHandler.js'
import TaskWriter from '../util/TaskWriter.js'
import TaskScheduleDTO from '../model/dto/TaskScheduleDTO.js'
import Task from '../model/entity/Task.js'
import { GlobalVar, GlobalVars } from './GlobalVar.js'
import { RenderEvent, SendMsgToRender } from './EventToRender.js'
import TaskProgressMapTreeDTO from '../model/dto/TaskProgressMapTreeDTO.js'
import { CopyIgnoreUndefined } from '../util/ObjectUtil.js'

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
   * 任务服务
   * @private
   */
  private worksService: WorksService

  /**
   * 插件加载器
   * @private
   */
  private readonly pluginLoader: PluginLoader<TaskHandler>

  /**
   * 作为任务处理流程入口的流
   * @param pluginLoader
   */
  private inletStream: ReadableTaskRunningObject

  /**
   * 任务信息保存流
   * @private
   */
  private readonly taskInfoStream: TaskInfoStream

  /**
   * 任务资源保存流
   * @private
   */
  private readonly taskResourceStream: TaskResourceStream

  /**
   * 任务状态改变流
   * @private
   */
  private readonly taskStatusChangeStream: TaskStatusChangeStream

  constructor() {
    this.operationQueue = []
    this.taskMap = new Map()
    this.parentMap = new Map()
    this.taskService = new TaskService()
    this.worksService = new WorksService()
    this.pluginLoader = new PluginLoader(new TaskHandlerFactory())

    this.inletStream = new ReadableTaskRunningObject()
    this.taskInfoStream = new TaskInfoStream(this.pluginLoader)
    this.taskResourceStream = new TaskResourceStream(this.pluginLoader)
    this.taskStatusChangeStream = new TaskStatusChangeStream()
    this.initializeStream()
  }

  /**
   * 初始化任务处理流
   * @private
   */
  private initializeStream() {
    const handleError = (error: Error, task: Task, taskRunningObj: TaskRunningObj) => {
      LogUtil.error('TaskQueue', `处理任务失败，taskId: ${task.id}，error: ${error.message}`)
      taskRunningObj.changeStatus(TaskStatusEnum.FAILED, false)
      this.taskService.taskFailed(taskRunningObj.taskId, error.message).then(() => {
        this.removeFromQueue(taskRunningObj.taskOperationObj)
        this.removeTask(taskRunningObj.taskId)
      })
      this.refreshParentStatus([taskRunningObj.parentId])
    }
    // 信息保存流
    this.taskInfoStream.on('error', (error: Error, task: Task, taskRunningObj: TaskRunningObj) => {
      this.inletStream.unpipe(this.taskInfoStream)
      this.inletStream.pipe(this.taskInfoStream)
      handleError(error, task, taskRunningObj)
    })
    // 资源保存流
    this.taskResourceStream.on('error', (error: Error, task: Task, taskRunningObj: TaskRunningObj) => {
      this.taskInfoStream.unpipe(this.taskResourceStream)
      this.taskInfoStream.pipe(this.taskResourceStream)
      handleError(error, task, taskRunningObj)
    })
    this.taskResourceStream.on('data', (data: TaskResourceSaveResult) => {
      const saveResult = data.status
      const taskRunningObj = data.taskRunningObj
      this.removeFromQueue(taskRunningObj.taskOperationObj)
      if (saveResult === TaskStatusEnum.FINISHED) {
        LogUtil.info('TaskQueue', `任务${data.taskRunningObj.taskId}完成`)
        this.removeTask(taskRunningObj.taskId)
      } else if (saveResult === TaskStatusEnum.FAILED) {
        LogUtil.info('TaskQueue', `任务${data.taskRunningObj.taskId}失败`)
      }
      this.refreshParentStatus([taskRunningObj.parentId])
    })
    this.taskResourceStream.on('saveStart', (taskRunningObj: TaskRunningObj) => {
      this.taskStatusChangeStream.addTask([
        {
          taskRunningObj: taskRunningObj,
          status: TaskStatusEnum.PROCESSING
        }
      ])
      const parentRunningObj = this.parentMap.get(taskRunningObj.parentId)
      if (NotNullish(parentRunningObj) && parentRunningObj.status !== TaskStatusEnum.PROCESSING) {
        parentRunningObj.changeStatus(TaskStatusEnum.PROCESSING, true)
      }
    })
    this.taskResourceStream.on('saveFailed', handleError)
    this.taskResourceStream.on('finish', () => LogUtil.info('TaskQueue', '任务队列完成'))
    // 保存结果处理流
    this.taskStatusChangeStream.on('error', (error: Error, task: Task, taskRunningObj: TaskRunningObj) => {
      this.taskResourceStream.unpipe(this.taskStatusChangeStream)
      this.taskResourceStream.pipe(this.taskStatusChangeStream)
      handleError(error, task, taskRunningObj)
    })

    // 建立管道
    this.inletStream.pipe(this.taskInfoStream)
    this.taskInfoStream.pipe(this.taskResourceStream)
    this.taskResourceStream.pipe(this.taskStatusChangeStream)
  }

  /**
   * 批量插入操作
   * @param tasks 需要操作的任务
   * @param taskOperation 要执行的操作
   */
  public async pushBatch(tasks: Task[], taskOperation: TaskOperation) {
    if (taskOperation === TaskOperation.START || taskOperation === TaskOperation.RESUME) {
      const taskRunningStatusList: TaskResourceSaveResult[] = [] // 用于更新数据库中任务的数据
      const runningObjs: TaskRunningObj[] = [] // 需要处理的运行对象
      for (const task of tasks) {
        AssertNotNullish(task.id)
        let taskRunningObj = this.taskMap.get(task.id)
        if (NotNullish(taskRunningObj)) {
          // 任务已有操作的情况下，根据原操作的状态判断怎么处理新操作
          const operationObj = taskRunningObj.taskOperationObj
          if (operationObj.waiting() || operationObj.processing()) {
            // 如果是等待或运行状态，则无视这次操作
            const operationStr = taskOperation === TaskOperation.START ? '开始' : '恢复'
            const reason = operationObj.waiting() ? '任务正在等待中' : '任务正在进行中'
            LogUtil.warn('TaskQueue', `无法${operationStr}任务${task.id}，${reason}`)
          } else if (operationObj.paused()) {
            // 如果是暂停状态，则把这次操作和任务的状态改成等待，然后判断原操作的任务信息是否已保存
            operationObj.status = OperationStatus.WAITING
            taskRunningObj.changeStatus(TaskStatusEnum.WAITING, false)
            // 如果资源曾经开始保存过，则强制把操作改成恢复，否则改成开始
            if (taskRunningObj.resourceHadStarted) {
              taskRunningObj.taskOperationObj.operation = TaskOperation.RESUME
            } else {
              taskRunningObj.taskOperationObj.operation = TaskOperation.START
            }
            if (taskRunningObj.infoSaved) {
              // 如果原操作的任务信息已经保存，则此操作推入资源保存流中，如果没有保存，则忽略此操作（此时任务开始的操作正在任务信息保存流中，如果把新的操作推入资源保存流中，就会出现恢复操作先于开始操作的情况）
              if (TaskOperation.START === taskOperation) {
                LogUtil.warn('TaskQueue', `任务${taskRunningObj.taskId}已经开始，无法再次开始，此次开始操作已经转换为恢复`)
              }
              runningObjs.push(taskRunningObj)
            }
            // 操作插入到队列中
            this.insertQueue(operationObj)
            taskRunningStatusList.push({
              taskRunningObj: taskRunningObj,
              status: TaskStatusEnum.WAITING
            })
          } else {
            // 如果是结束状态，操作加入到操作队列中
            operationObj.status = OperationStatus.WAITING
            taskRunningObj.changeStatus(TaskStatusEnum.WAITING, false)
            this.insertQueue(operationObj)
            taskRunningStatusList.push({
              taskRunningObj: taskRunningObj,
              status: TaskStatusEnum.WAITING
            })
            runningObjs.push(taskRunningObj)
          }
        } else {
          const newOperationObj = new TaskOperationObj(task.id, taskOperation)
          // TODO 判断是否已经保存过这个作品，如果已经保存过则提示用户
          // 判断这个作品是否已经保存过
          if (NotNullish(task.siteId) && NotNullish(task.siteWorksId)) {
            const existsWorksList = await this.worksService.listBySiteIdAndSiteWorksId(task.siteId, task.siteWorksId)
            LogUtil.info('TaskQueue', existsWorksList)
          }
          const infoSaved = NotNullish(task.localWorksId)
          taskRunningObj = new TaskRunningObj(
            newOperationObj.taskId,
            newOperationObj,
            TaskStatusEnum.WAITING,
            new TaskWriter(),
            task.pid,
            infoSaved
          )
          this.inletTask(taskRunningObj, task)
          this.insertQueue(newOperationObj)
          taskRunningStatusList.push({
            taskRunningObj: taskRunningObj,
            status: TaskStatusEnum.WAITING
          })
          runningObjs.push(taskRunningObj)
        }
      }
      // 所有任务设置为等待中
      this.taskStatusChangeStream.addTask(taskRunningStatusList)
      // 刷新父任务状态
      this.setChildrenOfParent(runningObjs)

      this.inletStream.addArray(runningObjs)
    } else if (taskOperation === TaskOperation.PAUSE) {
      this.pauseTask(tasks)
      const parentIdWaitingRefresh: Set<number> = new Set(tasks.map((task) => task.pid).filter(NotNullish))
      this.refreshParentStatus(Array.from(parentIdWaitingRefresh))
    } else if (taskOperation === TaskOperation.STOP) {
      this.stopTask(tasks)
      const parentIdWaitingRefresh: Set<number> = new Set(tasks.map((task) => task.pid).filter(NotNullish))
      this.refreshParentStatus(Array.from(parentIdWaitingRefresh))
    }
    this.pushTaskSchedule()
  }

  /**
   * 获取任务进度
   * @param taskId 任务id
   */
  public getSchedule(taskId: number): TaskScheduleDTO | undefined {
    // 父任务的进度
    const parentRunningObj = this.parentMap.get(taskId)
    if (NotNullish(parentRunningObj)) {
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
        pid: undefined,
        status: parentRunningObj.status,
        schedule: schedule,
        total: parentRunningObj.children.size,
        finished: finished
      })
    }

    // 子任务的进度
    const taskRunningObj = this.taskMap.get(taskId)
    if (IsNullish(taskRunningObj)) {
      return undefined
    }
    if (TaskStatusEnum.FINISHED === taskRunningObj.status) {
      return new TaskScheduleDTO({
        id: taskId,
        pid: taskRunningObj.parentId,
        status: TaskStatusEnum.FINISHED,
        schedule: 100,
        total: undefined,
        finished: undefined
      })
    }
    const writer = taskRunningObj.taskWriter
    if (TaskStatusEnum.PROCESSING === taskRunningObj.status || TaskStatusEnum.PAUSE === taskRunningObj.status) {
      if (writer.bytesSum === 0) {
        return new TaskScheduleDTO({
          id: taskId,
          pid: taskRunningObj.parentId,
          status: taskRunningObj.status,
          schedule: 0,
          total: undefined,
          finished: undefined
        })
      } else if (NotNullish(writer.writable)) {
        const schedule = (writer.writable.bytesWritten / writer.bytesSum) * 100
        return new TaskScheduleDTO({
          id: taskId,
          pid: taskRunningObj.parentId,
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
   * 循环推送子任务的进度
   */
  public async pushTaskSchedule(): Promise<void> {
    while (NotNullish(this.taskMap) && this.taskMap.size > 0) {
      const taskScheduleList = this.taskMap
        .values()
        .toArray()
        .map((taskRunningObj) => {
          const taskId = taskRunningObj.taskId
          const writer = taskRunningObj.taskWriter
          if (TaskStatusEnum.PROCESSING === taskRunningObj.status) {
            if (writer.bytesSum === 0) {
              return new TaskScheduleDTO({
                id: taskId,
                pid: taskRunningObj.parentId,
                status: taskRunningObj.status,
                schedule: 0,
                total: undefined,
                finished: undefined
              })
            } else if (NotNullish(writer.writable)) {
              const schedule = (writer.writable.bytesWritten / writer.bytesSum) * 100
              return new TaskScheduleDTO({
                id: taskId,
                pid: taskRunningObj.parentId,
                status: taskRunningObj.status,
                schedule: schedule,
                total: undefined,
                finished: undefined
              })
            }
          }
          return undefined
        })
        .filter(NotNullish)
      SendMsgToRender(RenderEvent.TASK_STATUS_UPDATE_SCHEDULE, taskScheduleList)
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  /**
   * 循环推送父任务的进度
   */
  public async pushParentTaskSchedule(): Promise<void> {
    while (NotNullish(this.parentMap) && this.parentMap.size > 0) {
      const taskScheduleList = this.parentMap
        .values()
        .toArray()
        .map((parentRunningObj) => {
          const taskId = parentRunningObj.taskId
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
            pid: undefined,
            status: parentRunningObj.status,
            schedule: schedule,
            total: parentRunningObj.children.size,
            finished: finished
          })
        })
      SendMsgToRender(RenderEvent.PARENT_TASK_STATUS_UPDATE_SCHEDULE, taskScheduleList)
      await new Promise((resolve) => setTimeout(resolve, 500))
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
      if (IsNullish(task.id)) {
        LogUtil.error('TaskQueue', `暂停任务失败，任务id意外为空`)
        continue
      }
      const taskId = task.id
      const taskRunningObj = this.taskMap.get(taskId)
      if (IsNullish(taskRunningObj)) {
        LogUtil.error('TaskQueue', `无法暂停任务${taskId}，队列中没有这个任务`)
        continue
      }
      const operationObj = taskRunningObj.taskOperationObj
      const operation = operationObj.operation
      if (TaskOperation.START === operation || TaskOperation.RESUME === operation) {
        if (!operationObj.over()) {
          this.removeFromQueue(operationObj)
          // 对于已开始的任务，调用taskService的pauseTask进行暂停
          if (operationObj.processing()) {
            this.taskService.pauseTask(task, this.pluginLoader, taskRunningObj.taskWriter)
          }
          // 操作状态设为暂停
          operationObj.status = OperationStatus.PAUSED
          taskRunningObj.changeStatus(TaskStatusEnum.PAUSE, false)
          LogUtil.info('TaskQueue', `任务${taskRunningObj.taskId}暂停`)
          taskSaveResultList.push({
            task: task,
            taskRunningObj: taskRunningObj,
            status: TaskStatusEnum.PAUSE
          })
        }
      } else {
        const msg = `暂停任务失败，任务的原操作出现了异常的值，operation: ${operation}`
        LogUtil.error('TaskQueue', msg)
      }
    }
    this.taskStatusChangeStream.addTask(taskSaveResultList)
  }

  /**
   * 停止任务
   * @param tasks 要停停止的任务
   * @private
   */
  private stopTask(tasks: Task[]) {
    const taskSaveResultList: TaskResourceSaveResult[] = []
    for (const task of tasks) {
      if (IsNullish(task.id)) {
        LogUtil.error('TaskQueue', `停止任务失败，任务id意外为空`)
        continue
      }
      const taskId = task.id
      const taskRunningObj = this.taskMap.get(taskId)
      if (IsNullish(taskRunningObj)) {
        LogUtil.error('TaskQueue', `无法停止任务${taskId}，队列中没有这个任务`)
        continue
      }
      const operationObj = taskRunningObj.taskOperationObj
      const operation = operationObj.operation
      if (TaskOperation.START === operation || TaskOperation.RESUME === operation) {
        if (!operationObj.over()) {
          // 操作状态设为暂停，资源处理流遇到未开始的任务就会停止
          operationObj.status = OperationStatus.PAUSED
          this.removeFromQueue(operationObj)
          // 对于已开始的任务，调用taskService的pauseTask进行停止
          if (operationObj.processing()) {
            this.taskService.pauseTask(task, this.pluginLoader, taskRunningObj.taskWriter)
          } else {
            operationObj.status = OperationStatus.PAUSED
          }
          taskRunningObj.changeStatus(TaskStatusEnum.PAUSE, false)
          LogUtil.info('TaskQueue', `任务${taskRunningObj.taskId}停止`)
          taskSaveResultList.push({
            task: task,
            taskRunningObj: taskRunningObj,
            status: TaskStatusEnum.PAUSE
          })
        }
      } else {
        const msg = `停止任务失败，任务的原操作出现了异常的值，operation: ${operation}`
        LogUtil.error('TaskQueue', msg)
      }
    }
    this.taskStatusChangeStream.addTask(taskSaveResultList)
  }

  /**
   * 操作插入到操作队列中
   * @param operationObj 操作实例
   * @private
   */
  private insertQueue(operationObj: TaskOperationObj) {
    this.operationQueue.push(operationObj)
    LogUtil.info('TaskQueue', `任务${operationObj.taskId}进入队列`)
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
   * 设置父任务的子任务
   * @param runningObjs 子任务运行实例列表
   * @private
   */
  private async setChildrenOfParent(runningObjs: TaskRunningObj[]) {
    const parentWaitingRefreshSet: Set<number> = new Set()
    for (const runningObj of runningObjs) {
      if (NotNullish(runningObj.parentId) && runningObj.parentId !== 0) {
        let parent = this.parentMap.get(runningObj.parentId)
        if (IsNullish(parent)) {
          const parentInfo = await this.taskService.getById(runningObj.parentId)
          AssertNotNullish(parentInfo?.status, 'TaskQueue', `刷新父任务${runningObj.parentId}失败，任务状态意外为空`)
          parent = new ParentRunningObj(runningObj.parentId, parentInfo?.status)
          this.inletParentTask(parent, parentInfo)
        }
        parent.children.set(runningObj.taskId, runningObj)
        parentWaitingRefreshSet.add(runningObj.parentId)
      }
    }
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
      if (NotNullish(parentRunningObj)) {
        const allChildren = await this.taskService.listChildrenTask(id)
        allChildren.forEach((children) => {
          if (!parentRunningObj.children.has(children.id as number)) {
            const taskStatus = new TaskStatus(children.id as number, children.status as TaskStatusEnum, false)
            parentRunningObj.children.set(children.id as number, taskStatus)
          }
        })

        const children = Array.from(parentRunningObj.children.values())
        const processing = children.filter((child) => TaskStatusEnum.PROCESSING === child.status).length
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
            `刷新父任务状态失败，processing: ${processing} waiting: ${waiting} paused: ${paused} finished: ${finished} failed: ${failed}`
          )
        }

        if (parentRunningObj.status !== newStatus) {
          parentRunningObj.changeStatus(newStatus, true)
          const parent = new Task()
          parent.id = parentRunningObj.taskId
          parent.status = newStatus
          this.taskService.updateById(parent)
        }

        // 清除不再活跃的父任务
        if (processing === 0 && paused === 0 && waiting === 0) {
          this.removeParentTask(id)
        }
      }
    }
    this.pushParentTaskSchedule()
  }

  /**
   * 任务插入到任务池中
   * @param taskRunningObj 任务运行对象
   * @param task 任务信息
   * @private
   */
  private inletTask(taskRunningObj: TaskRunningObj, task: Task) {
    this.taskMap.set(taskRunningObj.taskId, taskRunningObj)
    // 任务状态推送到渲染进程
    const taskProgressMapTreeDTO = new TaskProgressMapTreeDTO()
    CopyIgnoreUndefined(taskProgressMapTreeDTO, task)
    SendMsgToRender(RenderEvent.TASK_STATUS_SET_TASK, [taskProgressMapTreeDTO])
  }

  /**
   * 任务插入到父任务池中
   * @param parentRunningObj 父任务运行对象
   * @param task 任务信息
   * @private
   */
  private inletParentTask(parentRunningObj: ParentRunningObj, task: Task) {
    this.parentMap.set(parentRunningObj.taskId, parentRunningObj)
    // 任务状态推送到渲染进程
    const taskProgressMapTreeDTO = new TaskProgressMapTreeDTO()
    CopyIgnoreUndefined(taskProgressMapTreeDTO, task)
    SendMsgToRender(RenderEvent.PARENT_TASK_STATUS_SET_PARENT_TASK, [taskProgressMapTreeDTO])
  }

  /**
   * 从子任务池中移除任务运行实例
   * @param taskId 子任务id
   * @private
   */
  private removeTask(taskId: number) {
    this.taskMap.delete(taskId)
    // 任务状态推送到渲染进程
    SendMsgToRender(RenderEvent.TASK_STATUS_REMOVE_TASK, [taskId])
  }

  /**
   * 从父任务池中移除任务运行实例
   * @param taskId 子任务id
   * @private
   */
  private removeParentTask(taskId: number) {
    this.parentMap.delete(taskId)
    // 任务状态推送到渲染进程
    SendMsgToRender(RenderEvent.PARENT_TASK_STATUS_REMOVE_PARENT_TASK, [taskId])
  }
  // private getStream(): ReadableTaskRunningObject {
  //   if (isNullish(this.readableRunningObj)) {
  //     this.readableRunningObj = new ReadableTaskRunningObject()
  //     this.readableRunningObj.pipe(this.taskInfoStream)
  //   }
  //   return this.readableRunningObj
  // }
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
  PAUSED = 3,
  OVER = 4
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
   * 操作状态
   */
  public status: OperationStatus

  constructor(taskId: number, operation: TaskOperation) {
    this.taskId = taskId
    this.operation = operation
    this.status = OperationStatus.WAITING
  }

  public waiting(): boolean {
    return this.status === OperationStatus.WAITING
  }

  public processing(): boolean {
    return this.status === OperationStatus.PROCESSING
  }

  public paused(): boolean {
    return this.status === OperationStatus.PAUSED
  }

  public over(): boolean {
    return this.status === OperationStatus.OVER
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

  constructor(taskId: number, status: TaskStatusEnum, isParent: boolean) {
    this.taskId = taskId
    this.status = status
    this.changeStatus(status, isParent)
  }

  /**
   * 更新任务状态
   * @param status 任务状态
   * @param isParent 是否为父任务
   * @private
   */
  public changeStatus(status: TaskStatusEnum, isParent: boolean) {
    this.status = status
    // 任务状态推送到渲染进程
    const task = new Task()
    task.id = this.taskId
    task.status = status
    if (isParent) {
      SendMsgToRender(RenderEvent.PARENT_TASK_STATUS_UPDATE_PARENT_TASK, [task])
    } else {
      SendMsgToRender(RenderEvent.TASK_STATUS_UPDATE_TASK, [task])
    }
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
   * 父任务id（为0时表示没有父任务）
   */
  public parentId: number
  /**
   * 作品信息是否已经保存
   */
  public infoSaved: boolean
  /**
   * 作品资源是否开始保存过
   */
  public resourceHadStarted: boolean

  constructor(
    taskId: number,
    taskOperationObj: TaskOperationObj,
    status: TaskStatusEnum,
    taskWriter: TaskWriter,
    parentId?: number | null | undefined,
    worksInfoSaved?: boolean,
    resourceHadStarted?: boolean
  ) {
    super(taskId, status, false)
    this.taskOperationObj = taskOperationObj
    this.taskWriter = taskWriter
    this.parentId = IsNullish(parentId) ? 0 : parentId
    this.infoSaved = IsNullish(worksInfoSaved) ? false : worksInfoSaved
    this.resourceHadStarted = IsNullish(resourceHadStarted) ? false : resourceHadStarted
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
    super(taskId, status, true)
    this.children = new Map<number, TaskRunningObj>()
  }
}

/**
 * 任务信息保存流
 */
export class TaskInfoStream extends Transform {
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

  constructor(pluginLoader: PluginLoader<TaskHandler>) {
    super({ objectMode: true, highWaterMark: 64 }) // 设置为对象模式
    this.taskService = new TaskService()
    this.pluginLoader = pluginLoader
  }

  async _transform(chunk: TaskRunningObj, _encoding: string, callback: TransformCallback): Promise<void> {
    if (chunk.infoSaved) {
      this.push(chunk)
      callback()
      return
    }

    let task: Task | undefined = new Task()
    task.id = chunk.taskId
    try {
      task = await this.taskService.getById(chunk.taskId)
      // 开始保存任务信息
      AssertNotNullish(task, 'TaskQueue', `下载任务${chunk.taskId}失败，任务id无效`)
      const result = await this.taskService.saveWorksInfo(task, this.pluginLoader)
      if (result) {
        chunk.infoSaved = true
        this.push(chunk)
        callback()
      } else {
        this.handleError(chunk, callback, undefined, task)
      }
    } catch (error) {
      this.handleError(chunk, callback, error as Error, task)
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
  private handleError(taskRunningObj: TaskRunningObj, callback: () => void, error?: Error, task?: Task) {
    const msg = `下载任务${taskRunningObj.taskId}失败`
    if (IsNullish(error)) {
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

  constructor(pluginLoader: PluginLoader<TaskHandler>) {
    super({ objectMode: true, highWaterMark: 64, autoDestroy: false }) // 设置为对象模式
    this.taskService = new TaskService()
    this.pluginLoader = pluginLoader
    // 读取设置中的最大并行数
    const maxParallelImportInSettings = GlobalVar.get(GlobalVars.SETTINGS).store.importSettings.maxParallelImport
    this.maxParallel = maxParallelImportInSettings >= 1 ? maxParallelImportInSettings : 1
    this.processing = 0
    this.limited = false
  }

  _transform(chunk: TaskRunningObj, _encoding: string, callback: TransformCallback): void {
    this.taskService
      .getById(chunk.taskId)
      .then((task) => {
        // 开始之前检查操作是否被取消
        if (chunk.taskOperationObj.paused()) {
          callback()
          return
        }
        chunk.taskOperationObj.status = OperationStatus.PROCESSING
        chunk.changeStatus(TaskStatusEnum.PROCESSING, false)
        // 发出任务开始保存的事件
        this.emit('saveStart', chunk)

        // 开始任务
        AssertNotNullish(task, 'TaskQueue', `保存任务${chunk.taskId}的资源失败，任务id无效`)
        chunk.resourceHadStarted = true
        const taskWriter = chunk.taskWriter
        const saveResultPromise: Promise<TaskStatusEnum> =
          chunk.taskOperationObj.operation === TaskOperation.RESUME
            ? this.taskService.resumeTask(task, this.pluginLoader, taskWriter)
            : this.taskService.startTask(task, this.pluginLoader, taskWriter)

        this.processing++
        // 如果并行量达到限制，limited设为true
        this.limited = this.processing >= this.maxParallel

        saveResultPromise
          .then((saveResult: TaskStatusEnum) => {
            chunk.changeStatus(saveResult, false)
            if (TaskStatusEnum.PAUSE !== saveResult) {
              chunk.taskOperationObj.status = OperationStatus.OVER
              this.push({
                task: task,
                taskRunningObj: chunk,
                status: saveResult
              })
            }
            if (TaskStatusEnum.FINISHED === saveResult) {
              chunk.infoSaved = false
              chunk.resourceHadStarted = false
            }
            this.processing--
            // 如果处于限制状态，则在此次下载完成之后解开限制
            if (this.limited) {
              this.limited = false
              callback()
            }
          })
          .catch((err) => {
            this.emit('saveFailed', err, task, chunk)
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
      .catch((err) => {
        const tempTask = new Task()
        tempTask.id = chunk.taskId
        this.emit('saveFailed', err, tempTask, chunk)
        callback()
      })
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
        tempTasks = chunk.map(this.generateTaskFromSaveResult)
      } else {
        tempTasks = [this.generateTaskFromSaveResult(chunk)]
      }
      this.batchUpdateBuffer.push(...tempTasks)
      if (this.batchUpdateBuffer.length >= 100 || ArrayIsEmpty(this.saveResultList)) {
        const temp = this.batchUpdateBuffer.splice(0, this.batchUpdateBuffer.length)
        this.taskService.updateBatchById(temp).catch((error) => LogUtil.error('TaskQueue', error))
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
    if (ArrayNotEmpty(next)) {
      return this.write(next)
    } else {
      return false
    }
  }

  /**
   * 根据保存结果生成更新用的任务信息
   * @param saveResult 保存结果
   * @private
   */
  private generateTaskFromSaveResult(saveResult: TaskResourceSaveResult) {
    const tempTask = new Task()
    tempTask.id = saveResult.taskRunningObj.taskId
    tempTask.status = saveResult.status
    if (TaskStatusEnum.FINISHED === tempTask.status) {
      tempTask.localWorksId = null
      tempTask.pendingDownloadPath = null
    }
    return tempTask
  }
}

/**
 * 任务运行对象流
 */
class ReadableTaskRunningObject extends Readable {
  /**
   * 所有待处理的数组
   * @private
   */
  private readonly allObjsLists: TaskRunningObj[][]

  /**
   * 当前数组中的索引
   * @private
   */
  private currentIndex: number

  constructor() {
    super({ objectMode: true })
    this.allObjsLists = []
    this.currentIndex = 0
  }

  // 添加一个新的数组到流中
  public addArray(array: TaskRunningObj[]) {
    this.allObjsLists.push(array)
    this.processNext()
  }

  _read() {
    this.processNext()
  }

  private processNext() {
    // 如果没有更多的数组或当前数组已经处理完毕，尝试切换到下一个数组
    while (ArrayNotEmpty(this.allObjsLists)) {
      if (this.currentIndex >= this.allObjsLists[0].length) {
        this.allObjsLists.shift()
        this.currentIndex = 0
      } else {
        break
      }
    }

    // 如果所有数组都已经处理完毕，推送 null 表示结束
    if (ArrayIsEmpty(this.allObjsLists)) {
      return
    }

    // 从当前数组中读取一个元素并推送
    const chunk = this.allObjsLists[0][this.currentIndex++]
    this.push(chunk)
  }
}
