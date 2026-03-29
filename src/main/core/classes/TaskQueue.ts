import { TaskStatusEnum } from '../../constant/TaskStatusEnum.ts'
import log from '../../util/LogUtil.ts'
import TaskService from '../../service/TaskService.ts'
import { arrayIsEmpty, arrayNotEmpty, isNullish, notNullish } from '@shared/util/CommonUtil.ts'
import TaskScheduleDTO from '@shared/model/dto/TaskScheduleDTO.ts'
import Task from '@shared/model/entity/Task.ts'
import { RenderEvent, SendMsgToRender } from '../EventToRender.ts'
import TaskProgressMapTreeDTO from '@shared/model/dto/TaskProgressMapTreeDTO.ts'
import { copyIgnoreUndefined } from '@shared/util/ObjectUtil.ts'
import TaskTreeDTO from '@shared/model/dto/TaskTreeDTO.ts'
import TaskProgressDTO from '@shared/model/dto/TaskProgressDTO.ts'
import { getSettings } from '../settings.ts'
import { getTaskWorkerPool } from '../taskQueue.ts'
import { getPluginManager } from '../pluginManager.ts'
import { TaskStatus } from './TaskStatus.ts'
import path from 'node:path'
import { PLUGIN_ROOT } from '../../constant/PluginConstant.ts'
import { RootDir } from '../../util/FileSysUtil.ts'

/**
 * 任务队列
 *
 * 职责：管理任务的生命周期，协调工作线程池执行任务
 */
export class TaskQueue {
  /**
   * 任务池
   * @description 任务运行实例以任务id为键保存在这个map里
   * @private
   */
  private readonly taskMap: Map<number, TaskStatus>

  /**
   * 父任务池
   * @description 父任务的运行实例以id为键保存在这个map里
   * @private
   */
  private readonly parentMap: Map<number, ParentRunInstance>

  /**
   * 任务服务
   * @private
   */
  private readonly taskService: TaskService

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
  private resolveReadyToClose: (() => void) | undefined

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
   * 任务进度数据 (taskId -> progress info)
   * @private
   */
  private taskProgressData: Map<number, { resourceSize?: number; bytesWritten?: number; status?: TaskStatusEnum }>

  constructor() {
    this.taskMap = new Map()
    this.parentMap = new Map()
    this.taskService = new TaskService()
    this.closed = false
    this.taskSchedulePushing = false
    this.parentSchedulePushing = false
    this.taskProgressData = new Map()

    // 初始化工作线程池
    const maxParallelImportInSettings = getSettings().store.importSettings.maxParallelImport
    this.initializeWorkerPool(maxParallelImportInSettings)

    // 设置任务进度回调
    this.setupProgressCallback()

    // 初始化关闭 Promise
    this.readyToClose = new Promise<void>((resolve) => {
      this.resolveReadyToClose = resolve
      // 关闭时的清理逻辑
      log.info(this.constructor.name, '任务队列已初始化')
    })
  }

  /**
   * 初始化工作线程池
   */
  private async initializeWorkerPool(maxWorkers: number): Promise<void> {
    const workerPool = getTaskWorkerPool()
    await workerPool.initialize()
    log.info(this.constructor.name, `工作线程池已初始化，最大工作线程数: ${maxWorkers}`)
  }

  /**
   * 设置任务进度回调
   */
  private setupProgressCallback(): void {
    const workerPool = getTaskWorkerPool()
    workerPool.setTaskProgressCallback((progress) => {
      this.handleWorkerProgress(progress)
    })
  }

