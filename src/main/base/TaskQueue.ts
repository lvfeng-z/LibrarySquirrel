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
import TaskTreeDTO from '../model/dto/TaskTreeDTO.js'
import TaskProgressDTO from '../model/dto/TaskProgressDTO.js'
import lodash from 'lodash'
import { queue, QueueObject } from 'async'

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
  private readonly taskService: TaskService

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

  constructor() {
    this.taskMap = new Map()
    this.parentMap = new Map()
    this.taskService = new TaskService()
    this.worksService = new WorksService()
    this.pluginLoader = new PluginLoader(new TaskHandlerFactory())
    this.closed = false
    this.taskSchedulePushing = false
    this.parentSchedulePushing = false

    this.inletStream = new ReadableTaskRunInstance()
    this.taskInfoStream = new TaskInfoStream()
    // 读取设置中的最大并行数
    const maxParallelImportInSettings = GlobalVar.get(GlobalVars.SETTINGS).store.importSettings.maxParallelImport
    this.taskResourceStream = new TaskResourceStream(maxParallelImportInSettings)
    this.taskStatusChangeStream = new TaskStatusChangeStream()

    // 初始化流
    this.readyToClose = new Promise<void>((resolve, reject) => {
      const handleError = (error: Error, taskRunInstance?: TaskRunInstance) => {
        LogUtil.error('TaskQueue', `处理任务失败，taskId: ${taskRunInstance?.taskId}，error: ${error.message}`)
        if (NotNullish(taskRunInstance)) {
          taskRunInstance.failed()
          this.taskStatusChangeStream.addTask([taskRunInstance])
          if (IsNullish(taskRunInstance.parentId)) {
            // 单个的任务直接清除
            this.removeTask([taskRunInstance.taskId])
          } else {
            // 有父任务的刷新父任务状态
            this.refreshParentStatus([taskRunInstance.parentId])
          }
        }
      }
      // 信息保存流
      this.taskInfoStream.on('error', (error: Error, taskRunInstance: TaskRunInstance) => {
        this.inletStream.unpipe(this.taskInfoStream)
        this.inletStream.pipe(this.taskInfoStream)
        handleError(error, taskRunInstance)
      })
      const taskInfoStreamDestroyed = new Promise<void>((resolve) =>
        this.taskInfoStream.once('end', () => {
          this.taskInfoStream.destroy()
          LogUtil.info(this.constructor.name, '任务信息保存流已销毁')
          resolve()
        })
      )
      // 资源保存流
      this.taskResourceStream.on('error', (error: Error, taskRunInstance: TaskRunInstance) => {
        this.taskInfoStream.unpipe(this.taskResourceStream)
        this.taskInfoStream.pipe(this.taskResourceStream)
        handleError(error, taskRunInstance)
      })
      this.taskResourceStream.on('data', (taskRunInstance: TaskRunInstance) => {
        if (taskRunInstance.status === TaskStatusEnum.FINISHED) {
          taskRunInstance.resSaveSuspended = false
          LogUtil.info('TaskQueue', `任务${taskRunInstance.taskId}完成`)
        } else if (taskRunInstance.status === TaskStatusEnum.FAILED) {
          taskRunInstance.resSaveSuspended = false
          LogUtil.info('TaskQueue', `任务${taskRunInstance.taskId}失败`)
        }
        if (IsNullish(taskRunInstance.parentId)) {
          // 单个的任务直接清除
          this.removeTask([taskRunInstance.taskId])
        } else {
          // 有父任务的刷新父任务状态
          this.refreshParentStatus([taskRunInstance.parentId])
        }
      })
      this.taskResourceStream.on('saveStart', (taskRunInstance: TaskRunInstance) => {
        this.taskStatusChangeStream.addTask([taskRunInstance])
        this.refreshParentStatus([taskRunInstance.parentId])
      })
      this.taskResourceStream.on('saveFailed', handleError)
      this.taskResourceStream.on('finish', () => LogUtil.info('TaskQueue', '任务队列完成'))
      const taskResourceStreamDestroyed = new Promise<void>((resolve) =>
        this.taskResourceStream.once('end', () => {
          this.taskResourceStream.destroy()
          LogUtil.info(this.constructor.name, '任务资源保存流已销毁')
          resolve()
        })
      )
      // 保存结果处理流
      this.taskStatusChangeStream.on('error', (error: Error, taskRunInstance: TaskRunInstance) => {
        this.taskResourceStream.unpipe(this.taskStatusChangeStream)
        this.taskResourceStream.pipe(this.taskStatusChangeStream)
        handleError(error, taskRunInstance)
      })
      this.taskStatusChangeStream.on('data', () => {})
      const taskStatusChangeStreamDestroyed = new Promise<void>((resolve) =>
        this.taskStatusChangeStream.once('close', () => {
          this.taskStatusChangeStream.destroy()
          LogUtil.info(this.constructor.name, '任务结果保存流已销毁')
          resolve()
        })
      )

      // 建立管道
      this.inletStream.pipe(this.taskInfoStream)
      this.taskInfoStream.pipe(this.taskResourceStream)
      this.taskResourceStream.pipe(this.taskStatusChangeStream)

      Promise.all([taskInfoStreamDestroyed, taskResourceStreamDestroyed, taskStatusChangeStreamDestroyed])
        .then(() => resolve())
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
      this.refreshParentStatus(Array.from(parentIdWaitingRefresh))
    } else if (taskOperation === TaskOperation.STOP) {
      await this.stopTask(tasks)
      // 清除单个的任务
      const singleTasks = tasks.filter((task) => IsNullish(task.pid)).map((task) => task.id as number)
      this.removeTask(singleTasks)
      // 刷新父任务
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
        total: taskRunInstance.taskWriter.bytesSum,
        finished: IsNullish(taskRunInstance.taskWriter.writable) ? 0 : taskRunInstance.taskWriter.writable.bytesWritten
      })
    }
    if (TaskStatusEnum.PROCESSING === taskRunInstance.status || TaskStatusEnum.PAUSE === taskRunInstance.status) {
      return new TaskScheduleDTO({
        id: taskId,
        pid: taskRunInstance.parentId,
        status: taskRunInstance.status,
        total: taskRunInstance.taskWriter.bytesSum,
        finished: IsNullish(taskRunInstance.taskWriter.writable) ? 0 : taskRunInstance.taskWriter.writable.bytesWritten
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
          if (TaskStatusEnum.PROCESSING === taskRunInstance.status) {
            return new TaskScheduleDTO({
              id: taskId,
              pid: taskRunInstance.parentId,
              status: taskRunInstance.status,
              total: taskRunInstance.taskWriter.bytesSum,
              finished: IsNullish(taskRunInstance.taskWriter.writable) ? 0 : taskRunInstance.taskWriter.writable.bytesWritten
            })
          }
          return undefined
        })
        .filter(NotNullish)
      if (this.closed) {
        break
      }
      SendMsgToRender(RenderEvent.TASK_STATUS_UPDATE_SCHEDULE, taskScheduleList)
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
    await this.inletStream.preDestroy()
    this.inletStream.destroy()
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
    this.taskResourceStream.updateMaxParallel(newNum)
  }

  /**
   * 开始处理任务
   * @param tasks 需要处理的任务
   * @private
   */
  private async processTask(tasks: Task[]) {
    const changeStatusNeededList: TaskRunInstance[] = [] // 用于更新数据库中任务的数据
    const runInstances: TaskRunInstance[] = [] // 需要处理的运行实例
    const existsTasks: TaskRunInstance[] = []
    const notExistsTasks: Task[] = []
    tasks.forEach((task) => {
      const taskRunInstance = this.taskMap.get(task.id as number)
      if (NotNullish(taskRunInstance)) {
        existsTasks.push(taskRunInstance)
      } else {
        notExistsTasks.push(task)
      }
    })

    for (const taskRunInstance of existsTasks) {
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
        infoSaved = Array.prototype.some(
          (existsTask) => task.siteId === existsTask.siteId && task.siteWorksId === existsTask.siteWorksId,
          existsWorksList
        )
        if (infoSaved) {
          AssertNotNullish(existsWorksList[0].id)
          localWorksId = existsWorksList[0].id
        }
        const taskRunInstance = new TaskRunInstance(
          task.id as number,
          task.pid,
          TaskStatusEnum.WAITING,
          task,
          infoSaved,
          resSaveSuspended,
          this.taskService,
          this.pluginLoader,
          new TaskWriter(),
          localWorksId
        )
        task.status = TaskStatusEnum.WAITING
        taskRunInstance.inStream = true
        runInstances.push(taskRunInstance)
        this.inletTask(taskRunInstance, task)
        changeStatusNeededList.push(taskRunInstance)
      }
    }

    // 所有任务设置为等待中
    this.taskStatusChangeStream.addTask(changeStatusNeededList)
    // 刷新父任务状态
    await this.fillChildren(runInstances)
    this.refreshParentStatus(runInstances.map((runInstance) => runInstance.parentId))

    this.inletStream.addArray(runInstances)
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
        LogUtil.error('TaskQueue', `无法暂停任务${taskId}，队列中没有这个任务`)
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
    this.taskStatusChangeStream.addTask(taskSaveResultList)
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
        await taskRunInstance.stop()
        if (!taskRunInstance.over()) {
          taskSaveResultList.push(taskRunInstance)
        }
      } catch (error) {
        LogUtil.info(this.constructor.name, error)
      }
    }
    this.taskStatusChangeStream.addTask(taskSaveResultList)
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
                new TaskWriter(),
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
        let processing = 0
        let waiting = 0
        let paused = 0
        let finished = 0
        let failed = 0
        for (const child of children) {
          if (child.status === TaskStatusEnum.PROCESSING) {
            processing++
            break
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
    const taskProgressDTO = new TaskProgressDTO()
    CopyIgnoreUndefined(taskProgressDTO, task)
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
    for (let i = 0; i < taskIds.length; i++) {
      const taskId = taskIds[i]
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
   * Task服务
   * @private
   */
  private taskService: TaskService
  /**
   * 任务信息
   * @private
   */
  private taskInfo: Task
  /**
   * 作品id
   * @private
   */
  public worksId: number | undefined
  /**
   * 插件加载器
   * @private
   */
  private readonly pluginLoader: PluginLoader<TaskHandler>

  constructor(
    taskId: number,
    parentId: number | null | undefined,
    status: TaskStatusEnum,
    taskInfo: Task,
    worksInfoSaved: boolean,
    resSaveSuspended: boolean,
    taskService: TaskService,
    pluginLoader: PluginLoader<TaskHandler>,
    taskWriter: TaskWriter,
    localWorksId?: number
  ) {
    super(taskId, status, false)
    this.taskWriter = taskWriter
    this.taskInfo = taskInfo
    this.taskService = taskService
    this.pluginLoader = pluginLoader
    this.parentId = IsNullish(parentId) ? 0 : parentId
    this.infoSaved = IsNullish(worksInfoSaved) ? false : worksInfoSaved
    this.resSaveSuspended = IsNullish(resSaveSuspended) ? false : resSaveSuspended
    this.inStream = false
    this.worksId = localWorksId
  }

  public changeStatus(status: TaskStatusEnum): void {
    super.changeStatus(status, false)
  }

  public async saveInfo(): Promise<void> {
    const task = await this.taskService.getById(this.taskId)
    AssertNotNullish(task, 'TaskQueue', `保存任务${this.taskId}的信息失败，任务id无效`)
    this.worksId = await this.taskService.saveWorksInfo(task, this.pluginLoader)
  }

  public preStart() {
    if (
      this.status === TaskStatusEnum.CREATED ||
      this.status === TaskStatusEnum.FINISHED ||
      this.status === TaskStatusEnum.FAILED ||
      this.status === TaskStatusEnum.PAUSE
    ) {
      this.changeStatus(TaskStatusEnum.WAITING)
      if (this.status !== TaskStatusEnum.PAUSE) {
        this.taskWriter = new TaskWriter()
      }
    } else {
      throw new Error(`无法预启动任务${this.taskId}，当前状态不支持，taskStatus: ${this.status}`)
    }
  }

  public pause(): Promise<boolean> {
    if (this.status === TaskStatusEnum.PROCESSING || this.status === TaskStatusEnum.WAITING) {
      let result: Promise<boolean> = Promise.resolve(true)
      // 对于已开始的任务，调用taskService的pauseTask进行暂停
      if (this.processing()) {
        result = this.taskService.pauseTask(this.taskInfo, this.pluginLoader, this.taskWriter)
      }
      // 判断是否已经在数据库中创建资源信息
      if (NotNullish(this.taskInfo.pendingResourceId)) {
        this.resSaveSuspended = true
      }
      this.changeStatus(TaskStatusEnum.PAUSE)
      LogUtil.info('TaskQueue', `任务${this.taskId}暂停`)
      return result
    } else {
      throw new Error(`无法暂停任务${this.taskId}，当前状态不支持，taskStatus: ${this.status}`)
    }
  }

  public stop() {
    if (this.status === TaskStatusEnum.PROCESSING || this.status === TaskStatusEnum.WAITING || this.status === TaskStatusEnum.PAUSE) {
      let result: Promise<boolean> = Promise.resolve(true)
      // 对于已开始的任务，调用taskService的pauseTask进行暂停
      if (this.processing()) {
        result = this.taskService.pauseTask(this.taskInfo, this.pluginLoader, this.taskWriter)
      }
      this.changeStatus(TaskStatusEnum.PAUSE)
      LogUtil.info('TaskQueue', `任务${this.taskId}暂停`)
      return result
    } else {
      throw new Error(`无法停止任务${this.taskId}，当前状态不支持，taskStatus: ${this.status}`)
    }
  }

  public async process(): Promise<TaskStatusEnum> {
    if (this.status === TaskStatusEnum.WAITING) {
      this.changeStatus(TaskStatusEnum.PROCESSING)

      const taskWriter = IsNullish(this.taskWriter) ? new TaskWriter() : this.taskWriter

      AssertNotNullish(this.taskInfo, 'TaskQueue', `保存任务${this.taskId}的资源失败，任务id无效`)
      AssertNotNullish(this.worksId, 'TaskQueue', `保存任务${this.taskId}的资源失败，作品id不能为空`)
      const result =
        this.resSaveSuspended && this.taskInfo.continuable
          ? this.taskService.resumeTask(this.taskInfo, this.worksId, this.pluginLoader, taskWriter)
          : this.taskService.startTask(this.taskInfo, this.worksId, this.pluginLoader, taskWriter)
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
      newError.message = msg + '，' + (error as { message: string }).message
      LogUtil.error('TaskQueue', error)
      this.emit('error', error, chunk)
      if (!alreadyCallback) {
        callback()
      }
    }
  }
}

/**
 * 任务资源保存流
 */
class TaskResourceStream extends Transform {
  private processQueue: QueueObject<TaskRunInstance>

  constructor(maxParallel: number) {
    super({ objectMode: true, highWaterMark: 64, autoDestroy: false }) // 设置为对象模式
    const finalMaxParallel = maxParallel >= 1 ? maxParallel : 1
    this.processQueue = queue(async (chunk: TaskRunInstance) => this.processTask(chunk), finalMaxParallel)
  }

  public updateMaxParallel(newNum: number): void {
    this.processQueue.concurrency = newNum
  }

  private async processTask(chunk: TaskRunInstance): Promise<void> {
    // 开始之前检查当前的状态
    if (chunk.paused()) {
      chunk.inStream = false
      return
    }
    // 发出任务开始保存的事件
    this.emit('saveStart', chunk)

    // 开始任务
    return chunk
      .process()
      .then((saveResult: TaskStatusEnum) => {
        chunk.inStream = false
        if (TaskStatusEnum.PAUSE !== saveResult) {
          this.push(chunk)
        }
      })
      .catch((err) => {
        chunk.inStream = false
        this.emit('saveFailed', err, chunk)
      })
  }

  async _transform(chunk: TaskRunInstance, _encoding: string, callback: TransformCallback): Promise<void> {
    this.processQueue.push(chunk)
    callback()
  }
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
  private runInstances: TaskRunInstance[]
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
        this.taskService.updateBatchById(aBatch.map(this.generateTaskFromRunInst)).catch((error) => LogUtil.error('TaskQueue', error))
      }
    } catch (error) {
      LogUtil.error('TaskQueue', error)
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
  private generateTaskFromRunInst(runInstance: TaskRunInstance) {
    const tempTask = new Task()
    tempTask.id = runInstance.taskId
    tempTask.status = runInstance.status
    if (TaskStatusEnum.FINISHED === tempTask.status) {
      tempTask.pendingResourceId = null
      tempTask.pendingSavePath = null
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
    const next = this.getNext()
    if (NotNullish(next)) {
      this.push(next)
    }
  }

  _read() {
    const next = this.getNext()
    if (NotNullish(next)) {
      this.push(next)
    } else {
      this.emit('waiting')
    }
  }

  public preDestroy(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (this.hasNext()) {
        this.once('waiting', () => {
          this.push(null)
          resolve()
        })
      } else {
        this.push(null)
        resolve()
      }
    })
  }

  private getNext(): TaskRunInstance | undefined {
    // 如果没有更多的数组或当前数组已经处理完毕，尝试切换到下一个数组
    while (ArrayNotEmpty(this.allInstLists)) {
      if (this.currentIndex >= this.allInstLists[0].length) {
        this.allInstLists.shift()
        this.currentIndex = 0
      } else {
        break
      }
    }

    // 如果所有数组都已经处理完毕，等待新数据推入数据源
    if (ArrayIsEmpty(this.allInstLists)) {
      return
    }

    // 从当前数组中读取一个元素返回
    return this.allInstLists[0][this.currentIndex++]
  }

  /**
   * 是否还有下一个数据
   * @private
   */
  private hasNext(): boolean {
    let tempCurrentIndex = this.currentIndex
    for (let i = 0; i < this.allInstLists.length; i++) {
      if (tempCurrentIndex >= this.allInstLists[i].length) {
        tempCurrentIndex = 0
      } else {
        return true
      }
    }
    return false
  }
}
