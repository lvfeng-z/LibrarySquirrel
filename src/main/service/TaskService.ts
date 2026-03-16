import Task from '@shared/model/entity/Task.ts'
import LogUtil from '../util/LogUtil.ts'
import TaskDao from '../dao/TaskDao.ts'
import { TaskStatusEnum } from '../constant/TaskStatusEnum.ts'
import TaskQueryDTO from '@shared/model/queryDTO/TaskQueryDTO.ts'
import PluginService from './PluginService.ts'
import { getPluginTaskUrlListenerManager } from '../core/pluginTaskUrlListener.ts'
import WorkService from './WorkService.ts'
import Plugin from '@shared/model/entity/Plugin.ts'
import { Readable } from 'node:stream'
import BaseService from '../base/BaseService.ts'
import lodash from 'lodash'
import { arrayIsEmpty, arrayNotEmpty, isNullish, notNullish } from '@shared/util/CommonUtil.ts'
import Page from '@shared/model/util/Page.ts'
import { Operator } from '../constant/CrudConstant.ts'
import TaskTreeDTO from '@shared/model/dto/TaskTreeDTO.ts'
import TaskCreateDTO from '@shared/model/dto/TaskCreateDTO.ts'
import TaskScheduleDTO from '@shared/model/dto/TaskScheduleDTO.ts'
import { PluginTaskResParam } from '../plugin/PluginTaskResParam.ts'
import PluginWorkResponseDTO from '@shared/model/dto/PluginWorkResponseDTO.ts'
import TaskCreateResponse from '@shared/model/util/TaskCreateResponse.ts'
import { assertArrayNotEmpty, assertNotBlank, assertNotNullish, assertTrue } from '@shared/util/AssertUtil.ts'
import { getNode } from '@shared/util/TreeUtil.ts'
import { Id } from '@shared/model/base/BaseEntity.ts'
import ResourceWriter from '../util/ResourceWriter.js'
import { FileSaveResult } from '../constant/FileSaveResult.js'
import { TaskOperation } from '../core/classes/TaskQueue.ts'
import TaskProgressTreeDTO from '@shared/model/dto/TaskProgressTreeDTO.js'
import SiteService from './SiteService.js'
import { transactional } from '../database/Transactional.ts'
import Site from '@shared/model/entity/Site.js'
import CreateTaskWritable from '../util/CreateTaskWritable.ts'
import ResourceService from './ResourceService.js'
import PluginCreateTaskResponseDTO from '@shared/model/dto/PluginCreateTaskResponseDTO.js'
import PluginCreateParentTaskResponseDTO from '@shared/model/dto/PluginCreateParentTaskResponseDTO.js'
import PluginResourceDTO from '@shared/model/dto/PluginResourceDTO.ts'
import TaskProcessResponseDTO from '@shared/model/dto/TaskProcessResponseDTO.js'
import { getTaskQueue } from '../core/taskQueue.ts'
import { TaskHandler } from '../plugin/types/ContributionTypes.ts'
import { mergeObjects } from '@shared/util/ObjectUtil.ts'
import { getPluginManager } from '../core/pluginManager.ts'
import PluginWithContribution from '@shared/model/domain/PluginWithContribution.ts'

export default class TaskService extends BaseService<TaskQueryDTO, Task, TaskDao> {
  constructor() {
    super(TaskDao)
  }

  /**
   * 根据传入的url创建任务
   * @param url 作品/作品集所在url
   */
  public async createTask(url: string): Promise<TaskCreateResponse> {
    // 查询监听此url的插件
    const taskPlugins = await getPluginTaskUrlListenerManager().listListener(url)

    if (arrayIsEmpty(taskPlugins)) {
      const msg = `url不受支持，url: ${url}`
      LogUtil.info(this.constructor.name, msg)
      return new TaskCreateResponse({
        succeed: false,
        addedQuantity: 0,
        msg: msg,
        plugin: undefined
      })
    }

    // 按照排序尝试每个插件
    for (const taskPlugin of taskPlugins) {
      try {
        // 加载插件
        if (isNullish(taskPlugin.id)) {
          const msg = `任务的插件id不能为空，taskId: ${taskPlugin.id}`
          LogUtil.error(this.constructor.name, msg)
          continue
        }
        const taskHandler: TaskHandler = await getPluginManager().getContribution(
          taskPlugin.id as number,
          'taskHandler',
          taskPlugin.contributionId
        )

        // 任务集
        const parentTask = new Task()
        parentTask.pluginPublicId = taskPlugin.publicId
        parentTask.pluginContributionId = taskPlugin.contributionId
        parentTask.url = url
        parentTask.status = TaskStatusEnum.CREATED
        parentTask.isCollection = true

        // 创建任务
        const pluginResponse = await taskHandler.create(url)

        // 分别处理数组类型和流类型的响应值
        const pluginProcessResult = await transactional<TaskCreateResponse | undefined>('创建任务', async () => {
          if (pluginResponse instanceof Readable) {
            const addedQuantity = await this.handleCreateTaskStream(pluginResponse, taskPlugin, 100)
            return new TaskCreateResponse({
              succeed: true,
              addedQuantity: addedQuantity,
              msg: '创建成功',
              plugin: taskPlugin
            })
          } else if (Array.isArray(pluginResponse)) {
            const addedQuantity = await this.handleCreateTaskArray(pluginResponse, url, taskPlugin)
            return new TaskCreateResponse({
              succeed: true,
              addedQuantity: addedQuantity,
              msg: '创建成功',
              plugin: taskPlugin
            })
          } else {
            LogUtil.error(this.constructor.name, '插件创建任务失败，插件返回了不支持的类型')
            return
          }
        })
        if (notNullish(pluginProcessResult)) {
          return pluginProcessResult
        }
      } catch (error) {
        LogUtil.error(this.constructor.name, `插件创建任务失败，url: ${url}，error:`, error)
      }
    }

    // 未能在循环中返回，则返回0
    const msg = `尝试了所有插件均未成功，url: ${url}`
    LogUtil.info(this.constructor.name, msg)
    return new TaskCreateResponse({ succeed: false, addedQuantity: 0, msg: msg, plugin: undefined })
  }

