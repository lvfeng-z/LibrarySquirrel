import { TaskStatusEnum } from '../constant/TaskStatusEnum.js'
import { AssertNotNullish } from '../util/AssertUtil.js'
import LogUtil from '../util/LogUtil.js'
import TaskService from '../service/TaskService.js'
import WorksService from '../service/WorksService.js'
import { ArrayIsEmpty, ArrayNotEmpty, IsNullish, NotNullish } from '../util/CommonUtil.js'
import { Readable, Transform, TransformCallback } from 'node:stream'
import PluginLoader from '../plugin/PluginLoader.js'
import { TaskHandler, TaskHandlerFactory } from '../plugin/TaskHandler.js'
import TaskWriter from '../util/TaskWriter.js'
import TaskScheduleDTO from '../model/dto/TaskScheduleDTO.js'
import Task from '../model/entity/Task.js'
import { GlobalVar, GlobalVars } from './GlobalVar.js'
import { RenderEvent, SendMsgToRender } from './EventToRender.js'
import TaskProgressMapTreeDTO from '../model/dto/TaskProgressMapTreeDTO.js'
import { CopyIgnoreUndefined } from '../util/ObjectUtil.js'
import TaskTreeDTO from '../model/dto/TaskTreeDTO.js'

/**
 * 任务队列
 */
export class TaskQueue {
  /**
   * 任务池
   * @description 子任务当前的操作、操作是否完成、操作是否取消、任务的状态、任务的资源和写入流等数据封装在运行实例中，以任务id为键保存在这个map里
   * @private
   */
  private readonly taskMap: Map<number, TaskRunInstance>

  /**
   * 父任务池
   * @description 父任务的运行实例以id为键保存在这个map里，父任务的运行实例的children属性保存了其子任务的运行实例
   * @private
   */
  private readonly parentMap: Map<number, ParentRunInstance>

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
  private inletStream: ReadableTaskRunInstance

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
    this.taskMap = new Map()
    this.parentMap = new Map()
    this.taskService = new TaskService()
    this.worksService = new WorksService()
    this.pluginLoader = new PluginLoader(new TaskHandlerFactory())