  /**
   * 处理工作线程进度
   */
  private handleWorkerProgress(progress: {
    taskId: number
    type: string
    status?: number
    progress?: { resourceSize?: number; bytesWritten?: number }
    error?: string
  }): void {
    const { taskId, type, status, progress: progressInfo, error } = progress

    if (type === 'progress' && progressInfo) {
      // 更新任务进度数据
      this.taskProgressData.set(taskId, {
        resourceSize: progressInfo.resourceSize,
        bytesWritten: progressInfo.bytesWritten,
        status: status as TaskStatusEnum | undefined
      })

      // 查找任务并更新状态
      const taskStatus = this.taskMap.get(taskId)
      if (notNullish(taskStatus) && notNullish(progressInfo.resourceSize)) {
        // 创建进度 DTO 并发送到渲染进程
        const taskProgressDTO = new TaskProgressDTO()
        taskProgressDTO.id = taskId
        taskProgressDTO.total = progressInfo.resourceSize
        taskProgressDTO.finished = progressInfo.bytesWritten
        taskProgressDTO.status = taskStatus.status
        SendMsgToRender(RenderEvent.TASK_STATUS_UPDATE_TASK, [taskProgressDTO])
      }
    } else if (type === 'complete') {
      // 任务完成
      log.info(this.constructor.name, `任务 ${taskId} 执行完成`)
      this.handleTaskComplete(taskId, TaskStatusEnum.FINISHED)
    } else if (type === 'error') {
      // 任务错误
      log.error(this.constructor.name, `任务 ${taskId} 执行失败: ${error}`)
      this.handleTaskComplete(taskId, TaskStatusEnum.FAILED)
    }
  }

  /**
   * 处理任务完成
   */
  private async handleTaskComplete(taskId: number, status: TaskStatusEnum): Promise<void> {
    // 从进度数据中移除
    this.taskProgressData.delete(taskId)

    // 获取任务状态
    const taskStatus = this.taskMap.get(taskId)
    if (isNullish(taskStatus)) {
      return
    }

    // 更新任务状态
    taskStatus.changeStatus(status, false)

    // 准备更新数据库的任务对象
    const task = new Task()
    task.id = taskId
    task.status = status
    if (status === TaskStatusEnum.FINISHED) {
      task.pendingResourceId = null
    }

    // 保存到数据库
    try {
      await this.taskService.updateById(task)
      taskStatus.taskChangeStored = true
      log.info(this.constructor.name, `任务 ${taskId} 状态已保存到数据库`)
    } catch (error) {
      log.error(this.constructor.name, `保存任务 ${taskId} 状态失败`, error)
    }

    // 延迟移除任务
    this.scheduleTaskRemoval(taskId, taskStatus)

    // 检查是否需要 resolve readyToClose
    if (this.closed && this.taskMap.size === 0 && this.parentMap.size === 0) {
      if (this.resolveReadyToClose) {
        this.resolveReadyToClose()
        log.info(this.constructor.name, '所有任务已处理完毕，readyToClose 已 resolve')
      }
    }

    // 刷新父任务状态
    const parentId = taskStatus.parentId
    if (notNullish(parentId) && parentId !== 0) {
      this.refreshParentStatus([parentId]).catch((error) => log.error(this.constructor.name, '刷新父任务状态失败', error))
    }
  }

  /**
   * 安排任务移除
   */
  private scheduleTaskRemoval(taskId: number, taskStatus: TaskStatus): void {
    const delay = 5000
    let tried = 0

    const tryRemove = () => {
      taskStatus.clearTimeoutId = setTimeout(() => {
        if (taskStatus.taskChangeStored) {
          this.taskMap.delete(taskId)
          SendMsgToRender(RenderEvent.TASK_STATUS_REMOVE_TASK, [taskId])
          log.info(this.constructor.name, `任务 ${taskId} 已从队列中移除`)
        } else {
          tried++
          log.info(this.constructor.name, `任务 ${taskId} 移除失败，任务信息尚未保存，已尝试 ${tried} 次`)
          tryRemove()
        }
      }, delay)
    }

    tryRemove()
  }

  /**
   * 批量插入操作
   * @param tasks 需要操作的任务
   * @param taskOperation 要执行的操作
   */
  public async pushBatch(tasks: Task[], taskOperation: TaskOperation) {
    if (this.closed) {
      log.warn(this.constructor.name, '无法执行操作，任务队列已经关闭')
      return
    }
    if (taskOperation === TaskOperation.START) {
      await this.processTask(tasks)
    } else if (taskOperation === TaskOperation.RESUME) {
      await this.resumeTasks(tasks)
    } else if (taskOperation === TaskOperation.PAUSE) {
      await this.pauseTask(tasks.map((task) => task.id as number))
      const parentIdWaitingRefresh: Set<number> = new Set(tasks.map((task) => task.pid).filter(notNullish))
      this.refreshParentStatus(Array.from(parentIdWaitingRefresh)).catch((error) =>
        log.error(this.constructor.name, '刷新父任务状态失败', error)
      )
    } else if (taskOperation === TaskOperation.STOP) {
      await this.stopTask(tasks)
      // 清除单个的任务
      const singleTasks = tasks.filter((task) => isNullish(task.pid)).map((task) => task.id as number)
      this.removeTask(singleTasks)
      // 刷新父任务
      const parentIdWaitingRefresh: Set<number> = new Set(tasks.map((task) => task.pid).filter(notNullish))
      this.refreshParentStatus(Array.from(parentIdWaitingRefresh)).catch((error) =>
        log.error(this.constructor.name, '刷新父任务状态失败', error)
      )
    }
    this.pushTaskSchedule().catch((error) => log.error(this.constructor.name, '向渲染进程推送任务进度时出现错误，', error))
  }