  /**
   * 处理插件返回的任务数组
   * @param pluginParentTaskResponseDTOS 插件返回的任务数组
   * @param url 传给插件的url
   * @param taskPlugin 插件信息
   */
  public async handleCreateTaskArray(
    pluginParentTaskResponseDTOS: PluginCreateParentTaskResponseDTO[],
    url: string,
    taskPlugin: PluginWithContribution
  ): Promise<number> {
    // 校验是否返回了空数据或非数组
    assertArrayNotEmpty(pluginParentTaskResponseDTOS, `插件未创建任务，url: ${url}`)
    const childrenSavePromise: Promise<number>[] = []
    let childrenCount = 0
    // 用于查询和缓存站点id
    const siteService = new SiteService()
    const siteCache = new Map<string, Promise<number>>()
    // 给任务赋值的函数
    const assignTask = async (task: TaskCreateDTO, pid?: number): Promise<void> => {
      // 校验
      assertNotBlank(task.siteName, '创建任务失败，插件返回的任务信息中缺少站点名称')
      assertNotBlank(task.siteWorkId, '创建任务失败，插件返回的任务信息中缺少站点作品id')
      task.status = TaskStatusEnum.CREATED
      task.isCollection = false
      task.pid = pid
      task.pluginPublicId = taskPlugin.publicId
      task.pluginContributionId = taskPlugin.contributionId
      // 根据站点名称查询站点id
      let siteId: Promise<number | null | undefined> | null | undefined = siteCache.get(task.siteName)
      if (isNullish(siteId)) {
        const tempSite = siteService.getByName(task.siteName)
        siteId = tempSite.then((site) => site?.id)
      }
      task.siteId = await siteId
      assertNotNullish(task.siteId, `创建任务失败，没有找到${task.siteName}对应的站点`)
      try {
        task.pluginData = JSON.stringify(task.pluginData)
      } catch (error) {
        LogUtil.error(this.constructor.name, `序列化插件保存的pluginData失败，url: ${url}，error:`, error)
        return
      }
    }
    for (const parentTaskResponseDTO of pluginParentTaskResponseDTOS) {
      const childrenResponseDTOS = parentTaskResponseDTO.children
      if (arrayIsEmpty(childrenResponseDTOS)) {
        continue
      }
      // 单个任务不创建父任务，只创建子任务
      if (childrenResponseDTOS.length === 1) {
        const singleTaskCreateDTO = PluginCreateTaskResponseDTO.toTaskCreateDTO(childrenResponseDTOS[0])
        await assignTask(singleTaskCreateDTO)
        await super.save(singleTaskCreateDTO)
        childrenCount++
        continue
      }
      const parentTaskCreateDTO = PluginCreateParentTaskResponseDTO.toTaskCreateDTO(parentTaskResponseDTO)
      // 转换为TaskCreateDTO
      const taskCreateDTOS = childrenResponseDTOS.map((task) => PluginCreateTaskResponseDTO.toTaskCreateDTO(task))

      await assignTask(parentTaskCreateDTO)
      parentTaskCreateDTO.isCollection = true
      const parentId = await super.save(parentTaskCreateDTO)

      for (const task of taskCreateDTOS) {
        await assignTask(task, parentId)
      }
      const childTasks = taskCreateDTOS.map((taskCreateDTO) => new Task(taskCreateDTO))

      childrenSavePromise.push(super.saveBatch(childTasks).then((count) => (childrenCount += count)))
    }
    await Promise.allSettled(childrenSavePromise)
    return childrenCount
  }