    this.inletStream = new ReadableTaskRunInstance()
    this.taskInfoStream = new TaskInfoStream()
    this.taskResourceStream = new TaskResourceStream()
    this.taskStatusChangeStream = new TaskStatusChangeStream()
    this.initializeStream()
  }

  /**
   * 初始化任务处理流
   * @private
   */
  private initializeStream() {
    const handleError = (error: Error, taskRunInstance: TaskRunInstance) => {
      LogUtil.error('TaskQueue', `处理任务失败，taskId: ${taskRunInstance.taskId}，error: ${error.message}`)
      taskRunInstance.failed()
      this.taskStatusChangeStream.addTask([
        {
          taskRunInstance: taskRunInstance,
          status: TaskStatusEnum.FAILED
        }
      ])
      this.refreshParentStatus([taskRunInstance.parentId])
    }
    // 信息保存流
    this.taskInfoStream.on('error', (error: Error, taskRunInstance: TaskRunInstance) => {
      this.inletStream.unpipe(this.taskInfoStream)
      this.inletStream.pipe(this.taskInfoStream)
      handleError(error, taskRunInstance)
    })
    // 资源保存流
    this.taskResourceStream.on('error', (error: Error, taskRunInstance: TaskRunInstance) => {
      this.taskInfoStream.unpipe(this.taskResourceStream)
      this.taskInfoStream.pipe(this.taskResourceStream)
      handleError(error, taskRunInstance)
    })
    this.taskResourceStream.on('data', (data: TaskResourceSaveResult) => {
      const saveResult = data.status
      const taskRunInstance = data.taskRunInstance
      if (saveResult === TaskStatusEnum.FINISHED) {
        LogUtil.info('TaskQueue', `任务${data.taskRunInstance.taskId}完成`)
      } else if (saveResult === TaskStatusEnum.FAILED) {
        LogUtil.info('TaskQueue', `任务${data.taskRunInstance.taskId}失败`)
      }
      this.refreshParentStatus([taskRunInstance.parentId])
    })
    this.taskResourceStream.on('saveStart', (taskRunInstance: TaskRunInstance) => {
      this.taskStatusChangeStream.addTask([
        {
          taskRunInstance: taskRunInstance,
          status: TaskStatusEnum.PROCESSING
        }
      ])
    })
    this.taskResourceStream.on('saveFailed', handleError)
    this.taskResourceStream.on('finish', () => LogUtil.info('TaskQueue', '任务队列完成'))
    // 保存结果处理流
    this.taskStatusChangeStream.on('error', (error: Error, taskRunInstance: TaskRunInstance) => {
      this.taskResourceStream.unpipe(this.taskStatusChangeStream)
      this.taskResourceStream.pipe(this.taskStatusChangeStream)
      handleError(error, taskRunInstance)
    })
    this.taskStatusChangeStream.on('data', (tasks: Task[]) => {
      if (ArrayNotEmpty(tasks)) {
        tasks.forEach((task) => {
          if (TaskStatusEnum.FINISHED === task.status || TaskStatusEnum.FAILED === task.status) {
            AssertNotNullish(task.id, this.constructor.name, '移除任务的运行实例失败，任务id不能为空')
            this.removeTask(task.id)
          }
        })
      }
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
      this.processTask(tasks)
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
    const parentRunInstance = this.parentMap.get(taskId)
    if (NotNullish(parentRunInstance)) {
      const childrenNum = parentRunInstance.children.size
      let finished = 0
      parentRunInstance.children.forEach((child) => {
        if (child.status === TaskStatusEnum.FINISHED) {
          finished++
        }
      })

      const schedule = (finished / childrenNum) * 100

      return new TaskScheduleDTO({
        id: taskId,
        pid: undefined,
        status: parentRunInstance.status,
        schedule: schedule,
        total: parentRunInstance.children.size,
        finished: finished
      })
    }

    // 子任务的进度
    const taskRunInstance = this.taskMap.get(taskId)
    if (IsNullish(taskRunInstance)) {
      return undefined
    }
    if (TaskStatusEnum.FINISHED === taskRunInstance.status) {
      return new TaskScheduleDTO({
        id: taskId,
        pid: taskRunInstance.parentId,
        status: TaskStatusEnum.FINISHED,
        schedule: 100,
        total: undefined,
        finished: undefined
      })
    }
    const writer = taskRunInstance.taskWriter
    if (TaskStatusEnum.PROCESSING === taskRunInstance.status || TaskStatusEnum.PAUSE === taskRunInstance.status) {
      if (writer.bytesSum === 0) {
        return new TaskScheduleDTO({
          id: taskId,
          pid: taskRunInstance.parentId,
          status: taskRunInstance.status,
          schedule: 0,
          total: undefined,
          finished: undefined
        })
      } else if (NotNullish(writer.writable)) {
        const schedule = (writer.writable.bytesWritten / writer.bytesSum) * 100
        return new TaskScheduleDTO({
          id: taskId,
          pid: taskRunInstance.parentId,
          status: taskRunInstance.status,
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
        .map((taskRunInstance) => {
          const taskId = taskRunInstance.taskId
          const writer = taskRunInstance.taskWriter
          if (TaskStatusEnum.PROCESSING === taskRunInstance.status) {
            if (writer.bytesSum === 0) {
              return new TaskScheduleDTO({
                id: taskId,
                pid: taskRunInstance.parentId,
                status: taskRunInstance.status,
                schedule: 0,
                total: undefined,
                finished: undefined
              })
            } else if (NotNullish(writer.writable)) {
              const schedule = (writer.writable.bytesWritten / writer.bytesSum) * 100
              return new TaskScheduleDTO({
                id: taskId,
                pid: taskRunInstance.parentId,
                status: taskRunInstance.status,
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
        .map((parentRunInstance) => {
          const taskId = parentRunInstance.taskId
          const childrenNum = parentRunInstance.children.size
          let finished = 0
          parentRunInstance.children.forEach((child) => {
            if (child.status === TaskStatusEnum.FINISHED) {
              finished++
            }
          })

          const schedule = (finished / childrenNum) * 100

          return new TaskScheduleDTO({
            id: taskId,
            pid: undefined,
            status: parentRunInstance.status,
            schedule: schedule,
            total: parentRunInstance.children.size,
            finished: finished
          })
        })
      SendMsgToRender(RenderEvent.PARENT_TASK_STATUS_UPDATE_SCHEDULE, taskScheduleList)
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  /**
   * 获取任务树
   * @param ids
   * @param includeStatus
   */
  public async listTaskTree(ids: number[], includeStatus?: TaskStatusEnum[]): Promise<TaskTreeDTO[]> {
    const fullTree = await this.taskService.listTaskTree(ids)
    if (ArrayIsEmpty(includeStatus)) {
      return fullTree
    }
    const result: TaskTreeDTO[] = []

    // 遍历任务树，寻找符合条件的任务
    for (const tempParent of fullTree) {
      if (ArrayIsEmpty(tempParent.children)) {
        if (!tempParent.isCollection) {
          result.push(tempParent)
        }
        continue
      }
      const tempChildren = tempParent.children
      tempParent.children = []
      let inserted = false
      for (const tempChild of tempChildren) {
        if (IsNullish(tempChild.id)) {
          continue
        }
        // 优先使用任务池中的任务状态
        const tempRunInst = this.taskMap.get(tempChild.id)
        if (NotNullish(tempRunInst)) {
          if (includeStatus.includes(tempRunInst.status)) {
            if (!inserted) {
              result.push(tempParent)
              inserted = true
            }
            tempParent.children.push(tempChild)
          }
        } else if (includeStatus.includes(tempChild.status as TaskStatusEnum)) {
          if (!inserted) {
            result.push(tempParent)
            inserted = true
          }
          tempParent.children.push(tempChild)
        }
      }
    }
    return result
  }

  private async processTask(tasks: Task[]) {
    const needChangeStatusList: TaskResourceSaveResult[] = [] // 用于更新数据库中任务的数据
    const runInstances: TaskRunInstance[] = [] // 需要处理的运行实例
    for (const task of tasks) {
      AssertNotNullish(task.id)
      let taskRunInstance = this.taskMap.get(task.id)
      if (NotNullish(taskRunInstance)) {
        clearTimeout(taskRunInstance.clearTimeoutId)
        if (!taskRunInstance.inStream) {
          taskRunInstance.inStream = true
          runInstances.push(taskRunInstance)
        }
        try {
          taskRunInstance.preStart()
        } catch (error) {
          LogUtil.error(this.constructor.name, error)
        }
      } else {
        // TODO 判断是否已经保存过这个作品，如果已经保存过则提示用户
        // 判断这个作品是否已经保存过
        if (NotNullish(task.siteId) && NotNullish(task.siteWorksId)) {
          const existsWorksList = await this.worksService.listBySiteIdAndSiteWorksId(task.siteId, task.siteWorksId)
          LogUtil.info('TaskQueue', existsWorksList)
        }
        taskRunInstance = new TaskRunInstance(
          task.id,
          TaskStatusEnum.WAITING,
          new TaskWriter(),
          this.taskService,
          this.pluginLoader,
          task.pid
        )
        taskRunInstance.inStream = true
        runInstances.push(taskRunInstance)
        this.inletTask(taskRunInstance, task)
        needChangeStatusList.push({
          taskRunInstance: taskRunInstance,
          status: TaskStatusEnum.WAITING
        })
      }
    }
    // 所有任务设置为等待中
    this.taskStatusChangeStream.addTask(needChangeStatusList)
    // 刷新父任务状态
    this.setChildrenOfParent(runInstances)

    this.inletStream.addArray(runInstances)
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
        LogUtil.error('TaskQueue', `暂停任务失败，任务id不能为空`)
        continue
      }
      const taskId = task.id
      const taskRunInstance = this.taskMap.get(taskId)
      if (IsNullish(taskRunInstance)) {
        LogUtil.error('TaskQueue', `无法暂停任务${taskId}，队列中没有这个任务`)
        continue
      }
      try {
        taskRunInstance.pause(task)
        if (!taskRunInstance.over()) {
          taskSaveResultList.push({
            taskRunInstance: taskRunInstance,
            status: TaskStatusEnum.PAUSE
          })
        }
      } catch (error) {
        LogUtil.error(this.constructor.name, error)
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
        LogUtil.error('TaskQueue', `停止任务失败，任务id不能为空`)
        continue
      }
      const taskId = task.id
      const taskRunInstance = this.taskMap.get(taskId)
      if (IsNullish(taskRunInstance)) {
        LogUtil.error('TaskQueue', `无法停止任务${taskId}，队列中没有这个任务`)
        continue
      }
      try {
        taskRunInstance.stop(task)
        if (!taskRunInstance.over()) {
          taskSaveResultList.push({
            taskRunInstance: taskRunInstance,
            status: TaskStatusEnum.PAUSE
          })
        }
      } catch (error) {
        LogUtil.info(this.constructor.name, error)
      }
    }
    this.taskStatusChangeStream.addTask(taskSaveResultList)
  }

  /**
   * 设置父任务的子任务
   * @param runInstances 子任务运行实例列表
   * @private
   */
  private async setChildrenOfParent(runInstances: TaskRunInstance[]) {
    const parentWaitingRefreshSet: Set<number> = new Set()
    for (const runInstance of runInstances) {
      if (NotNullish(runInstance.parentId) && runInstance.parentId !== 0) {
        let parent = this.parentMap.get(runInstance.parentId)
        if (IsNullish(parent)) {
          const parentInfo = await this.taskService.getById(runInstance.parentId)
          AssertNotNullish(parentInfo?.status, 'TaskQueue', `刷新父任务${runInstance.parentId}失败，任务状态意外为空`)
          parent = new ParentRunInstance(runInstance.parentId, parentInfo?.status)
          this.inletParentTask(parent, parentInfo)
        }
        parent.children.set(runInstance.taskId, runInstance)
        parentWaitingRefreshSet.add(runInstance.parentId)
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
      const parentRunInstance = this.parentMap.get(id)
      if (NotNullish(parentRunInstance)) {
        const allChildren = await this.taskService.listChildrenTask(id)
        allChildren.forEach((children) => {
          if (!parentRunInstance.children.has(children.id as number)) {
            const taskStatus = new TaskStatus(children.id as number, children.status as TaskStatusEnum, false)
            parentRunInstance.children.set(children.id as number, taskStatus)
          }
        })

        const children = Array.from(parentRunInstance.children.values())
        const processing = children.filter((child) => TaskStatusEnum.PROCESSING === child.status).length
        const waiting = children.filter((child) => TaskStatusEnum.WAITING === child.status).length
        const paused = children.filter((child) => TaskStatusEnum.PAUSE === child.status).length
        const finished = children.filter((child) => TaskStatusEnum.FINISHED === child.status).length
        const failed = children.filter((child) => TaskStatusEnum.FAILED === child.status).length

        let newStatus: TaskStatusEnum = parentRunInstance.status
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

        if (parentRunInstance.status !== newStatus) {
          parentRunInstance.changeStatus(newStatus, true)
          const parent = new Task()
          parent.id = parentRunInstance.taskId
          parent.status = newStatus
          this.taskService.updateById(parent)
        }

        // 清除不再活跃的父任务
        if (processing === 0 && paused === 0 && waiting === 0) {
          this.removeParentTask(id)
        } else if (NotNullish(parentRunInstance.clearTimeoutId)) {
          clearTimeout(parentRunInstance.clearTimeoutId)
        }
      }
    }
    this.pushParentTaskSchedule()
  }

  /**
   * 任务插入到任务池中
   * @param taskRunInstance 任务运行实例
   * @param task 任务信息
   * @private
   */
  private inletTask(taskRunInstance: TaskRunInstance, task: Task) {
    // 清除原有的删除定时器
    const oldInst = this.taskMap.get(taskRunInstance.taskId)
    if (NotNullish(oldInst)) {
      clearTimeout(oldInst.clearTimeoutId)
    }
    this.taskMap.set(taskRunInstance.taskId, taskRunInstance)
    // 任务状态推送到渲染进程
    const taskProgressMapTreeDTO = new TaskProgressMapTreeDTO()
    CopyIgnoreUndefined(taskProgressMapTreeDTO, task)
    SendMsgToRender(RenderEvent.TASK_STATUS_SET_TASK, [taskProgressMapTreeDTO])
  }

  /**
   * 任务插入到父任务池中
   * @param parentRunInstance 父任务运行实例
   * @param task 任务信息
   * @private
   */
  private inletParentTask(parentRunInstance: ParentRunInstance, task: Task) {
    // 清除原有的删除定时器
    const oldInst = this.taskMap.get(parentRunInstance.taskId)
    if (NotNullish(oldInst)) {
      clearTimeout(oldInst.clearTimeoutId)
    }
    this.parentMap.set(parentRunInstance.taskId, parentRunInstance)
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
    const runInstance = this.taskMap.get(taskId)
    if (NotNullish(runInstance)) {
      runInstance.clearTimeoutId = setTimeout(() => {
        this.taskMap.delete(taskId)
        // 任务状态推送到渲染进程
        SendMsgToRender(RenderEvent.TASK_STATUS_REMOVE_TASK, [taskId])
      }, 5000)
    } else {
      LogUtil.warn(this.constructor.name, `移除任务运行实例失败，任务运行实例不存在，taskId: ${taskId}`)
    }
  }

  /**
   * 从父任务池中移除任务运行实例
   * @param taskId 子任务id
   * @private
   */
  private removeParentTask(taskId: number) {
    const runInstance = this.parentMap.get(taskId)
    if (NotNullish(runInstance)) {
      runInstance.clearTimeoutId = setTimeout(() => {
        this.parentMap.delete(taskId)
        // 任务状态推送到渲染进程
        SendMsgToRender(RenderEvent.PARENT_TASK_STATUS_REMOVE_PARENT_TASK, [taskId])
      }, 5000)
    } else {
      LogUtil.warn(this.constructor.name, `移除父任务运行实例失败，父任务运行实例不存在，taskId: ${taskId}`)
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
  /**
   * 清理定时器id
   */
  clearTimeoutId: NodeJS.Timeout | undefined

  constructor(taskId: number, status: TaskStatusEnum, isParent: boolean) {
    this.taskId = taskId
    this.status = status
    this.changeStatus(status, isParent)
    this.clearTimeoutId = undefined
  }

  /**
   * 更新任务状态
   * @param status 任务状态
   * @param isParent 是否为父任务
   * @private
   */
  public changeStatus(status: TaskStatusEnum, isParent: boolean): void {
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

  public waiting(): boolean {
    return this.status === TaskStatusEnum.WAITING
  }

  public processing(): boolean {
    return this.status === TaskStatusEnum.PROCESSING
  }

  public paused(): boolean {
    return this.status === TaskStatusEnum.PAUSE
  }

  public over(): boolean {
    return this.status === TaskStatusEnum.FINISHED || this.status === TaskStatusEnum.FAILED
  }
}

/**
 * 任务运行实例
 */
class TaskRunInstance extends TaskStatus {
  /**
   * 写入器
   */
  public taskWriter: TaskWriter
  /**
   * 操作
   */
  public operation: TaskOperation | undefined
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
  public saveHadStarted: boolean
  /**
   * 是否正在流中
   */
  public inStream: boolean
  /**
   * Task服务
   * @private
   */
  private taskService: TaskService
  /**
   * 插件加载器
   * @private
   */
  private readonly pluginLoader: PluginLoader<TaskHandler>

  constructor(
    taskId: number,
    status: TaskStatusEnum,
    taskWriter: TaskWriter,
    taskService: TaskService,
    pluginLoader: PluginLoader<TaskHandler>,
    parentId?: number | null | undefined,
    worksInfoSaved?: boolean,
    resourceHadStarted?: boolean,
    operation?: TaskOperation
  ) {
    super(taskId, status, false)
    this.taskWriter = taskWriter
    this.taskService = taskService
    this.pluginLoader = pluginLoader
    this.parentId = IsNullish(parentId) ? 0 : parentId
    this.infoSaved = IsNullish(worksInfoSaved) ? false : worksInfoSaved
    this.saveHadStarted = IsNullish(resourceHadStarted) ? false : resourceHadStarted
    this.operation = operation
    this.inStream = false
  }

  public changeStatus(status: TaskStatusEnum): void {
    super.changeStatus(status, false)
  }

  public async saveInfo() {
    const task = await this.taskService.getById(this.taskId)
    AssertNotNullish(task, 'TaskQueue', `保存任务${this.taskId}的信息失败，任务id无效`)
    return await this.taskService.saveWorksInfo(task, this.pluginLoader)
  }

  public preStart() {
    if (
      this.status === TaskStatusEnum.CREATED ||
      this.status === TaskStatusEnum.FINISHED ||
      this.status === TaskStatusEnum.FAILED ||
      this.status === TaskStatusEnum.PAUSE
    ) {
      this.changeStatus(TaskStatusEnum.WAITING)
    } else {
      throw new Error(`无法预启动任务${this.taskId}，当前状态不支持，taskStatus: ${this.status}`)
    }
  }

  public pause(task: Task) {
    if (this.status === TaskStatusEnum.PROCESSING || this.status === TaskStatusEnum.WAITING) {
      // 对于已开始的任务，调用taskService的pauseTask进行暂停
      if (this.processing()) {
        this.taskService.pauseTask(task, this.pluginLoader, this.taskWriter)
      }
      this.changeStatus(TaskStatusEnum.PAUSE)
      if (!this.over()) {
        LogUtil.info('TaskQueue', `任务${this.taskId}暂停`)
      }
    } else {
      throw new Error(`无法暂停任务${this.taskId}，当前状态不支持，taskStatus: ${this.status}`)
    }
  }

  public stop(task: Task) {
    if (this.status === TaskStatusEnum.PROCESSING || this.status === TaskStatusEnum.WAITING || this.status === TaskStatusEnum.PAUSE) {
      // 对于已开始的任务，调用taskService的pauseTask进行暂停
      if (this.processing()) {
        this.taskService.pauseTask(task, this.pluginLoader, this.taskWriter)
      }
      this.changeStatus(TaskStatusEnum.PAUSE)
      if (!this.over()) {
        LogUtil.info('TaskQueue', `任务${this.taskId}暂停`)
      }
    } else {
      throw new Error(`无法停止任务${this.taskId}，当前状态不支持，taskStatus: ${this.status}`)
    }
  }

  public async process(): Promise<TaskStatusEnum> {
    if (this.status === TaskStatusEnum.WAITING) {
      this.changeStatus(TaskStatusEnum.PROCESSING)
      const task = await this.taskService.getById(this.taskId)

      AssertNotNullish(task, 'TaskQueue', `保存任务${this.taskId}的资源失败，任务id无效`)
      const result = this.saveHadStarted
        ? this.taskService.resumeTask(task, this.pluginLoader, this.taskWriter)
        : this.taskService.startTask(task, this.pluginLoader, this.taskWriter)
      this.saveHadStarted = true
      return result.then((saveResult) => {
        this.changeStatus(saveResult)
        return saveResult
      })
    } else {
      throw new Error(`无法开始任务${this.taskId}，当前状态不支持，taskStatus: ${this.status}`)
    }
  }

  public failed() {
    this.changeStatus(TaskStatusEnum.FAILED)
  }
}

/**
 * 父任务运行实例
 */
class ParentRunInstance extends TaskStatus {
  /**
   * 子任务
   */
  public children: Map<number, TaskRunInstance | TaskStatus>

  constructor(taskId: number, status: TaskStatusEnum) {
    super(taskId, status, true)
    this.children = new Map<number, TaskRunInstance>()
  }
}

/**
 * 任务信息保存流
 */
class TaskInfoStream extends Transform {
  constructor() {
    super({ objectMode: true, highWaterMark: 64 }) // 设置为对象模式
  }

  async _transform(chunk: TaskRunInstance, _encoding: string, callback: TransformCallback): Promise<void> {
    if (chunk.infoSaved) {
      this.push(chunk)
      callback()
      return
    }
    chunk.infoSaved = true

    const task: Task | undefined = new Task()
    task.id = chunk.taskId
    try {
      await chunk.saveInfo()
      this.push(chunk)
      callback()
    } catch (error) {
      this.handleError(chunk, callback, error as Error, task)
    }
  }

  /**
   * 处理_transform的错误
   * @param taskRunInstance
   * @param callback
   * @param error
   * @param task
   * @private
   */
  private handleError(taskRunInstance: TaskRunInstance, callback: () => void, error?: Error, task?: Task) {
    const msg = `保存任务${taskRunInstance.taskId}的作品信息失败`
    if (IsNullish(error)) {
      error = new Error(msg)
    } else {
      error.message = msg + '，' + error.message
    }
    LogUtil.error('TaskQueue', error)
    this.emit('error', error, task, taskRunInstance)
    callback()
  }
}

/**
 * 任务资源保存流
 */
class TaskResourceStream extends Transform {
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

  constructor() {
    super({ objectMode: true, highWaterMark: 64, autoDestroy: false }) // 设置为对象模式
    // 读取设置中的最大并行数
    const maxParallelImportInSettings = GlobalVar.get(GlobalVars.SETTINGS).store.importSettings.maxParallelImport
    this.maxParallel = maxParallelImportInSettings >= 1 ? maxParallelImportInSettings : 1
    this.processing = 0
    this.limited = false
  }

  async _transform(chunk: TaskRunInstance, _encoding: string, callback: TransformCallback): Promise<void> {
    // 开始之前检查当前的状态
    if (chunk.paused()) {
      chunk.inStream = false
      callback()
      return
    }
    // 发出任务开始保存的事件
    this.emit('saveStart', chunk)

    this.processing++
    // 如果并行量达到限制，limited设为true
    this.limited = this.processing >= this.maxParallel

    // 开始任务
    chunk
      .process()
      .then((saveResult: TaskStatusEnum) => {
        chunk.inStream = false
        this.push({
          taskRunInstance: chunk,
          status: saveResult
        })
        this.processing--
        // 如果处于限制状态，则在此次下载完成之后解开限制
        if (this.limited) {
          this.limited = false
          callback()
        }
      })
      .catch((err) => {
        chunk.inStream = false
        this.emit('saveFailed', err, chunk)
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
}

/**
 * 任务资源保存结果
 */
interface TaskResourceSaveResult {
  taskRunInstance: TaskRunInstance
  status: TaskStatusEnum
}

/**
 * 任务状态改变流
 */
class TaskStatusChangeStream extends Transform {
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

  async _transform(
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
        this.push(temp)
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
    tempTask.id = saveResult.taskRunInstance.taskId
    tempTask.status = saveResult.status
    if (TaskStatusEnum.FINISHED === tempTask.status) {
      tempTask.localWorksId = null
      tempTask.pendingDownloadPath = null
    }
    return tempTask
  }
}

/**
 * 任务运行实例流
 */
class ReadableTaskRunInstance extends Readable {
  /**
   * 所有待处理的数组
   * @private
   */
  private readonly allInstLists: TaskRunInstance[][]

  /**
   * 当前数组中的索引
   * @private
   */
  private currentIndex: number

  constructor() {
    super({ objectMode: true })
    this.allInstLists = []
    this.currentIndex = 0
  }

  // 添加一个新的数组到流中
  public addArray(array: TaskRunInstance[]) {
    this.allInstLists.push(array)
    this.processNext()
  }

  _read() {
    this.processNext()
  }

  private processNext() {
    // 如果没有更多的数组或当前数组已经处理完毕，尝试切换到下一个数组
    while (ArrayNotEmpty(this.allInstLists)) {
      if (this.currentIndex >= this.allInstLists[0].length) {
        this.allInstLists.shift()
        this.currentIndex = 0
      } else {
        break
      }
    }

    // 如果所有数组都已经处理完毕，推送 null 表示结束
    if (ArrayIsEmpty(this.allInstLists)) {
      return
    }

    // 从当前数组中读取一个元素并推送
    const chunk = this.allInstLists[0][this.currentIndex++]
    this.push(chunk)
  }
}