  /**
   * 获取任务进度
   * @param taskId 任务id
   */
  public getSchedule(taskId: number): TaskScheduleDTO | undefined {
    // 父任务的进度
    const parentRunInstance = this.parentMap.get(taskId)
    if (notNullish(parentRunInstance)) {
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
    const taskStatus = this.taskMap.get(taskId)
    if (isNullish(taskStatus)) {
      return undefined
    }

    const progress = this.taskProgressData.get(taskId)
    if (
      taskStatus.status === TaskStatusEnum.FINISHED ||
      taskStatus.status === TaskStatusEnum.PROCESSING ||
      taskStatus.status === TaskStatusEnum.PAUSE
    ) {
      return new TaskScheduleDTO({
        id: taskId,
        pid: taskStatus.parentId,
        status: taskStatus.status,
        total: progress?.resourceSize,
        finished: progress?.bytesWritten
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
    while (this.taskMap.size > 0) {
      this.taskSchedulePushing = true
      const taskScheduleList = this.taskMap
        .values()
        .toArray()
        .map((taskStatus) => {
          const taskId = taskStatus.taskId
          const progress = this.taskProgressData.get(taskId)
          if (
            (taskStatus.status === TaskStatusEnum.PROCESSING || taskStatus.status === TaskStatusEnum.PAUSE) &&
            notNullish(progress)
          ) {
            return new TaskScheduleDTO({
              id: taskId,
              pid: taskStatus.parentId,
              status: taskStatus.status,
              total: progress.resourceSize,
              finished: progress.bytesWritten
            })
          }
          return undefined
        })
        .filter(notNullish)
      if (this.closed) {
        break
      }
      if (arrayNotEmpty(taskScheduleList)) {
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
    while (this.parentMap.size > 0) {
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
    if (arrayIsEmpty(includeStatus)) {
      return fullTree
    }
    const result: TaskTreeDTO[] = []

    // 遍历任务树，寻找符合条件的任务
    for (const tempParent of fullTree) {
      if (arrayIsEmpty(tempParent.children)) {
        if (!tempParent.isCollection) {
          result.push(tempParent)
        }
        continue
      }
      const tempChildren = tempParent.children
      tempParent.children = []
      let parentPushed = false
      for (const tempChild of tempChildren) {
        if (isNullish(tempChild.id)) {
          continue
        }
        // 优先使用运行实例的任务状态判断任务状态
        const tempRunInst = this.taskMap.get(tempChild.id)
        if (notNullish(tempRunInst)) {
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
   * 获取任务状态
   * @param id 任务id
   */
  public getTaskStatus(id: number): TaskStatusEnum | undefined {
    return this.taskMap.get(id)?.status
  }

  /**
   * 关闭任务队列
   */
  public async shutdown(): Promise<void> {
    this.closed = true
    const runInstList = this.taskMap.values().toArray()
    const ids = runInstList
      .filter((runInst) => TaskStatusEnum.WAITING === runInst.status || TaskStatusEnum.PROCESSING === runInst.status)
      .map((runInst) => runInst.taskId)

    // 如果没有需要停止的任务，直接 resolve
    if (ids.length === 0) {
      if (this.resolveReadyToClose) {
        this.resolveReadyToClose()
      }
    }

    // 停止所有运行中的任务
    for (const taskId of ids) {
      try {
        await this.stopTaskById(taskId)
      } catch (error) {
        log.error(this.constructor.name, `关闭任务队列时停止任务 ${taskId} 失败`, error)
      }
    }

    // 等待所有任务完成
    await this.readyToClose

    // 刷新父任务状态
    const parentIds = runInstList.map((runInst) => runInst.parentId).filter(notNullish) as number[]
    await this.refreshParentStatus(parentIds)
    log.info(this.constructor.name, '任务队列已关闭')
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
   * @param newNum 新的大小
   */
  public updateMaxParallel(newNum: number) {
    const workerPool = getTaskWorkerPool()
    workerPool.updateMaxWorkers(newNum)
  }

  /**
   * 开始处理任务
   * @param tasks 需要处理的任务
   * @private
   */
  private async processTask(tasks: Task[]) {
    const workerPool = getTaskWorkerPool()
    const workdir = getSettings().store.workdir

    for (const task of tasks) {
      const taskId = task.id as number

      // 检查任务是否已在队列中
      if (this.taskMap.has(taskId)) {
        log.warn(this.constructor.name, `任务 ${taskId} 已在队列中`)
        continue
      }

      try {
        // 获取插件贡献点文件路径
        const pluginContributionId = task.pluginContributionId
        if (isNullish(pluginContributionId)) {
          log.error(this.constructor.name, `任务 ${taskId} 缺少 pluginContributionId`)
          continue
        }

        const pluginPublicId = task.pluginPublicId
        if (isNullish(pluginPublicId)) {
          log.error(this.constructor.name, `任务 ${taskId} 缺少 pluginPublicId`)
          continue
        }

        let contributionPath = await getPluginManager().getContribution(pluginPublicId, 'taskHandler', pluginContributionId, {
          returnFilePath: true
        })
        if (!path.isAbsolute(contributionPath)) {
          contributionPath = path.join(RootDir(), PLUGIN_ROOT, contributionPath)
        }

        // 创建任务状态（包含完整任务信息，用于主线程追踪）
        // 注意：workId 在子线程中通过 saveWorkInfo 获取
        const taskStatus = new TaskStatus(taskId, TaskStatusEnum.WAITING, task.pid, task, pluginPublicId, contributionPath, workdir)
        this.taskMap.set(taskId, taskStatus)

        // 通知渲染进程任务已添加
        const taskProgressDTO = new TaskProgressDTO()
        copyIgnoreUndefined(taskProgressDTO, task)
        SendMsgToRender(RenderEvent.TASK_STATUS_SET_TASK, [taskProgressDTO])

        // 提交到工作线程池（TaskStatus 包含所有需要的信息）
        workerPool.submitTask(taskStatus)
        log.info(this.constructor.name, `任务 ${taskId} 已提交到工作线程池`)

        // 更新任务状态为处理中
        taskStatus.changeStatus(TaskStatusEnum.PROCESSING, false)
      } catch (error) {
        log.error(this.constructor.name, `提交任务 ${taskId} 失败`, error)
        // 如果失败，更新任务状态为失败
        const taskStatus = this.taskMap.get(taskId)
        if (notNullish(taskStatus)) {
          taskStatus.changeStatus(TaskStatusEnum.FAILED, false)
        }
      }
    }

    // 补全父任务的子任务
    await this.fillChildren(tasks)
  }

  /**
   * 恢复任务（将暂停的任务重新提交到工作线程池）
   * @param tasks 要恢复的任务列表
   * @private
   */
  private async resumeTasks(tasks: Task[]): Promise<void> {
    const workerPool = getTaskWorkerPool()

    for (const task of tasks) {
      const taskId = task.id as number
      const taskStatus = this.taskMap.get(taskId)

      if (isNullish(taskStatus)) {
        // 任务不在队列中，当作新任务处理
        log.debug(this.constructor.name, `任务 ${taskId} 不在队列中，当作新任务处理`)
        await this.processTask([task])
        continue
      }

      if (taskStatus.status !== TaskStatusEnum.PAUSE) {
        log.warn(this.constructor.name, `任务 ${taskId} 状态为 ${taskStatus.status}，无法恢复`)
        continue
      }

      try {
        // 更新状态为处理中
        taskStatus.changeStatus(TaskStatusEnum.PROCESSING, false)

        // 重新提交到工作线程池
        workerPool.resumeTask(taskStatus)
        log.info(this.constructor.name, `任务 ${taskId} 已恢复`)
      } catch (error) {
        log.error(this.constructor.name, `恢复任务 ${taskId} 失败`, error)
        taskStatus.changeStatus(TaskStatusEnum.FAILED, false)
      }
    }
  }

  /**
   * 暂停任务
   * @param taskIds 要暂停的任务 ID 列表
   * @private
   */
  private async pauseTask(taskIds: number[]): Promise<boolean[]> {
    const workerPool = getTaskWorkerPool()
    const results: boolean[] = []

    for (const taskId of taskIds) {
      const taskStatus = this.taskMap.get(taskId)
      if (isNullish(taskStatus)) {
        log.error(this.constructor.name, `无法暂停任务 ${taskId}，队列中没有这个任务`)
        results.push(false)
        continue
      }

      try {
        const success = await workerPool.pauseTask(taskId)
        if (success) {
          taskStatus.changeStatus(TaskStatusEnum.PAUSE, false)
          log.info(this.constructor.name, `任务 ${taskId} 已暂停`)
        }
        results.push(success)
      } catch (error) {
        log.error(this.constructor.name, `暂停任务 ${taskId} 失败`, error)
        results.push(false)
      }
    }

    return results
  }

  /**
   * 停止任务
   * @param tasks 要停止的任务列表
   * @private
   */
  private async stopTask(tasks: Task[]): Promise<void> {
    for (const task of tasks) {
      if (isNullish(task.id)) {
        continue
      }
      await this.stopTaskById(task.id)
    }
  }

  /**
   * 根据 ID 停止任务
   * @param taskId 任务 ID
   * @private
   */
  private async stopTaskById(taskId: number): Promise<void> {
    const taskStatus = this.taskMap.get(taskId)
    if (isNullish(taskStatus)) {
      log.error(this.constructor.name, `无法停止任务 ${taskId}，队列中没有这个任务`)
      return
    }

    try {
      const workerPool = getTaskWorkerPool()
      await workerPool.stopTask(taskId)
      taskStatus.changeStatus(TaskStatusEnum.FAILED, false)
      log.info(this.constructor.name, `任务 ${taskId} 已停止`)
    } catch (error) {
      log.error(this.constructor.name, `停止任务 ${taskId} 失败`, error)
    }
  }

  /**
   * 补全父任务的子任务
   * @param runInstances 子任务运行实例列表
   * @private
   */
  private async fillChildren(runInstances: Task[]) {
    const existingPid = this.parentMap.keys().toArray()
    const notExistingPid = [
      ...new Set(
        runInstances
          .map((runInstance) => {
            if (notNullish(runInstance.pid) && runInstance.pid !== 0 && !existingPid.includes(runInstance.pid)) {
              return runInstance.pid
            } else {
              return undefined
            }
          })
          .filter(notNullish)
      )
    ]
    let parentList: Task[] = []
    if (arrayNotEmpty(notExistingPid)) {
      parentList = await this.taskService.listByIds(notExistingPid)
    }
    if (arrayNotEmpty(parentList)) {
      const allChildren = await this.taskService.listChildrenByParentsTask(notExistingPid)
      const pidChildrenMap: Map<number, Task[]> = Map.groupBy(allChildren, (child) => child.pid as number)

      for (const parentInfo of parentList) {
        if (isNullish(parentInfo.id)) {
          log.error(this.constructor.name, `添加父任务失败，父任务id不能为空`)
          continue
        }
        if (isNullish(parentInfo.status)) {
          this.removeTaskByPid(parentInfo.id)
          log.error(this.constructor.name, `添加父任务 ${parentInfo.id} 失败，父任务状态不能为空`)
          continue
        }

        const tempChildren = pidChildrenMap.get(parentInfo.id)
        if (arrayNotEmpty(tempChildren)) {
          const parentInst = new ParentRunInstance(parentInfo.id, parentInfo.status)
          for (const tempChild of tempChildren) {
            if (notNullish(tempChild.id)) {
              const childStatus = this.taskMap.get(tempChild.id)
              if (notNullish(childStatus)) {
                parentInst.addChild(tempChild.id, childStatus)
              }
            }
          }
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
      if (notNullish(parentRunInstance)) {
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
          log.warn(
            'TaskQueue',
            `刷新父任务状态失败，created: ${created} processing: ${processing} waiting: ${waiting} paused: ${paused} finished: ${finished} failed: ${failed}`
          )
        }

        if (parentRunInstance.status !== newStatus) {
          parentRunInstance.changeStatus(newStatus, true)
          const parent = new Task()
          parent.id = parentRunInstance.taskId
          parent.status = newStatus
          this.taskService
            .updateById(parent)
            .catch((error) => log.error(this.constructor.name, '刷新父任务状态并保存到数据库时出现错误', error))
        }

        // 清除不再活跃的父任务
        if (processing === 0 && paused === 0 && waiting === 0 && waitingUserInput === 0) {
          this.removeParentTask(id)
        } else if (notNullish(parentRunInstance.clearTimeoutId)) {
          clearTimeout(parentRunInstance.clearTimeoutId)
        }
      }
    }
    this.pushParentTaskSchedule().catch((error) => log.error(this.constructor.name, '推送父任务信息到渲染进程失败，', error))
  }

  /**
   * 任务插入到父任务池中
   * @param parentRunInstance 父任务运行实例
   * @param task 任务信息
   * @private
   */
  private inletParentTask(parentRunInstance: ParentRunInstance, task: Task) {
    // 清除原有的删除定时器
    const oldInst = this.parentMap.get(parentRunInstance.taskId)
    if (notNullish(oldInst)) {
      clearTimeout(oldInst.clearTimeoutId)
    }
    this.parentMap.set(parentRunInstance.taskId, parentRunInstance)
    // 任务状态推送到渲染进程
    const taskProgressMapTreeDTO = new TaskProgressMapTreeDTO()
    copyIgnoreUndefined(taskProgressMapTreeDTO, task)
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
      const taskStatus = this.taskMap.get(taskId)
      if (notNullish(taskStatus)) {
        this.taskMap.delete(taskId)
        SendMsgToRender(RenderEvent.TASK_STATUS_REMOVE_TASK, [taskId])
      } else {
        log.warn(this.constructor.name, `移除任务运行实例失败，任务运行实例不存在，taskId: ${taskId}`)
      }
    }
  }

  /**
   * 从子任务池中移除任务运行实例
   * @param pid 父任务id
   * @private
   */
  private removeTaskByPid(pid: number) {
    const waitingRemove = this.taskMap
      .entries()
      .filter((entry) => entry[1].parentId === pid)
      .map((entry) => entry[0])
      .toArray()
    if (arrayNotEmpty(waitingRemove)) {
      this.removeTask(waitingRemove)
    }
  }

  /**
   * 从父任务池中移除任务运行实例
   * @param taskId 子任务id
   * @private
   */
  private removeParentTask(taskId: number) {
    const runInstance = this.parentMap.get(taskId)
    if (notNullish(runInstance)) {
      const childrenIds = runInstance.children.keys().toArray()
      if (arrayNotEmpty(childrenIds)) {
        this.removeTask(childrenIds)
      }
      runInstance.clearTimeoutId = setTimeout(() => {
        this.parentMap.delete(taskId)
        // 任务状态推送到渲染进程
        SendMsgToRender(RenderEvent.PARENT_TASK_STATUS_REMOVE_PARENT_TASK, [taskId])
      }, 5000)
    } else {
      log.warn(this.constructor.name, `移除父任务运行实例失败，父任务运行实例不存在，taskId: ${taskId}`)
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
 * 父任务运行实例
 */
class ParentRunInstance {
  /**
   * 任务id
   */
  taskId: number

  /**
   * 任务状态
   */
  status: TaskStatusEnum

  /**
   * 子任务
   */
  children: Map<number, TaskStatus>

  /**
   * 清理定时器id
   */
  clearTimeoutId: NodeJS.Timeout | undefined

  constructor(taskId: number, status: TaskStatusEnum) {
    this.taskId = taskId
    this.status = status
    this.children = new Map()
    this.clearTimeoutId = undefined
  }

  public addChild(taskId: number, child: TaskStatus): void {
    this.children.set(taskId, child)
  }

  public changeStatus(status: TaskStatusEnum, _isParent: boolean): void {
    this.status = status
    // 任务状态推送到渲染进程
    const task = new Task()
    task.id = this.taskId
    task.status = status
    SendMsgToRender(RenderEvent.PARENT_TASK_STATUS_UPDATE_PARENT_TASK, [task])
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