  /**
   * 处理任务创建流
   * @param createTaskStream 创建任务流
   * @param taskPlugin 插件信息
   * @param batchSize 每次保存任务的数量
   */
  public async handleCreateTaskStream(
    createTaskStream: Readable,
    taskPlugin: PluginWithContribution,
    batchSize: number
  ): Promise<number> {
    // 最终用于返回的Promise
    return new Promise<number>((resolve, reject) => {
      const writable = new CreateTaskWritable(this, new SiteService(), taskPlugin, batchSize)
      createTaskStream.on('error', (error) => {
        LogUtil.error(this.constructor.name, '创建任务失败，ReadableError: ', error)
        reject(error)
      })
      writable.on('error', (error) => {
        LogUtil.error(this.constructor.name, '创建任务失败，WritableError: ', error)
        reject(error)
      })
      writable.on('finish', () => resolve(writable.taskCount))
      createTaskStream.pipe(writable)
    })
  }

  /**
   * 保存作品信息
   * @param task
   * @param update
   * @param workId
   */
  public async saveWorkInfo(task: Task, update: boolean, workId?: number): Promise<number> {
    assertNotNullish(task.id, `保存作品信息失败，任务id不能为空`)
    const taskId = task.id
    // 加载插件
    const pluginContributionId = task.pluginContributionId
    assertNotNullish(pluginContributionId, `保存作品信息失败，任务贡献点id不能为空`)
    const plugin = await this.getPlugin(task.pluginPublicId, '保存作品信息失败')
    const pluginId = plugin.id
    assertNotNullish(pluginId, `保存作品信息失败，创建任务的插件id不能为空`)
    const taskHandler: TaskHandler = await getPluginManager().getContribution(pluginId, 'taskHandler', pluginContributionId)

    // 调用插件的createWorkInfo方法，获取作品信息
    let pluginWorkResponseDTO: PluginWorkResponseDTO
    try {
      pluginWorkResponseDTO = await taskHandler.createWorkInfo(task)
    } catch (error) {
      LogUtil.error(this.constructor.name, `任务${taskId}调用插件获取作品信息时失败`, error)
      throw error
    }
    pluginWorkResponseDTO.work.siteId = task.siteId

    // 保存远程资源是否可接续
    task.continuable = isNullish(pluginWorkResponseDTO.resource?.continuable) ? false : pluginWorkResponseDTO.resource.continuable
    const updateContinuableTask = new Task()
    updateContinuableTask.id = taskId
    updateContinuableTask.continuable = task.continuable
    await this.updateById(updateContinuableTask)

    // 生成作品保存用的信息
    const workService = new WorkService()
    const workSaveDTO = await workService.createSaveInfoFromPlugin(pluginWorkResponseDTO, taskId, workId)

    // 保存作品信息
    return workService.saveOrUpdateWorkInfos(workSaveDTO, update)
  }

  /**
   * 处理任务
   * @param task
   * @param workId
   * @param resourceWriter
   */
  public async startTask(task: Task, workId: number, resourceWriter: ResourceWriter): Promise<TaskProcessResponseDTO> {
    assertNotNullish(task.id, `开始任务失败，任务id不能为空`)
    const taskId = task.id

    const workService = new WorkService()

    // 加载插件
    const pluginContributionId = task.pluginContributionId
    assertNotNullish(pluginContributionId, `保存作品信息失败，任务贡献点id不能为空`)
    const plugin = await this.getPlugin(task.pluginPublicId, '保存作品信息失败')
    assertNotNullish(plugin?.id, `开始任务失败，创建任务的插件id不能为空`)

    // 调用插件的start方法，获取资源
    let pluginResponse: PluginWorkResponseDTO
    try {
      const taskHandler: TaskHandler = await getPluginManager().getContribution(plugin.id, 'taskHandler', pluginContributionId)
      pluginResponse = await taskHandler.start(task)
    } catch (error) {
      LogUtil.error(this.constructor.name, `任务${taskId}调用插件开始时失败`, error)
      return new TaskProcessResponseDTO(TaskStatusEnum.FAILED, error as Error)
    }
    assertNotNullish(pluginResponse.resource?.resourceStream, `插件没有返回任务${taskId}的资源`)

    const workInfo = await workService.getFullWorkInfoById(workId)
    assertNotNullish(workInfo, `开始任务失败，任务的作品id不可用，taskId: ${taskId}`)
    // 创建资源保存DTO
    const resourceSaveDTO = ResourceService.createSaveInfoFromPlugin(workInfo, pluginResponse, taskId)
    // 查询作品已经存在的可用资源
    const resService = new ResourceService()
    const activeRes = await resService.getActiveByWorkId(workId)
    if (isNullish(activeRes)) {
      resourceSaveDTO.id = await resService.saveActive(resourceSaveDTO)
    } else {
      resourceSaveDTO.id = activeRes.id
    }
    // 更新下载中的资源id
    task.pendingResourceId = resourceSaveDTO.id
    this.updateById(task)

    // 标记为进行中
    task.status = TaskStatusEnum.PROCESSING

    LogUtil.info(this.constructor.name, `任务${taskId}开始下载`)
    const resSavePromise: Promise<FileSaveResult> = isNullish(activeRes)
      ? resService.saveResource(resourceSaveDTO, resourceWriter)
      : resService.replaceResource(resourceSaveDTO, resourceWriter)
    return resSavePromise.then(async (saveResult) => {
      if (FileSaveResult.FINISH === saveResult) {
        return new TaskProcessResponseDTO(TaskStatusEnum.FINISHED)
      } else if (FileSaveResult.PAUSE === saveResult) {
        return new TaskProcessResponseDTO(TaskStatusEnum.PAUSE)
      } else {
        throw new Error(`保存资源未返回预期中的值，saveResult: ${saveResult}`)
      }
    })
  }

