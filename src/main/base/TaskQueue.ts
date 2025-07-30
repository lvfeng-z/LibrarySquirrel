import { TaskStatusEnum } from '../constant/TaskStatusEnum.js'
import { AssertNotNullish } from '../util/AssertUtil.js'
import LogUtil from '../util/LogUtil.js'
import TaskService from '../service/TaskService.js'
import WorksService from '../service/WorksService.js'
import { ArrayIsEmpty, ArrayNotEmpty, IsNullish, NotNullish } from '../util/CommonUtil.js'
import { Readable, Transform, TransformCallback, Writable } from 'node:stream'
import PluginLoader from '../plugin/PluginLoader.js'
import { TaskHandler, TaskHandlerFactory } from '../plugin/TaskHandler.js'
import ResourceWriter from '../util/ResourceWriter.js'
import TaskScheduleDTO from '../model/dto/TaskScheduleDTO.js'
import Task from '../model/entity/Task.js'
import { GlobalVar, GlobalVars } from './GlobalVar.js'
import { RenderEvent, SendMsgToRender } from './EventToRender.js'
import TaskProgressMapTreeDTO from '../model/dto/TaskProgressMapTreeDTO.js'
import { CopyIgnoreUndefined } from '../util/ObjectUtil.js'
import TaskTreeDTO from '../model/dto/TaskTreeDTO.js'
import TaskProgressDTO from '../model/dto/TaskProgressDTO.js'
import lodash from 'lodash'
import { queue, QueueObject } from 'async'
import ResourceService from '../service/ResourceService.js'
import Electron from 'electron'
import TaskProcessResponseDTO from '../model/dto/TaskProcessResponseDTO.js'
import Site from '../model/entity/Site.js'
import SiteService from '../service/SiteService.js'

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
   * 所有待处理的数组
   * @private
   */
  private readonly runInstBuffer: TaskRunInstance[][]

  /**
   * 当前数组中的索引
   * @private
   */
  private currentBufferIndex: number

  /**
   * 任务服务
   * @private
   */
  private readonly taskService: TaskService

  /**
   * 作品服务
   * @private
   */
  private worksService: WorksService

  /**
   * 站点服务
   * @private
   */
  private siteService: SiteService

  /**
   * 插件加载器
   * @private
   */
  private readonly pluginLoader: PluginLoader<TaskHandler>

  /**
   * 作为任务处理流程入口的流
   * @private
   */
  private readonly queueEntrance: TaskQueueEntrance

  /**
   * 作品信息保存流
   * @private
   */
  private readonly worksInfoSaveStream: WorksInfoSaveStream

  /**
   * 资源保存流
   * @private
   */
  private readonly resourceSaveStream: ResourceSaveStream

  /**
   * 任务信息保存流
   * @private
   */
  private readonly taskPersistStream: TaskPersistStream

  /**
   * 是否已经关闭
   * @private
   */
  private closed: boolean

  /**
   * 准备关闭
   * @private
   */
  private readonly readyToClose: Promise<void>

  /**
   * 是否正在推送任务进度
   * @private
   */
  private taskSchedulePushing: boolean

  /**
   * 是否正在推送父任务进度
   * @private
   */
  private parentSchedulePushing: boolean

  /**
   * 站点信息缓存
   * @private
   */
  private siteCache: Map<number, Site>

  constructor() {
    this.taskMap = new Map()
    this.parentMap = new Map()
    this.runInstBuffer = []
    this.currentBufferIndex = 0
    this.taskService = new TaskService()
    this.worksService = new WorksService()
    this.siteService = new SiteService()
    this.pluginLoader = new PluginLoader(new TaskHandlerFactory())
    this.closed = false
    this.taskSchedulePushing = false
    this.parentSchedulePushing = false
    this.siteCache = new Map()

    this.queueEntrance = new TaskQueueEntrance(
      this.getNext.bind(this),
      new ResourceService(),
      this.refreshParentStatus.bind(this),
      this.handleReplaceRefuse.bind(this)
    )
    this.worksInfoSaveStream = new WorksInfoSaveStream()
    // 读取设置中的最大并行数
    const maxParallelImportInSettings = GlobalVar.get(GlobalVars.SETTINGS).store.importSettings.maxParallelImport
    this.resourceSaveStream = new ResourceSaveStream(maxParallelImportInSettings, this.refreshParentStatus.bind(this))
    this.taskPersistStream = new TaskPersistStream()

    // 初始化流
    this.readyToClose = new Promise<void>((resolve, reject) => {
      const handleError = (error: Error, taskRunInstance?: TaskRunInstance) => {
        LogUtil.error(this.constructor.name, `处理任务失败，taskId: ${taskRunInstance?.taskId}，error: ${error.message}`)
        if (NotNullish(taskRunInstance)) {
          taskRunInstance.failed()
          this.taskPersistStream.addTask([taskRunInstance])
          if (IsNullish(taskRunInstance.parentId) || taskRunInstance.parentId === 0) {
            // 单个的任务直接清除
            this.removeTask([taskRunInstance.taskId])
          } else {
            // 有父任务的刷新父任务状态
            this.refreshParentStatus([taskRunInstance.parentId]).catch((error) =>
              LogUtil.error(this.constructor.name, '刷新父任务状态失败', error)
            )
          }
        }
      }
      // 入口流
      this.queueEntrance.on('error', (error: Error, taskRunInstance: TaskRunInstance) => {
        this.queueEntrance.unpipe(this.worksInfoSaveStream)
        this.queueEntrance.pipe(this.worksInfoSaveStream)
        handleError(error, taskRunInstance)
      })
      this.queueEntrance.on('entry-failed', handleError)
      // 作品信息保存流
      this.worksInfoSaveStream.on('error', (error: Error, taskRunInstance: TaskRunInstance) => {
        this.queueEntrance.unpipe(this.worksInfoSaveStream)
        this.queueEntrance.pipe(this.worksInfoSaveStream)
        handleError(error, taskRunInstance)
      })
      this.worksInfoSaveStream.on('save-failed', handleError)
      const taskInfoStreamDestroyed = new Promise<void>((resolve) =>
        this.worksInfoSaveStream.once('end', () => {
          this.worksInfoSaveStream.destroy()
          LogUtil.info(this.constructor.name, '作品信息保存流已销毁')
          resolve()
        })
      )
      // 资源保存流
      this.resourceSaveStream.on('error', (error: Error, taskRunInstance: TaskRunInstance) => {
        this.worksInfoSaveStream.unpipe(this.resourceSaveStream)
        this.worksInfoSaveStream.pipe(this.resourceSaveStream)
        handleError(error, taskRunInstance)
      })
      this.resourceSaveStream.on('data', (taskRunInstance: TaskRunInstance) => {
        if (taskRunInstance.status === TaskStatusEnum.FINISHED) {
          taskRunInstance.resSaveSuspended = false
          LogUtil.info(this.constructor.name, `任务${taskRunInstance.taskId}完成`)
        } else if (taskRunInstance.status === TaskStatusEnum.FAILED) {
          taskRunInstance.resSaveSuspended = false
          LogUtil.info(this.constructor.name, `任务${taskRunInstance.taskId}失败`)
        }
        if (IsNullish(taskRunInstance.parentId) || taskRunInstance.parentId === 0) {
          // 单个的任务直接清除
          this.removeTask([taskRunInstance.taskId])
        } else {
          // 有父任务的刷新父任务状态
          this.refreshParentStatus([taskRunInstance.parentId]).catch((error) =>
            LogUtil.error(this.constructor.name, '刷新父任务状态失败', error)
          )
        }
      })
      this.resourceSaveStream.on('save-failed', handleError)
      this.resourceSaveStream.on('finish', () => LogUtil.info(this.constructor.name, '任务队列完成'))
      const taskResourceStreamDestroyed = new Promise<void>((resolve) =>
        this.resourceSaveStream.once('end', () => {
          this.resourceSaveStream.destroy()
          LogUtil.info(this.constructor.name, '资源保存流已销毁')
          resolve()
        })
      )
      // 任务信息保存流
      this.taskPersistStream.on('error', (error: Error, taskRunInstance: TaskRunInstance) => {
        this.resourceSaveStream.unpipe(this.taskPersistStream)
        this.resourceSaveStream.pipe(this.taskPersistStream)
        handleError(error, taskRunInstance)
      })
      const taskPersistStreamDestroyed = new Promise<void>((resolve) =>
        this.taskPersistStream.once('close', () => {
          this.taskPersistStream.destroy()
          LogUtil.info(this.constructor.name, '任务结果保存流已销毁')
          resolve()
        })
      )

      // 建立管道
      this.queueEntrance.pipe(this.worksInfoSaveStream)
      this.worksInfoSaveStream.pipe(this.resourceSaveStream)
      this.resourceSaveStream.pipe(this.taskPersistStream)

      Promise.all([taskInfoStreamDestroyed, taskResourceStreamDestroyed, taskPersistStreamDestroyed])
        .then(async () => {
          const notPersistedTasks = this.taskMap
            .values()
            .filter((task) => !task.taskChangeStored)
            .toArray()
          notPersistedTasks.forEach((notPersistedTask) => clearTimeout(notPersistedTask.clearTimeoutId))
          if (ArrayNotEmpty(notPersistedTasks)) {
            await this.taskService.updateBatchById(notPersistedTasks.map((notPersistedTask) => notPersistedTask.getTaskInfo()))
          }
          resolve()
        })
        .catch((error) => reject(error))
    })
  }

  /**
   * 批量插入操作
   * @param tasks 需要操作的任务
   * @param taskOperation 要执行的操作
   */
  public async pushBatch(tasks: Task[], taskOperation: TaskOperation) {
    if (this.closed) {
      LogUtil.warn(this.constructor.name, '无法执行操作，任务队列已经关闭')
      return
    }
    if (taskOperation === TaskOperation.START || taskOperation === TaskOperation.RESUME) {
      await this.processTask(tasks)
    } else if (taskOperation === TaskOperation.PAUSE) {
      await this.pauseTask(tasks.map((task) => task.id as number))
      const parentIdWaitingRefresh: Set<number> = new Set(tasks.map((task) => task.pid).filter(NotNullish))
      this.refreshParentStatus(Array.from(parentIdWaitingRefresh)).catch((error) =>
        LogUtil.error(this.constructor.name, '刷新父任务状态失败', error)
      )
    } else if (taskOperation === TaskOperation.STOP) {
      await this.stopTask(tasks)
      // 清除单个的任务
      const singleTasks = tasks.filter((task) => IsNullish(task.pid)).map((task) => task.id as number)
      this.removeTask(singleTasks)
      // 刷新父任务
      const parentIdWaitingRefresh: Set<number> = new Set(tasks.map((task) => task.pid).filter(NotNullish))
      this.refreshParentStatus(Array.from(parentIdWaitingRefresh)).catch((error) =>
        LogUtil.error(this.constructor.name, '刷新父任务状态失败', error)
      )
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
      let finished = 0
      parentRunInstance.children.forEach((child) => {
        if (child.status === TaskStatusEnum.FINISHED) {
          finished++
        }
      })

      return new TaskScheduleDTO({
        id: taskId,
        pid: undefined,
        status: parentRunInstance.status,
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
        total: taskRunInstance.resourceWriter.resourceSize,
        finished: IsNullish(taskRunInstance.resourceWriter.writable) ? 0 : taskRunInstance.resourceWriter.writable.bytesWritten
      })
    }
    if (TaskStatusEnum.PROCESSING === taskRunInstance.status || TaskStatusEnum.PAUSE === taskRunInstance.status) {
      return new TaskScheduleDTO({
        id: taskId,
        pid: taskRunInstance.parentId,
        status: taskRunInstance.status,
        total: taskRunInstance.resourceWriter.resourceSize,
        finished: IsNullish(taskRunInstance.resourceWriter.writable) ? 0 : taskRunInstance.resourceWriter.writable.bytesWritten
      })
    }
    return undefined
  }

  /**
   * 循环推送子任务的进度
   */
  public async pushTaskSchedule(): Promise<void> {
    if (this.taskSchedulePushing) {
      return
    }
    while (NotNullish(this.taskMap) && this.taskMap.size > 0) {
      this.taskSchedulePushing = true
      const taskScheduleList = this.taskMap
        .values()
        .toArray()
        .map((taskRunInstance) => {
          const taskId = taskRunInstance.taskId
          if (TaskStatusEnum.PROCESSING === taskRunInstance.status && NotNullish(taskRunInstance.resourceWriter.writable)) {
            return new TaskScheduleDTO({
              id: taskId,
              pid: taskRunInstance.parentId,
              status: taskRunInstance.status,
              total: taskRunInstance.resourceWriter.resourceSize,
              finished: IsNullish(taskRunInstance.resourceWriter.writable) ? 0 : taskRunInstance.resourceWriter.writable.bytesWritten
            })
          }
          return undefined
        })
        .filter(NotNullish)
      if (this.closed) {
        break
      }
      if (ArrayNotEmpty(taskScheduleList)) {
        SendMsgToRender(RenderEvent.TASK_STATUS_UPDATE_SCHEDULE, taskScheduleList)
      }
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
    this.taskSchedulePushing = false
  }

  /**
   * 循环推送父任务的进度
   */
  public async pushParentTaskSchedule(): Promise<void> {
    if (this.parentSchedulePushing) {
      return
    }
    while (NotNullish(this.parentMap) && this.parentMap.size > 0) {
      this.parentSchedulePushing = true
      const taskScheduleList = this.parentMap
        .values()
        .toArray()
        .map((parentRunInstance) => {
          const taskId = parentRunInstance.taskId
          let finished = 0
          parentRunInstance.children.forEach((child) => {
            if (child.status === TaskStatusEnum.FINISHED) {
              finished++
            }
          })

          return new TaskScheduleDTO({
            id: taskId,
            pid: undefined,
            status: parentRunInstance.status,
            total: parentRunInstance.children.size,
            finished: finished
          })
        })
      if (this.closed) {
        break
      }
      SendMsgToRender(RenderEvent.PARENT_TASK_STATUS_UPDATE_SCHEDULE, taskScheduleList)
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
    this.parentSchedulePushing = false
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
      let parentPushed = false
      for (const tempChild of tempChildren) {
        if (IsNullish(tempChild.id)) {
          continue
        }
        // 优先使用运行实例的任务状态判断任务状态，同时把运行实例的状态作为任务的状态
        const tempRunInst = this.taskMap.get(tempChild.id)
        if (NotNullish(tempRunInst)) {
          if (includeStatus.includes(tempRunInst.status)) {
            if (!parentPushed) {
              result.push(tempParent)
              parentPushed = true
            }
            tempChild.status = tempRunInst.status
            tempParent.children.push(tempChild)
          }
        } else if (includeStatus.includes(tempChild.status as TaskStatusEnum)) {
          if (!parentPushed) {
            result.push(tempParent)
            parentPushed = true
          }
          tempParent.children.push(tempChild)
        }
      }
    }
    return result
  }

  /**
   * 暂停所有任务
   */
  public async shutdown(): Promise<void> {
    this.closed = true
    const runInstList = this.taskMap.values().toArray()
    const ids = runInstList
      .filter((runInst) => TaskStatusEnum.WAITING === runInst.status || TaskStatusEnum.PROCESSING === runInst.status)
      .map((runInst) => runInst.taskId)
    const parentIds = runInstList.map((runInst) => runInst.parentId)
    this.pauseTask(ids)
    this.queueEntrance.preDestroy()
    this.queueEntrance.destroy()
    await this.readyToClose
    await this.refreshParentStatus(parentIds)
    LogUtil.info(this.constructor.name, '任务队列已关闭')
  }

  /**
   * 任务队列是否空闲
   */
  public isIdle(): boolean {
    const parentNotIdle = this.parentMap.values().some((parentInst) => parentInst.processing() || parentInst.waiting())
    if (parentNotIdle) {
      return false
    }
    return !this.taskMap.values().some((taskInst) => taskInst.processing() || taskInst.waiting())
  }

  /**
   * 更新最大并行数
   * @param newNum
   */
  public updateMaxParallel(newNum: number) {
    this.resourceSaveStream.updateMaxParallel(newNum)
  }

  /**
   * 开始处理任务
   * @param tasks 需要处理的任务
   * @private
   */
  private async processTask(tasks: Task[]) {
    const runInstances: TaskRunInstance[] = [] // 需要处理的运行实例
    const existsTasks: TaskRunInstance[] = []
    const notExistsTasks: Task[] = []
    const tempPidSet: Set<number> = new Set<number>()
    tasks.forEach((task) => {
      const taskRunInstance = this.taskMap.get(task.id as number)
      if (NotNullish(taskRunInstance)) {
        clearTimeout(taskRunInstance.clearTimeoutId)
        tempPidSet.add(taskRunInstance.parentId)
        existsTasks.push(taskRunInstance)
      } else {
        notExistsTasks.push(task)
      }
    })
    tempPidSet.forEach((pid) => {
      const tempTimeout = this.parentMap.get(pid)?.clearTimeoutId
      if (NotNullish(tempTimeout)) {
        clearTimeout(tempTimeout)
      }
    })

    for (const taskRunInstance of existsTasks) {
      if (!taskRunInstance.inStream) {
        taskRunInstance.inStream = true
        runInstances.push(taskRunInstance)
      }
    }

    if (ArrayNotEmpty(notExistsTasks)) {
      // 查询已经下载过的作品列表
      const siteIdAndSiteWorksIds = notExistsTasks.map((notExistsTask) => {
        return {
          siteId: notExistsTask.siteId as number,
          siteWorksId: notExistsTask.siteWorksId as string
        }
      })
      const existsWorksList = await this.worksService.listBySiteIdAndSiteWorksIds(siteIdAndSiteWorksIds)
      for (const task of notExistsTasks) {
        // 判断这个作品是否已经保存过
        let infoSaved = false
        let localWorksId: number | undefined
        const resSaveSuspended = NotNullish(task.pendingResourceId)
        const existsWorks = existsWorksList.find(
          (existsTask) => task.siteId === existsTask.siteId && task.siteWorksId === existsTask.siteWorksId
        )
        infoSaved = NotNullish(existsWorks)
        if (NotNullish(existsWorks)) {
          AssertNotNullish(existsWorks.id)
          localWorksId = existsWorks.id
        }
        const taskRunInstance = new TaskRunInstance(
          task.id as number,
          task.pid,
          task.status as TaskStatusEnum,
          // TaskStatusEnum.WAITING,
          task,
          infoSaved,
          resSaveSuspended,
          this.taskService,
          this.pluginLoader,
          new ResourceWriter(),
          localWorksId
        )
        // task.status = TaskStatusEnum.WAITING
        taskRunInstance.inStream = true
        runInstances.push(taskRunInstance)
        this.inletTask(taskRunInstance, task)
      }
    }

    // 刷新父任务状态
    await this.fillChildren(runInstances)
    // this.refreshParentStatus(runInstances.map((runInstance) => runInstance.parentId))
    // this.queueEntrance.manualStart()
    this.runInstBuffer.push(runInstances)
    this.queueEntrance.manualStart()
  }

  /**
   * 暂停任务
   * @param taskIds 要停暂停的任务
   * @private
   */
  private pauseTask(taskIds: number[]): Promise<boolean[]> {
    const taskSaveResultList: TaskRunInstance[] = []
    const result: Promise<boolean>[] = []
    for (const taskId of taskIds) {
      const taskRunInstance = this.taskMap.get(taskId)
      if (IsNullish(taskRunInstance)) {
        LogUtil.error(this.constructor.name, `无法暂停任务${taskId}，队列中没有这个任务`)
        continue
      }
      try {
        result.push(taskRunInstance.pause())
        if (!taskRunInstance.over()) {
          taskSaveResultList.push(taskRunInstance)
        }
      } catch (error) {
        LogUtil.error(this.constructor.name, error)
      }
    }
    this.taskPersistStream.addTask(taskSaveResultList)
    return Promise.all(result)
  }

  /**
   * 停止任务
   * @param tasks 要停停止的任务
   * @private
   */
  private async stopTask(tasks: Task[]) {
    const taskSaveResultList: TaskRunInstance[] = []
    for (const task of tasks) {
      if (IsNullish(task.id)) {
        LogUtil.error(this.constructor.name, `停止任务失败，任务id不能为空`)
        continue
      }
      const taskId = task.id
      const taskRunInstance = this.taskMap.get(taskId)
      if (IsNullish(taskRunInstance)) {
        LogUtil.error(this.constructor.name, `无法停止任务${taskId}，队列中没有这个任务`)
        continue
      }
      try {
        await taskRunInstance.stop()
        if (!taskRunInstance.over()) {
          taskSaveResultList.push(taskRunInstance)
        }
      } catch (error) {
        LogUtil.info(this.constructor.name, error)
      }
    }
    this.taskPersistStream.addTask(taskSaveResultList)
  }

  /**
   * 补全父任务的子任务
   * @param runInstances 子任务运行实例列表
   * @private
   */
  private async fillChildren(runInstances: TaskRunInstance[]) {
    const existingPid = this.parentMap.keys().toArray()
    const notExistingPid = [
      ...new Set(
        runInstances
          .map((runInstance) => {
            if (NotNullish(runInstance.parentId) && runInstance.parentId !== 0 && !existingPid.includes(runInstance.parentId)) {
              return runInstance.parentId
            } else {
              return undefined
            }
          })
          .filter(NotNullish)
      )
    ]
    let parentList: Task[] = []
    if (ArrayNotEmpty(notExistingPid)) {
      parentList = await this.taskService.listByIds(notExistingPid)
    }
    if (ArrayNotEmpty(parentList)) {
      const allChildren = await this.taskService.listChildrenByParentsTask(notExistingPid)
      const pidChildrenMap: Map<number, Task[]> = Map.groupBy(allChildren, (child) => child.pid as number)
      const pidChildrenInstMap: object = lodash.keyBy(runInstances, 'taskId')
      // 查询已经下载过的作品列表
      const siteIdAndSiteWorksIds = allChildren.map((notExistsTask) => {
        return {
          siteId: notExistsTask.siteId as number,
          siteWorksId: notExistsTask.siteWorksId as string
        }
      })
      const existsWorksList = await this.worksService.listBySiteIdAndSiteWorksIds(siteIdAndSiteWorksIds)
      for (const parentInfo of parentList) {
        AssertNotNullish(parentInfo.id, 'TaskQueue', `添加父任务${parentInfo.id}失败，父任务id不能为空`)
        AssertNotNullish(parentInfo.status, 'TaskQueue', `添加父任务${parentInfo.id}失败，父任务状态不能为空`)
        const tempChildren = pidChildrenMap.get(parentInfo.id)
        if (ArrayNotEmpty(tempChildren)) {
          const tempInstList = tempChildren.map((tempChild) => {
            const tempInst = pidChildrenInstMap[String(tempChild.id)]
            if (NotNullish(tempInst)) {
              // 处理已经添加到taskMap的
              return tempInst as TaskRunInstance
            } else {
              // 处理没有添加到taskMap的
              // 判断这个作品是否已经保存过
              const resSaveSuspended = NotNullish(tempChild.pendingResourceId)
              const infoSaved = Array.prototype.some(
                (existsTask) => tempChild.siteId === existsTask.siteId && tempChild.siteWorksId === existsTask.siteWorksId,
                existsWorksList
              )
              let localWorksId: number | undefined
              if (infoSaved) {
                AssertNotNullish(existsWorksList[0].id)
                localWorksId = existsWorksList[0].id
              }
              const tempRunInstance = new TaskRunInstance(
                tempChild.id as number,
                tempChild.pid,
                tempChild.status as TaskStatusEnum,
                tempChild,
                infoSaved,
                resSaveSuspended,
                this.taskService,
                this.pluginLoader,
                new ResourceWriter(),
                localWorksId
              )
              this.inletTask(tempRunInstance, tempChild)
              return tempRunInstance
            }
          })
          const parentInst = new ParentRunInstance(parentInfo.id, parentInfo.status, tempInstList)
          this.inletParentTask(parentInst, parentInfo)
        }
      }
    }
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
        const children = Array.from(parentRunInstance.children.values())
        let newStatus: TaskStatusEnum = parentRunInstance.status
        let created = 0
        let processing = 0
        let waitingUserInput = 0
        let waiting = 0
        let paused = 0
        let finished = 0
        let failed = 0
        for (const child of children) {
          if (child.status === TaskStatusEnum.PROCESSING) {
            processing++
            break
          }
          if (child.status === TaskStatusEnum.CREATED) {
            created++
            continue
          }
          if (child.status === TaskStatusEnum.WAITING_USER_INPUT) {
            waitingUserInput++
            continue
          }
          if (child.status === TaskStatusEnum.WAITING) {
            waiting++
            continue
          }
          if (child.status === TaskStatusEnum.PAUSE) {
            paused++
            continue
          }
          if (child.status === TaskStatusEnum.FINISHED) {
            finished++
            continue
          }
          if (child.status === TaskStatusEnum.FAILED) {
            failed++
          }
        }

        if (processing > 0) {
          newStatus = TaskStatusEnum.PROCESSING
        } else if (waiting > 0) {
          newStatus = TaskStatusEnum.WAITING
        } else if (waitingUserInput > 0) {
          newStatus = TaskStatusEnum.WAITING_USER_INPUT
        } else if (paused > 0) {
          newStatus = TaskStatusEnum.PAUSE
        } else if (finished > 0 && finished < children.length) {
          newStatus = TaskStatusEnum.PARTLY_FINISHED
        } else if (finished > 0) {
          newStatus = TaskStatusEnum.FINISHED
        } else if (failed > 0) {
          newStatus = TaskStatusEnum.FAILED
        } else if (created > 0) {
          newStatus = TaskStatusEnum.CREATED
        } else {
          LogUtil.warn(
            'TaskQueue',
            `刷新父任务状态失败，created: ${created} processing: ${processing} waiting: ${waiting} paused: ${paused} finished: ${finished} failed: ${failed}`
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
        if (processing === 0 && paused === 0 && waiting === 0 && waitingUserInput === 0) {
          this.removeParentTask(id)
        } else if (NotNullish(parentRunInstance.clearTimeoutId)) {
          clearTimeout(parentRunInstance.clearTimeoutId)
        }
      }
    }
    this.pushParentTaskSchedule().catch((error) => LogUtil.error(this.constructor.name, '推送父任务信息到渲染进程失败，', error))
  }

  /**
   * 任务插入到任务池中
   * @param taskRunInstance 任务运行实例
   * @param task 任务信息
   * @private
   */
  private async inletTask(taskRunInstance: TaskRunInstance, task: Task) {
    // 清除原有的删除定时器
    const oldInst = this.taskMap.get(taskRunInstance.taskId)
    if (NotNullish(oldInst)) {
      clearTimeout(oldInst.clearTimeoutId)
    }
    this.taskMap.set(taskRunInstance.taskId, taskRunInstance)
    // 任务运行信息推送到渲染进程
    const taskProgressDTO = new TaskProgressDTO()
    CopyIgnoreUndefined(taskProgressDTO, task)
    // 补充taskProgressDTO的站点名称，否则完成任务时的提示中，站点名称显示undefined
    const siteId = taskProgressDTO.siteId
    if (NotNullish(siteId)) {
      taskProgressDTO.siteName = (await this.getSite(siteId))?.siteName
    }
    SendMsgToRender(RenderEvent.TASK_STATUS_SET_TASK, [taskProgressDTO])
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
   * @param taskIds 子任务id
   * @private
   */
  private removeTask(taskIds: number[]) {
    const delayedRemoval = (runInstance: TaskRunInstance, delay: number, tried: number) => {
      runInstance.clearTimeoutId = setTimeout(() => {
        if (runInstance.taskChangeStored) {
          this.taskMap.delete(runInstance.taskId)
          // 任务状态推送到渲染进程
          SendMsgToRender(RenderEvent.TASK_STATUS_REMOVE_TASK, [runInstance.taskId])
        } else {
          LogUtil.info(this.constructor.name, `任务${runInstance.taskId}移除失败，任务信息的更新尚未保存，已尝试${tried}次`)
          delayedRemoval(runInstance, delay, tried++)
        }
      }, delay)
    }
    for (let i = 0; i < taskIds.length; i++) {
      const taskId = taskIds[i]
      const runInstance = this.taskMap.get(taskId)
      if (NotNullish(runInstance)) {
        delayedRemoval(runInstance, 5000, 0)
      } else {
        LogUtil.warn(this.constructor.name, `移除任务运行实例失败，任务运行实例不存在，taskId: ${taskId}`)
      }
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
      const childrenIds = runInstance.children.keys().toArray()
      if (ArrayNotEmpty(childrenIds)) {
        this.removeTask(childrenIds)
      }
      runInstance.clearTimeoutId = setTimeout(() => {
        this.parentMap.delete(taskId)
        // 任务状态推送到渲染进程
        SendMsgToRender(RenderEvent.PARENT_TASK_STATUS_REMOVE_PARENT_TASK, [taskId])
      }, 5000)
    } else {
      LogUtil.warn(this.constructor.name, `移除父任务运行实例失败，父任务运行实例不存在，taskId: ${taskId}`)
    }
  }

  /**
   * 获取下一个运行实例
   * @private
   */
  private getNext(): TaskRunInstance | undefined {
    // 如果没有更多的数组或当前数组已经处理完毕，尝试切换到下一个数组
    while (ArrayNotEmpty(this.runInstBuffer)) {
      if (this.currentBufferIndex >= this.runInstBuffer[0].length) {
        this.runInstBuffer.shift()
        this.currentBufferIndex = 0
      } else {
        break
      }
    }

    // 如果所有数组都已经处理完毕，等待新数据推入数据源
    if (ArrayIsEmpty(this.runInstBuffer)) {
      return
    }

    // 从当前数组中读取一个元素返回
    return this.runInstBuffer[0][this.currentBufferIndex++]
  }

  private handleReplaceRefuse(taskRunInstance: TaskRunInstance): void {
    this.taskPersistStream.addTask([taskRunInstance])
  }

  /**
   * 获取站点信息
   * @param siteId 站点id
   * @private
   */
  private async getSite(siteId: number): Promise<Site | undefined> {
    let result = this.siteCache.get(siteId)
    if (IsNullish(result)) {
      result = await this.siteService.getById(siteId)
      if (NotNullish(result)) {
        this.siteCache.set(siteId, result)
      }
    }
    return result
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

enum ConfirmReplaceResStateEnum {
  UNKNOWN = 0,
  CONFIRM = 1,
  REFUSE = 2
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
  public resourceWriter: ResourceWriter
  /**
   * 父任务id（为0时表示没有父任务）
   */
  public parentId: number
  /**
   * 作品信息是否已经保存
   */
  public infoSaved: boolean
  /**
   * 资源保存是否中断
   */
  public resSaveSuspended: boolean
  /**
   * 是否正在流中
   */
  public inStream: boolean
  /**
   * 任务信息的修改是否已经保存到数据库
   */
  public taskChangeStored: boolean
  /**
   * 用户是否确认替换原有资源
   */
  public confirmReplaceRes: ConfirmReplaceResStateEnum
  /**
   * 作品id
   */
  public worksId: number | undefined
  /**
   * Task服务
   * @private
   */
  private taskService: TaskService
  /**
   * 任务信息
   * @private
   */
  private readonly taskInfo: Task
  /**
   * 插件加载器
   * @private
   */
  private readonly pluginLoader: PluginLoader<TaskHandler>
  /**
   * 是否出现错误
   * @private
   */
  private errorOccurred: boolean
  /**
   * 异常信息
   * @private
   */
  private error: Error | undefined

  constructor(
    taskId: number,
    parentId: number | null | undefined,
    status: TaskStatusEnum,
    taskInfo: Task,
    worksInfoSaved: boolean,
    resSaveSuspended: boolean,
    taskService: TaskService,
    pluginLoader: PluginLoader<TaskHandler>,
    resourceWriter: ResourceWriter,
    localWorksId?: number
  ) {
    super(taskId, status, false)
    this.resourceWriter = resourceWriter
    this.taskInfo = taskInfo
    this.taskChangeStored = true
    this.confirmReplaceRes = ConfirmReplaceResStateEnum.UNKNOWN
    this.taskService = taskService
    this.pluginLoader = pluginLoader
    this.parentId = IsNullish(parentId) ? 0 : parentId
    this.infoSaved = IsNullish(worksInfoSaved) ? false : worksInfoSaved
    this.resSaveSuspended = IsNullish(resSaveSuspended) ? false : resSaveSuspended
    this.inStream = false
    this.worksId = localWorksId
    this.errorOccurred = false
    this.error = undefined
  }

  public isErrorOccurred(): boolean {
    return this.errorOccurred
  }

  public getError(): Error | undefined {
    return this.error
  }

  public changeStatus(status: TaskStatusEnum): void {
    super.changeStatus(status, false)
  }

  public async saveInfo(): Promise<void> {
    try {
      const task = await this.taskService.getById(this.taskId)
      AssertNotNullish(task, 'TaskQueue', `保存任务${this.taskId}的信息失败，任务id无效`)
      this.worksId = await this.taskService.saveWorksInfo(task, this.pluginLoader)
    } catch (error) {
      this.errorOccurred = true
      this.error = error as Error
      throw error
    }
  }

  public preStart() {
    if (
      this.status === TaskStatusEnum.CREATED ||
      this.status === TaskStatusEnum.FINISHED ||
      this.status === TaskStatusEnum.FAILED ||
      this.status === TaskStatusEnum.PAUSE ||
      this.status === TaskStatusEnum.WAITING_USER_INPUT
    ) {
      try {
        this.changeStatus(TaskStatusEnum.WAITING)
        if (this.status !== TaskStatusEnum.PAUSE) {
          this.resourceWriter = new ResourceWriter()
        }
      } catch (error) {
        this.errorOccurred = true
        this.error = error as Error
        throw error
      }
    } else {
      this.errorOccurred = true
      const error = new Error(`无法预启动任务${this.taskId}，当前状态不支持，taskStatus: ${this.status}`)
      this.error = error
      throw error
    }
  }

  public waitUserInput() {
    if (
      this.status === TaskStatusEnum.CREATED ||
      this.status === TaskStatusEnum.FINISHED ||
      this.status === TaskStatusEnum.FAILED ||
      this.status === TaskStatusEnum.PAUSE
    ) {
      try {
        this.changeStatus(TaskStatusEnum.WAITING_USER_INPUT)
      } catch (error) {
        this.errorOccurred = true
        this.error = error as Error
        throw error
      }
    } else {
      this.errorOccurred = true
      const error = new Error(`等待用户输入失败${this.taskId}，当前状态不支持，taskStatus: ${this.status}`)
      this.error = error
      throw error
    }
  }

  public pause(): Promise<boolean> {
    if (this.status === TaskStatusEnum.PROCESSING || this.status === TaskStatusEnum.WAITING) {
      try {
        let result: Promise<boolean> = Promise.resolve(true)
        // 对于已开始的任务，调用taskService的pauseTask进行暂停
        if (this.processing()) {
          result = this.taskService.pauseTask(this.taskInfo, this.pluginLoader, this.resourceWriter)
        }
        // 判断是否已经在数据库中创建资源信息
        if (NotNullish(this.taskInfo.pendingResourceId)) {
          this.resSaveSuspended = true
        }
        this.changeStatus(TaskStatusEnum.PAUSE)
        LogUtil.info(this.constructor.name, `任务${this.taskId}暂停`)
        return result
      } catch (error) {
        this.errorOccurred = true
        this.error = error as Error
        throw error
      }
    } else {
      this.errorOccurred = true
      const error = new Error(`无法暂停任务${this.taskId}，当前状态不支持，taskStatus: ${this.status}`)
      this.error = error
      throw error
    }
  }

  public stop() {
    if (this.status === TaskStatusEnum.PROCESSING || this.status === TaskStatusEnum.WAITING || this.status === TaskStatusEnum.PAUSE) {
      try {
        let result: Promise<boolean> = Promise.resolve(true)
        // 对于已开始的任务，调用taskService的pauseTask进行暂停
        if (this.processing()) {
          result = this.taskService.stopTask(this.taskInfo, this.pluginLoader, this.resourceWriter)
        }
        this.changeStatus(TaskStatusEnum.PAUSE)
        LogUtil.info(this.constructor.name, `任务${this.taskId}暂停`)
        return result
      } catch (error) {
        this.errorOccurred = true
        this.error = error as Error
        throw error
      }
    } else {
      this.errorOccurred = true
      const error = new Error(`无法停止任务${this.taskId}，当前状态不支持，taskStatus: ${this.status}`)
      this.error = error
      throw error
    }
  }

  public async process(): Promise<TaskProcessResponseDTO> {
    if (this.status === TaskStatusEnum.WAITING) {
      try {
        this.changeStatus(TaskStatusEnum.PROCESSING)
        AssertNotNullish(this.taskInfo, 'TaskQueue', `保存任务${this.taskId}的资源失败，任务id无效`)
        AssertNotNullish(this.worksId, 'TaskQueue', `保存任务${this.taskId}的资源失败，作品id不能为空`)

        const resourceWriter = IsNullish(this.resourceWriter) ? new ResourceWriter() : this.resourceWriter

        let result: Promise<TaskProcessResponseDTO>
        if (this.resSaveSuspended && this.taskInfo.continuable) {
          result = this.taskService.resumeTask(this.taskInfo, this.worksId, this.pluginLoader, resourceWriter)
        } else {
          result = this.taskService.startTask(this.taskInfo, this.worksId, this.pluginLoader, resourceWriter)
        }
        const saveResult = await result
        this.changeStatus(saveResult.taskStatus)
        if (saveResult.taskStatus === TaskStatusEnum.FAILED) {
          this.errorOccurred = true
          this.error = saveResult.error
        }
        return saveResult
      } catch (error) {
        this.errorOccurred = true
        this.failed()
        this.error = error as Error
        throw error
      }
    } else {
      this.errorOccurred = true
      const error = new Error(`无法开始任务${this.taskId}，当前状态不支持，taskStatus: ${this.status}`)
      this.error = error
      throw error
    }
  }

  public failed() {
    try {
      this.changeStatus(TaskStatusEnum.FAILED)
    } catch (error) {
      this.errorOccurred = true
      throw error
    }
  }

  public getTaskInfo(): Task {
    return this.taskInfo
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

  constructor(taskId: number, status: TaskStatusEnum, children?: (TaskRunInstance | TaskStatus)[]) {
    super(taskId, status, true)
    if (ArrayIsEmpty(children)) {
      this.children = new Map<number, TaskRunInstance | TaskStatus>()
    } else {
      this.children = new Map<number, TaskRunInstance | TaskStatus>(children.map((child) => [child.taskId, child]))
    }
  }
}

/**
 * 任务队列入口流
 */
class TaskQueueEntrance extends Readable {
  /**
   * 获取下一个待处理的任务的函数
   * @private
   */
  private readonly getNext: () => TaskRunInstance | undefined

  /**
   * 处理用户拒绝替换的函数
   * @private
   */
  private readonly handleReplaceRefuse: (taskRunInstance: TaskRunInstance) => void

  /**
   * 刷新父任务状态
   * @private
   */
  private readonly refreshParentState: (pids: number[]) => Promise<void>

  /**
   * 等待响应的任务id-运行实例map
   * @private
   */
  private readonly waitingMap: Map<number, TaskRunInstance>

  /**
   * 已响应的运行实例列表
   * @private
   */
  private readonly resolvedList: TaskRunInstance[]

  /**
   * 下游是否正在等待
   * @private
   */
  private downstreamWaiting: boolean

  /**
   * 资源服务
   * @private
   */
  private resourceService: ResourceService

  constructor(
    getNext: () => TaskRunInstance | undefined,
    resService: ResourceService,
    refreshParent: (pids: number[]) => Promise<void>,
    handleReplaceRefuse: (taskRunInstance: TaskRunInstance) => void
  ) {
    super({ objectMode: true })
    this.getNext = getNext
    this.refreshParentState = refreshParent
    this.handleReplaceRefuse = handleReplaceRefuse
    this.waitingMap = new Map()
    this.resolvedList = []
    this.downstreamWaiting = false
    this.resourceService = resService

    // 收到确认替换的响应事件后调用对应的resolve函数
    Electron.ipcMain.on('task-queue-resource-replace-confirm-echo', (_event, receivedIds: number[], confirmed: boolean) => {
      receivedIds.map((taskId: number) => {
        const taskRunInstance = this.waitingMap.get(taskId)
        if (NotNullish(taskRunInstance)) {
          taskRunInstance.confirmReplaceRes = confirmed ? ConfirmReplaceResStateEnum.CONFIRM : ConfirmReplaceResStateEnum.REFUSE
          this.waitingMap.delete(taskId)
          this.resolvedList.push(taskRunInstance)
        }
      })
      if (this.downstreamWaiting) {
        this.processNext()
      }
    })
  }

  /**
   * 手动开始
   */
  public async manualStart(): Promise<boolean> {
    return this.processNext()
  }

  async _read(): Promise<boolean> {
    return this.processNext()
  }

  /**
   * 进行摧毁前的准备
   */
  public preDestroy(): void {
    if (this.waitingMap.size === 0) {
      this.push(null)
    }
    Electron.ipcMain.removeAllListeners('task-queue-resource-replace-confirm-echo')
    this.waitingMap.values().forEach((runInstance) => {
      runInstance.confirmReplaceRes = ConfirmReplaceResStateEnum.REFUSE
      this.push(runInstance)
    })
  }

  /**
   * 判断是否已有资源
   * @param taskRunInstance
   * @private
   */
  private async isResourceSaved(taskRunInstance: TaskRunInstance): Promise<boolean> {
    if (NotNullish(taskRunInstance.worksId)) {
      return this.resourceService.hasActiveByWorksId(taskRunInstance.worksId)
    } else {
      return false
    }
  }

  /**
   * 处理下一个对象
   * @private
   */
  private async processNext(): Promise<boolean> {
    let taskRunInstance: TaskRunInstance | undefined = undefined
    try {
      while (true) {
        taskRunInstance = this.getNext()
        if (IsNullish(taskRunInstance)) {
          taskRunInstance = this.resolvedList.shift()
          if (IsNullish(taskRunInstance)) {
            break
          }
        }
        if (taskRunInstance.resSaveSuspended) {
          // 如果资源保存是中断的，则直接推入下游，不用判断是否保存过资源
          taskRunInstance.preStart()
          return this.push(taskRunInstance)
        } else if (taskRunInstance.confirmReplaceRes === ConfirmReplaceResStateEnum.CONFIRM) {
          // 如果没有中断，则判断用户是否确认替换资源
          taskRunInstance.preStart()
          return this.push(taskRunInstance)
        } else if (taskRunInstance.confirmReplaceRes === ConfirmReplaceResStateEnum.REFUSE) {
          // 用户拒绝替换的情况下这个运行实例不推入下游，是否替换资源的标记重置，返回true
          taskRunInstance.inStream = false
          taskRunInstance.changeStatus(TaskStatusEnum.FINISHED)
          taskRunInstance.confirmReplaceRes = ConfirmReplaceResStateEnum.UNKNOWN
          this.refreshParentState([taskRunInstance.parentId]).catch((error) =>
            LogUtil.error(this.constructor.name, '刷新父任务状态失败', error)
          )
          this.handleReplaceRefuse(taskRunInstance)
        } else {
          // 如果用户未确认过是否替换，判断是否保存过资源，保存过就询问用户是否替换
          const resourceSaved = await this.isResourceSaved(taskRunInstance)
          if (resourceSaved) {
            this.sendReplaceConfirmToMainWindow(taskRunInstance, String(taskRunInstance.getTaskInfo().taskName))
            taskRunInstance.waitUserInput()
            this.refreshParentState([taskRunInstance.parentId]).catch((error) =>
              LogUtil.error(this.constructor.name, '刷新父任务状态失败', error)
            )
          } else {
            taskRunInstance.preStart()
            this.refreshParentState([taskRunInstance.parentId]).catch((error) =>
              LogUtil.error(this.constructor.name, '刷新父任务状态失败', error)
            )
            return this.push(taskRunInstance)
          }
        }
      }
      this.downstreamWaiting = true
      return true
    } catch (error) {
      this.emit('entry-failed', error, taskRunInstance)
      return true
    }
  }

  /**
   * 在主页面弹出是否替换原有资源的弹窗
   * @param taskRunInstance 任务运行实例
   * @param msg 弹窗的消息
   * @private
   */
  private sendReplaceConfirmToMainWindow(taskRunInstance: TaskRunInstance, msg: string): void {
    this.waitingMap.set(taskRunInstance.taskId, taskRunInstance)
    GlobalVar.get(GlobalVars.MAIN_WINDOW).webContents.send('task-queue-resource-replace-confirm', {
      taskId: taskRunInstance.taskId,
      msg: msg
    })
  }
}

/**
 * 作品信息保存流
 */
class WorksInfoSaveStream extends Transform {
  constructor() {
    super({ objectMode: true, highWaterMark: 64 }) // 设置为对象模式
  }

  async _transform(chunk: TaskRunInstance, _encoding: string, callback: TransformCallback): Promise<void> {
    chunk.taskChangeStored = false
    if (chunk.infoSaved) {
      this.push(chunk)
      callback()
      return
    }
    chunk.infoSaved = true

    const task: Task | undefined = new Task()
    task.id = chunk.taskId
    let alreadyCallback = false
    try {
      const saveInfoPromise = chunk.saveInfo()
      callback()
      alreadyCallback = true
      await saveInfoPromise
      if (chunk.paused()) {
        chunk.inStream = false
      } else {
        this.push(chunk)
      }
    } catch (error) {
      chunk.inStream = false
      chunk.infoSaved = false
      const msg = `保存任务${chunk.taskId}的作品信息失败`
      const newError = new Error()
      if ((error as { code: string }).code === 'SQLITE_CONSTRAINT_UNIQUE') {
        newError.message = msg + '，任务保存的作品已经存在'
      } else {
        newError.message = msg + '，' + (error as { message: string }).message
      }
      LogUtil.error(this.constructor.name, newError)
      this.emit('save-failed', newError, chunk)
      if (!alreadyCallback) {
        callback()
      }
    }
  }
}

/**
 * 资源保存流
 */
class ResourceSaveStream extends Transform {
  /**
   * 资源保存队列
   * @private
   */
  private resSaveQueue: QueueObject<TaskRunInstance>

  /**
   * 队列是否饱和
   * @private
   */
  private queueFull: boolean

  /**
   * 被阻止的callback
   * @description因并行下载达到上限而被阻止的callback
   * @private
   */
  private readonly blockedCallback: ((error?: Error | null, data?: unknown) => void)[]

  /**
   * 刷新父任务状态
   * @private
   */
  private readonly refreshParentStatus: (pids: number[]) => Promise<void>

  constructor(maxParallel: number, refreshParentStatus: (pids: number[]) => Promise<void>) {
    super({ objectMode: true, highWaterMark: 64, autoDestroy: false }) // 设置为对象模式
    const finalMaxParallel = maxParallel >= 1 ? maxParallel : 1
    this.queueFull = false
    this.resSaveQueue = queue(async (chunk: TaskRunInstance) => this.processTask(chunk), finalMaxParallel)
    this.blockedCallback = []
    this.resSaveQueue.saturated(() => (this.queueFull = true))
    this.resSaveQueue.unsaturated(() => {
      this.queueFull = false
      if (ArrayNotEmpty(this.blockedCallback)) {
        while (this.blockedCallback.length > 0 && !this.queueFull) {
          this.blockedCallback.shift()?.()
        }
      }
    })
    this.refreshParentStatus = refreshParentStatus
  }

  public updateMaxParallel(newNum: number): void {
    this.resSaveQueue.concurrency = newNum
  }

  private async processTask(runInstance: TaskRunInstance): Promise<void> {
    // 开始之前检查当前的状态
    if (runInstance.paused()) {
      runInstance.inStream = false
      return
    }
    // 发出任务开始保存的事件
    this.refreshParentStatus([runInstance.parentId]).catch((error) =>
      LogUtil.error(this.constructor.name, '刷新父任务状态失败', error)
    )

    // 开始任务
    try {
      const saveResult = await runInstance.process()
      runInstance.inStream = false
      if (TaskStatusEnum.PAUSE !== saveResult.taskStatus) {
        this.push(runInstance)
        // 下载完成后，是否替换资源的标记重置
        runInstance.confirmReplaceRes = ConfirmReplaceResStateEnum.UNKNOWN
      }
    } catch (error) {
      runInstance.inStream = false
      this.emit('save-failed', error, runInstance)
    }
  }

  async _transform(chunk: TaskRunInstance, _encoding: string, callback: TransformCallback): Promise<void> {
    this.resSaveQueue.push(chunk).catch((error) => {
      this.emit('error', error, chunk)
    })
    if (this.queueFull) {
      this.blockedCallback.push(callback)
    } else {
      callback()
    }
  }
}

/**
 * 任务信息保存流
 */
class TaskPersistStream extends Writable {
  /**
   * 任务服务
   * @private
   */
  private taskService: TaskService
  /**
   * 资源保存结果列表
   * @private
   */
  private readonly runInstances: TaskRunInstance[]
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
  private readonly batchUpdateBuffer: TaskRunInstance[]

  constructor() {
    super({ objectMode: true, highWaterMark: 10 })
    this.taskService = new TaskService()
    this.runInstances = []
    this.looping = false
    this.writeable = true
    this.batchUpdateBuffer = []
    this.on('drain', () => {
      this.writeable = true
      this.loopSaveResult()
    })
  }

  async _write(chunk: TaskRunInstance[] | TaskRunInstance, _encoding: string, callback: TransformCallback): Promise<void> {
    try {
      if (Array.isArray(chunk)) {
        this.batchUpdateBuffer.push(...chunk)
      } else {
        this.batchUpdateBuffer.push(chunk)
      }
      if (this.batchUpdateBuffer.length >= 100 || ArrayIsEmpty(this.runInstances)) {
        const aBatch = this.batchUpdateBuffer.splice(0, this.batchUpdateBuffer.length)
        const temp = aBatch.map(this.createTaskFromRunInst)
        await this.taskService.updateBatchById(temp)
        aBatch.forEach((runInst) => (runInst.taskChangeStored = true))
      }
    } catch (error) {
      LogUtil.error(this.constructor.name, error)
    } finally {
      callback()
    }
  }

  /**
   * 添加运行实例
   * @param tasks
   */
  public addTask(tasks: TaskRunInstance[]) {
    this.runInstances.push(...tasks)
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
    const deleteCount = Math.min(100, this.runInstances.length)
    const next = this.runInstances.splice(0, deleteCount)
    if (ArrayNotEmpty(next)) {
      return this.write(next)
    } else {
      return false
    }
  }

  /**
   * 根据运行实例生成更新用的任务信息
   * @param runInstance 运行实例
   * @private
   */
  private createTaskFromRunInst(runInstance: TaskRunInstance) {
    const tempTask = new Task(runInstance.getTaskInfo())
    tempTask.id = runInstance.taskId
    // 如果出现异常并且是失败之外的状态，忽略这次对状态的修改，由TaskQueue类处理后再推入这个流
    if (!(runInstance.isErrorOccurred() && runInstance.status !== TaskStatusEnum.FAILED)) {
      tempTask.status = runInstance.status
    }
    if (TaskStatusEnum.FINISHED === tempTask.status) {
      tempTask.pendingResourceId = null
    }
    if (TaskStatusEnum.FAILED === tempTask.status) {
      tempTask.pendingResourceId = null
      tempTask.errorMessage = runInstance.getError()?.message
    }
    return tempTask
  }
}