  /**
   * 获取指定任务所在的树形任务列表
   * @param taskIds 任务id
   * @param includeStatus 指定的任务状态
   */
  public async listTaskTree(taskIds: number[], includeStatus?: TaskStatusEnum[]): Promise<TaskTreeDTO[]> {
    return this.dao.listTaskTree(taskIds, includeStatus)
  }

  /**
   * 处理任务
   * @param taskIds 任务id列表
   * @param includeStatus 要处理的任务状态
   */
  public async processTaskTree(taskIds: number[], includeStatus: TaskStatusEnum[]): Promise<void> {
    // 查找id列表对应的所有子任务
    const taskQueue = getTaskQueue()
    const taskTree = await taskQueue.listTaskTree(taskIds, includeStatus)

    for (const parent of taskTree) {
      try {
        // 获取要处理的任务
        let children: TaskTreeDTO[]
        if (parent.isCollection && arrayNotEmpty(parent.children)) {
          children = parent.children
        } else if (!parent.isCollection) {
          children = [parent]
        } else {
          continue
        }

        await taskQueue.pushBatch(children, TaskOperation.START)
      } catch (error) {
        LogUtil.error(this.constructor.name, error)
        if (parent.id) {
          await this.taskFailed(parent.id, String(error))
        }
      }
    }
  }

  /**
   * 开始任务
   * @param taskIds 任务id列表
   */
  public async startTaskTree(taskIds: number[]): Promise<void> {
    return this.processTaskTree(taskIds, [
      TaskStatusEnum.CREATED,
      TaskStatusEnum.FAILED,
      TaskStatusEnum.PARTLY_FINISHED,
      TaskStatusEnum.PAUSE
    ])
  }

  /**
   * 重试任务
   * @param taskIds 任务id列表
   */
  public async retryTaskTree(taskIds: number[]): Promise<void> {
    return this.processTaskTree(taskIds, [
      TaskStatusEnum.CREATED,
      TaskStatusEnum.FINISHED,
      TaskStatusEnum.FAILED,
      TaskStatusEnum.PARTLY_FINISHED,
      TaskStatusEnum.PAUSE
    ])
  }

  /**
   * 暂停任务
   * @param task 任务
   * @param resourceWriter
   */
  public async pauseTask(task: Task, resourceWriter: ResourceWriter): Promise<boolean> {
    // 加载插件
    const pluginContributionId = task.pluginContributionId
    assertNotNullish(pluginContributionId, `保存作品信息失败，任务贡献点id不能为空`)
    const plugin = await this.getPlugin(task.pluginPublicId, '保存作品信息失败')
    assertNotNullish(plugin?.id, `暂停任务失败，创建任务的插件id不能为空，taskId: ${task.id}`)
    const taskHandler = await getPluginManager().getContribution(plugin.id, 'taskHandler', pluginContributionId)

    // 创建TaskPluginDTO对象
    const taskPluginDTO = new PluginTaskResParam(task)
    taskPluginDTO.resourcePluginDTO = new PluginResourceDTO()
    taskPluginDTO.resourcePluginDTO.resourceSize = resourceWriter.resourceSize
    taskPluginDTO.resourcePluginDTO.resourceStream = resourceWriter.readable
    taskPluginDTO.resourcePluginDTO.filenameExtension = resourceWriter.resource?.filenameExtension

    // 暂停写入
    const finished = resourceWriter.pause()

    if (!finished) {
      // 调用插件的pause方法
      try {
        await taskHandler.pause(taskPluginDTO)
      } catch (error) {
        LogUtil.error(this.constructor.name, '调用插件的pause方法出错: ', error)
        if (notNullish(resourceWriter.readable)) {
          resourceWriter.readable.pause()
        }
      }
      return true
    } else {
      return false
    }
  }

  /**
   * 暂停任务树
   * @param ids id列表
   */
  public async pauseTaskTree(ids: number[]): Promise<void> {
    const taskQueue = getTaskQueue()
    const taskTree = await taskQueue.listTaskTree(ids, [TaskStatusEnum.PROCESSING, TaskStatusEnum.WAITING])

    for (const parent of taskTree) {
      // 获取要处理的任务
      let children: TaskTreeDTO[]
      if (parent.isCollection && arrayNotEmpty(parent.children)) {
        children = parent.children
      } else if (!parent.isCollection) {
        children = [parent]
      } else {
        continue
      }

      taskQueue.pushBatch(children, TaskOperation.PAUSE)
    }
  }

  /**
   * 停止任务
   * @param task 任务
   * @param resourceWriter
   */
  public async stopTask(task: Task, resourceWriter: ResourceWriter): Promise<boolean> {
    // 加载插件
    const pluginContributionId = task.pluginContributionId
    assertNotNullish(pluginContributionId, `保存作品信息失败，任务贡献点id不能为空`)
    const plugin = await this.getPlugin(task.pluginPublicId, '保存作品信息失败')
    assertNotNullish(plugin?.id, `停止任务失败，创建任务的插件id不能为空，taskId: ${task.id}`)
    const taskHandler = await getPluginManager().getContribution(plugin.id, 'taskHandler', pluginContributionId)

    // 创建TaskPluginDTO对象
    const taskPluginDTO = new PluginTaskResParam(task)
    taskPluginDTO.resourcePluginDTO = new PluginResourceDTO()
    taskPluginDTO.resourcePluginDTO.resourceSize = resourceWriter.resourceSize
    taskPluginDTO.resourcePluginDTO.resourceStream = resourceWriter.readable
    taskPluginDTO.resourcePluginDTO.filenameExtension = resourceWriter.resource?.filenameExtension

    // 暂停写入
    const finished = resourceWriter.pause()

    if (!finished) {
      // 调用插件的pause方法
      try {
        await taskHandler.stop(taskPluginDTO)
      } catch (error) {
        LogUtil.error(this.constructor.name, '调用插件的stop方法出错: ', error)
        if (notNullish(resourceWriter.readable)) {
          resourceWriter.readable.destroy()
        }
      }
      return true
    } else {
      return false
    }
  }

  /**
   * 停止任务树
   * @param ids id列表
   */
  public async stopTaskTree(ids: number[]): Promise<void> {
    const taskQueue = getTaskQueue()
    const taskTree = await taskQueue.listTaskTree(ids, [TaskStatusEnum.PROCESSING, TaskStatusEnum.WAITING])

    for (const parent of taskTree) {
      // 获取要处理的任务
      let children: TaskTreeDTO[]
      if (parent.isCollection && arrayNotEmpty(parent.children)) {
        children = parent.children
      } else if (!parent.isCollection) {
        children = [parent]
      } else {
        continue
      }

      taskQueue.pushBatch(children, TaskOperation.STOP)
    }
  }

  /**
   * 恢复任务
   * @param task 任务
   * @param workId
   * @param resourceWriter
   */
  public async resumeTask(task: Task, workId: number, resourceWriter: ResourceWriter): Promise<TaskProcessResponseDTO> {
    assertNotNullish(task.id, '恢复任务失败，任务id不能为空')
    const taskId = task.id
    assertNotNullish(task.pendingResourceId, `恢复任务失败，任务的处理中的资源id不能为空，taskId: ${taskId}`)
    // 加载插件
    const pluginContributionId = task.pluginContributionId
    assertNotNullish(pluginContributionId, `保存作品信息失败，任务贡献点id不能为空`)
    const plugin = await this.getPlugin(task.pluginPublicId, '保存作品信息失败')
    assertNotNullish(plugin?.id, `暂停任务失败，创建任务的插件id不能为空，taskId: ${taskId}`)
    const taskHandler: TaskHandler = await getPluginManager().getContribution(plugin.id, 'taskHandler', pluginContributionId)

    // 插件用于恢复下载的任务信息
    const taskPluginDTO = new PluginTaskResParam(task)
    // 获取任务writer中的资源信息
    taskPluginDTO.resourcePluginDTO = new PluginResourceDTO()
    taskPluginDTO.resourcePluginDTO.resourceSize = resourceWriter.resourceSize
    taskPluginDTO.resourcePluginDTO.resourceStream = resourceWriter.readable
    taskPluginDTO.resourcePluginDTO.filenameExtension = resourceWriter.resource?.filenameExtension
    const resourceService = new ResourceService()
    taskPluginDTO.resourcePath = await resourceService.getFullResourcePath(task.pendingResourceId)

    // 恢复下载
    const workService = new WorkService()

    // 标记为进行中
    task.status = TaskStatusEnum.PROCESSING
    // 调用插件的resume函数，获取资源
    let pluginResponse: PluginWorkResponseDTO = await taskHandler.resume(taskPluginDTO)
    const resourcePluginDTO = pluginResponse.resource
    assertNotNullish(resourcePluginDTO, `恢复任务失败，插件返回的资源为空，taskId: ${taskId}`)
    assertNotNullish(resourcePluginDTO.resourceStream, `恢复任务失败，插件返回的资源为空，taskId: ${taskId}`)

    const oldWork = await workService.getFullWorkInfoById(workId)
    assertNotNullish(oldWork, `恢复任务失败，任务的作品id不可用，taskId: ${taskId}`)
    // 用旧的作品信息补全插件返回的信息
    pluginResponse = mergeObjects<PluginWorkResponseDTO>(pluginResponse, oldWork, (src) => new PluginWorkResponseDTO(src))
    // 创建资源保存DTO
    const resourceSaveDTO = ResourceService.createSaveInfoFromPlugin(oldWork, pluginResponse, taskId)
    resourceSaveDTO.id = task.pendingResourceId

    LogUtil.info(this.constructor.name, `任务${taskId}恢复下载`)
    return resourceService.resumeSaveResource(resourceSaveDTO, resourceWriter).then(async (saveResult) => {
      if (FileSaveResult.FINISH === saveResult) {
        return new TaskProcessResponseDTO(TaskStatusEnum.FINISHED)
      } else if (FileSaveResult.PAUSE === saveResult) {
        return new TaskProcessResponseDTO(TaskStatusEnum.PAUSE)
      } else {
        throw new Error(`保存资源未返回预期的值，saveResult: ${saveResult}`)
      }
    })
  }

  /**
   * 恢复任务树
   * @param ids id列表
   */
  public async resumeTaskTree(ids: number[]): Promise<void> {
    // 查找id列表对应的所有子任务
    const taskQueue = getTaskQueue()
    const taskTree = await taskQueue.listTaskTree(ids, [TaskStatusEnum.PAUSE])

    for (const parent of taskTree) {
      // 获取要处理的任务
      let children: TaskTreeDTO[]
      if (parent.isCollection && arrayNotEmpty(parent.children)) {
        children = parent.children
      } else if (!parent.isCollection) {
        children = [parent]
      } else {
        continue
      }

      taskQueue.pushBatch(children, TaskOperation.RESUME)
    }
  }

  /**
   * 根据父任务的children刷新其状态
   * @param root 父任务
   */
  public async refreshParentTaskStatus(root: TaskTreeDTO): Promise<TaskStatusEnum> {
    assertNotNullish(root.isCollection, '刷新状态的任务不能为子任务')
    assertTrue(root.isCollection, '刷新状态的任务不能为子任务')
    const originalStatus = root.status
    let newStatus: TaskStatusEnum
    if (notNullish(root.children) && root.children.length > 0) {
      const processing = root.children.filter((child) => TaskStatusEnum.PROCESSING === child.status).length
      const waiting = root.children.filter((child) => TaskStatusEnum.WAITING === child.status).length
      const paused = root.children.filter((child) => TaskStatusEnum.PAUSE === child.status).length
      const finished = root.children.filter((child) => TaskStatusEnum.FINISHED === child.status).length
      const failed = root.children.filter((child) => TaskStatusEnum.FAILED === child.status).length
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
      } else {
        newStatus = TaskStatusEnum.FAILED
      }
    } else {
      newStatus = TaskStatusEnum.FINISHED
    }

    if (isNullish(originalStatus) || originalStatus !== newStatus) {
      const tempRoot = new Task()
      tempRoot.id = root.id
      tempRoot.status = newStatus
      return this.updateById(tempRoot).then(() => newStatus)
    } else {
      return newStatus
    }
  }

  /**
   * 删除任务
   * @param taskIds 任务id列表
   */
  public async deleteTask(taskIds: number[]): Promise<number> {
    let waitingDelete: number[] = []
    const taskTree = await this.dao.listTaskTree(taskIds)
    const root = new TaskTreeDTO()
    root.children = taskTree
    for (const requestDeleteId of taskIds) {
      const tempTask = getNode(root, requestDeleteId)
      if (isNullish(tempTask)) {
        continue
      }
      if (tempTask.isCollection && notNullish(tempTask.children)) {
        const tempChildren = tempTask.children.map((child) => child.id).filter((id) => notNullish(id))
        if (arrayNotEmpty(tempChildren)) {
          waitingDelete = waitingDelete.concat(tempChildren)
        }
      }
      waitingDelete.push(tempTask.id as number)
    }
    if (arrayNotEmpty(waitingDelete)) {
      return this.deleteBatchById(waitingDelete)
    } else {
      return 0
    }
  }

  /**
   * 根据id更新
   * @param updateData
   */
  public async updateById(updateData: Task): Promise<number> {
    const temp = lodash.cloneDeep(updateData)
    if (typeof temp.pluginData === 'object') {
      temp.pluginData = JSON.stringify(temp.pluginData)
    }
    return super.updateById(temp)
  }

  /**
   * 批量更新任务状态
   * @param taskIds
   * @param status
   */
  updateStatusBatchById(taskIds: number[], status: TaskStatusEnum) {
    const tasks = taskIds.map((taskId) => {
      const task = new Task()
      task.id = taskId
      task.status = status
      return task
    })
    return this.updateBatchById(tasks)
  }

  /**
   * 任务进行中
   * @param taskId 任务id
   */
  public async taskProcessing(taskId: Id): Promise<number> {
    assertNotNullish(taskId, '任务标记为进行中失败，任务id不能为空')
    const task = new Task()
    task.id = taskId
    task.status = TaskStatusEnum.PROCESSING
    return this.updateById(task)
  }

  /**
   * 任务等待中
   * @param taskId 任务id
   */
  public async taskWaiting(taskId: Id): Promise<number> {
    assertNotNullish(taskId, '任务标记为进行中失败，任务id不能为空')
    const task = new Task()
    task.id = taskId
    task.status = TaskStatusEnum.WAITING
    return this.updateById(task)
  }

  /**
   * 任务完成
   * @param taskId 任务id
   */
  public taskFinished(taskId: Id): Promise<number> {
    assertNotNullish(taskId, '任务标记为完成失败，任务id不能为空')
    const task = new Task()
    task.id = taskId
    task.status = TaskStatusEnum.FINISHED
    return this.updateById(task)
  }

  /**
   * 暂停任务
   * @param taskId 任务id
   */
  public taskPaused(taskId: Id): Promise<number> {
    assertNotNullish(taskId, '任务标记为暂停失败，任务id不能为空')
    const task = new Task()
    task.id = taskId
    task.status = TaskStatusEnum.PAUSE
    return this.updateById(task)
  }

  /**
   * 任务失败
   * @param taskId 任务id
   * @param errorMessage 错误信息
   */
  public taskFailed(taskId: Id, errorMessage?: string): Promise<number> {
    assertNotNullish(taskId, '任务标记为失败失败，任务id不能为空')
    const task = new Task()
    task.id = taskId
    task.status = TaskStatusEnum.FAILED
    task.errorMessage = errorMessage
    return this.updateById(task)
  }

  /**
   * 主键查询
   * @param id
   */
  public async getById(id: number | string): Promise<Task | undefined> {
    return this.dao.getById(id).then((task) => (isNullish(task) ? undefined : new Task(task)))
  }

  /**
   * 分页查询父任务
   * @param page
   */
  public async queryParentPage(page: Page<TaskQueryDTO, Task>): Promise<Page<TaskQueryDTO, TaskProgressTreeDTO>> {
    if (notNullish(page.query)) {
      page.query.operators = {
        ...{ taskName: Operator.LIKE },
        ...page.query.operators
      }
    }
    const sourcePage = await this.dao.queryParentPage(page)
    const resultPage = sourcePage.transform<TaskProgressTreeDTO>()
    const tasks = sourcePage.data
    if (notNullish(tasks) && tasks.length > 0) {
      // 查询站点信息
      const siteIds = tasks.map((tempTask) => tempTask.siteId).filter(notNullish)
      let idSiteMap: Map<number, Site[]>
      if (arrayNotEmpty(siteIds)) {
        const siteService = new SiteService()
        const sites = await siteService.listByIds(siteIds)
        idSiteMap = Map.groupBy<number, Site>(sites, (site) => site.id as number)
      }
      resultPage.data = tasks.map((task) => {
        const dto = new TaskProgressTreeDTO(task)
        dto.hasChildren = dto.isCollection
        dto.children = []
        // 写入站点名称
        if (notNullish(idSiteMap)) {
          const tempSites = idSiteMap.get(task.siteId as number)
          dto.siteName = tempSites?.[0].siteName
        }
        return dto
      })
    }
    return resultPage
  }

  /**
   * 获取父任务的子任务
   * @param pid
   */
  public listChildrenTask(pid: number): Promise<Task[]> {
    const query = new TaskQueryDTO()
    query.pid = pid
    return this.dao.list(query)
  }

  /**
   * 获取父任务的子任务
   * @param pidList
   */
  public listChildrenByParentsTask(pidList: number[]): Promise<Task[]> {
    const query = new TaskQueryDTO()
    query.pid = pidList
    query.operators = { pid: Operator.IN }
    return this.dao.list(query)
  }

  /**
   * 分页查询父任务的子任务
   * @param page
   */
  public async queryChildrenTaskPage(page: Page<TaskQueryDTO, Task>): Promise<Page<TaskQueryDTO, TaskProgressTreeDTO>> {
    page = new Page(page)
    if (notNullish(page.query)) {
      page.query.operators = {
        ...{ taskName: Operator.LIKE },
        ...page.query.operators
      }
      page.query.isCollection = false
    }
    const sourcePage = await super.queryPage(page)
    const resultPage = sourcePage.transform<TaskProgressTreeDTO>()
    const tasks = sourcePage.data
    if (arrayNotEmpty(tasks)) {
      // 查询站点信息
      const siteIds = [...new Set(tasks.map((tempTask) => tempTask.siteId).filter(notNullish))]
      let idSiteMap: Map<number, Site[]>
      if (arrayNotEmpty(siteIds)) {
        const siteService = new SiteService()
        const sites = await siteService.listByIds(siteIds)
        idSiteMap = Map.groupBy<number, Site>(sites, (site) => site.id as number)
      }
      resultPage.data = tasks.map((task) => {
        const dto = new TaskProgressTreeDTO(task)
        dto.hasChildren = dto.isCollection
        dto.children = []
        // 写入站点名称
        if (notNullish(idSiteMap)) {
          const tempSites = idSiteMap.get(task.siteId as number)
          dto.siteName = tempSites?.[0].siteName
        }
        // 从任务队列中查询任务状态
        const tempStatus = getTaskQueue().getTaskStatus(task.id as number)
        if (tempStatus !== undefined) {
          dto.status = tempStatus
        }
        return dto
      })
    }
    return resultPage
  }

  /**
   * 分页查询parent-children结构的任务
   * @param page
   */
  public async queryTreeDataPage(page: Page<TaskQueryDTO, Task>): Promise<Page<TaskQueryDTO, Task>> {
    if (notNullish(page.query)) {
      page.query.operators = {
        ...{ taskName: Operator.LIKE },
        ...page.query.operators
      }
    }
    const sourcePage = await super.queryPage(page)
    const resultPage = sourcePage.transform<TaskTreeDTO>()

    // 组装为树形数据
    if (notNullish(sourcePage.data) && sourcePage.data.length > 0) {
      const tasks = sourcePage.data.map((task) => new TaskTreeDTO(task))
      for (let index = 0; index < tasks.length; index++) {
        if (tasks[index].isCollection) {
          // 初始化children数组
          if (isNullish(tasks[index].children)) {
            tasks[index].children = []
          }

          // 查找数组前面这个父任务的所有任务
          let lessIndex = 0
          while (lessIndex < index) {
            if (tasks[lessIndex].pid === tasks[index].id) {
              const childTask = tasks.splice(lessIndex, 1)[0]
              index--
              tasks[index].children?.push(childTask)
              continue
            }
            lessIndex++
          }
          // 查找数组后面这个父任务的所有任务
          let greaterIndex = index + 1
          while (greaterIndex < tasks.length) {
            if (tasks[greaterIndex].pid === tasks[index].id) {
              const childTask = tasks.splice(greaterIndex, 1)[0]
              tasks[index].children?.push(childTask)
              continue
            }
            greaterIndex++
          }
        }
      }
      resultPage.data = tasks
    }

    return resultPage
  }

  /**
   * 查询状态列表
   * @param ids
   */
  public async listStatus(ids: number[]): Promise<TaskScheduleDTO[]> {
    return this.dao.listStatus(ids)
  }

  /**
   * 查询任务进度
   * @param ids id列表
   */
  public async listSchedule(ids: number[]): Promise<TaskScheduleDTO[]> {
    let result: TaskScheduleDTO[] = []
    // 没有监听器的任务
    const noListenerIds: number[] = []
    const taskQueue = getTaskQueue()
    ids.forEach((id: number) => {
      const schedule = taskQueue.getSchedule(id)
      if (notNullish(schedule)) {
        result.push(schedule)
      } else {
        noListenerIds.push(id)
      }
    })
    // 没有监听器的任务去数据库查询状态
    if (arrayNotEmpty(noListenerIds)) {
      const noListener = await this.listStatus(noListenerIds)
      result = result.concat(noListener)
    }
    return result
  }

  /**
   * 获取插件信息
   * @param pluginPublicId
   * @param logPrefix
   * @private
   */
  private async getPlugin(pluginPublicId: string | undefined | null, logPrefix: string): Promise<Plugin> {
    assertNotNullish(pluginPublicId, `${logPrefix}，任务的插件公开id不能为空`)
    const pluginService = new PluginService()
    const plugin = await pluginService.getByPublicId(pluginPublicId)
    assertNotNullish(plugin, `${logPrefix}，任务的插件公开id不能为空`)
    return plugin
  }
}
