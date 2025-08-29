import Task from '../model/entity/Task.ts'
import LogUtil from '../util/LogUtil.ts'
import TaskDao from '../dao/TaskDao.ts'
import PluginLoader from '../plugin/PluginLoader.ts'
import { TaskStatusEnum } from '../constant/TaskStatusEnum.ts'
import TaskQueryDTO from '../model/queryDTO/TaskQueryDTO.ts'
import PluginService from './PluginService.ts'
import PluginTaskUrlListenerService from './PluginTaskUrlListenerService.ts'
import WorksService from './WorksService.ts'
import Plugin from '../model/entity/Plugin.ts'
import { Readable } from 'node:stream'
import BaseService from '../base/BaseService.ts'
import DatabaseClient from '../database/DatabaseClient.ts'
import lodash from 'lodash'
import { ArrayIsEmpty, ArrayNotEmpty, IsNullish, NotNullish } from '../util/CommonUtil.ts'
import Page from '../model/util/Page.ts'
import { Operator } from '../constant/CrudConstant.ts'
import TaskTreeDTO from '../model/dto/TaskTreeDTO.ts'
import { TaskHandler, TaskHandlerFactory } from '../plugin/TaskHandler.ts'
import TaskCreateDTO from '../model/dto/TaskCreateDTO.ts'
import TaskScheduleDTO from '../model/dto/TaskScheduleDTO.ts'
import { PluginTaskResParam } from '../plugin/PluginTaskResParam.ts'
import PluginWorksResponseDTO from '../model/dto/PluginWorksResponseDTO.ts'
import { GVar, GVarEnum } from '../base/GVar.ts'
import TaskCreateResponse from '../model/util/TaskCreateResponse.ts'
import { AssertArrayNotEmpty, AssertNotBlank, AssertNotNullish, AssertTrue } from '../util/AssertUtil.js'
import { GetNode } from '../util/TreeUtil.js'
import { Id } from '../base/BaseEntity.js'
import ResourceWriter from '../util/ResourceWriter.js'
import { FileSaveResult } from '../constant/FileSaveResult.js'
import { TaskOperation } from '../base/TaskQueue.js'
import TaskProgressTreeDTO from '../model/dto/TaskProgressTreeDTO.js'
import Works from '../model/entity/Works.js'
import ObjectUtil from '../util/ObjectUtil.js'
import SiteService from './SiteService.js'
import Site from '../model/entity/Site.js'
import CreateTaskWritable from '../util/CreateTaskWritableR.js'
import ResourceService from './ResourceService.js'
import PluginCreateTaskResponseDTO from '../model/dto/PluginCreateTaskResponseDTO.js'
import PluginCreateParentTaskResponseDTO from '../model/dto/PluginCreateParentTaskResponseDTO.js'
import WorksSaveDTO from '../model/dto/WorksSaveDTO.js'
import ResourceSaveDTO from '../model/dto/ResourceSaveDTO.js'
import WorksFullDTO from '../model/dto/WorksFullDTO.js'
import Resource from '../model/entity/Resource.js'
import ResourcePluginDTO from '../model/dto/ResourcePluginDTO.js'
import TaskProcessResponseDTO from '../model/dto/TaskProcessResponseDTO.js'

export default class TaskService extends BaseService<TaskQueryDTO, Task, TaskDao> {
  constructor(db?: DatabaseClient) {
    super(TaskDao, db)
  }

  /**
   * 根据传入的url创建任务
   * @param url 作品/作品集所在url
   */
  public async createTask(url: string): Promise<TaskCreateResponse> {
    // 查询监听此url的插件
    const pluginTaskUrlListenerService = new PluginTaskUrlListenerService()
    const taskPlugins = await pluginTaskUrlListenerService.listListener(url)

    if (taskPlugins.length === 0) {
      const msg = `url不受支持，url: ${url}`
      LogUtil.info(this.constructor.name, msg)
      return new TaskCreateResponse({
        succeed: false,
        addedQuantity: 0,
        msg: msg,
        plugin: undefined
      })
    }

    // 插件加载器
    const pluginLoader = new PluginLoader(new TaskHandlerFactory(), new PluginService(this.db))

    // 按照排序尝试每个插件
    for (const taskPlugin of taskPlugins) {
      // 查询插件信息，用于输出日志
      const pluginService = new PluginService()
      const pluginInfo = JSON.stringify(await pluginService.getById(taskPlugin.id as number))

      try {
        // 加载插件
        if (IsNullish(taskPlugin.id)) {
          const msg = `任务的插件id不能为空，taskId: ${taskPlugin.id}`
          LogUtil.error(this.constructor.name, msg)
          continue
        }
        const taskHandler = await pluginLoader.load(taskPlugin.id)

        // 任务集
        const parentTask = new TaskCreateDTO()
        parentTask.pluginAuthor = taskPlugin.author
        parentTask.pluginName = taskPlugin.name
        parentTask.pluginVersion = taskPlugin.version
        parentTask.url = url
        parentTask.status = TaskStatusEnum.CREATED
        parentTask.isCollection = true
        parentTask.saved = false

        // 创建任务
        const pluginResponse = await taskHandler.create(url)

        // 分别处理数组类型和流类型的响应值
        const pluginProcessResult = await this.transaction<TaskCreateResponse | undefined>(async () => {
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
        }, '创建任务')
        if (NotNullish(pluginProcessResult)) {
          return pluginProcessResult
        }
      } catch (error) {
        LogUtil.error(this.constructor.name, `插件创建任务失败，url: ${url}，plugin: ${pluginInfo}，error:`, error)
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
    taskPlugin: Plugin
  ): Promise<number> {
    // 查询插件信息，用于输出日志
    const pluginInfo = JSON.stringify(taskPlugin)
    // 校验是否返回了空数据或非数组
    AssertArrayNotEmpty(pluginParentTaskResponseDTOS, this.constructor.name, `插件未创建任务，url: ${url}，plugin: ${pluginInfo}`)
    const childrenSavePromise: Promise<number>[] = []
    let childrenCount = 0
    // 用于查询和缓存站点id
    const siteService = new SiteService()
    const siteCache = new Map<string, Promise<number>>()
    // 给任务赋值的函数
    const assignTask = async (task: TaskCreateDTO, pid?: number): Promise<void> => {
      // 校验
      AssertNotBlank(task.siteDomain, this.constructor.name, '创建任务失败，插件返回的任务信息中缺少站点域名')
      AssertNotBlank(task.siteWorksId, this.constructor.name, '创建任务失败，插件返回的任务信息中缺少站点作品id')
      task.status = TaskStatusEnum.CREATED
      task.isCollection = false
      task.pid = pid
      task.pluginAuthor = taskPlugin.author
      task.pluginName = taskPlugin.name
      task.pluginVersion = taskPlugin.version
      // 根据站点域名查询站点id
      let siteId: Promise<number | null | undefined> | null | undefined = siteCache.get(task.siteDomain)
      if (IsNullish(siteId)) {
        const tempSite = siteService.getByDomain(task.siteDomain)
        siteId = tempSite.then((site) => site?.id)
      }
      task.siteId = await siteId
      AssertNotNullish(task.siteId, this.constructor.name, `创建任务失败，没有找到域名${task.siteDomain}对应的站点`)
      try {
        task.pluginData = JSON.stringify(task.pluginData)
      } catch (error) {
        LogUtil.error(
          this.constructor.name,
          `序列化插件保存的pluginData失败，url: ${url}，plugin: ${pluginInfo}，pluginData: ${task.pluginData}，error:`,
          error
        )
        return
      }
    }
    for (const parentTaskResponseDTO of pluginParentTaskResponseDTOS) {
      const childrenResponseDTOS = parentTaskResponseDTO.children
      if (ArrayIsEmpty(childrenResponseDTOS)) {
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
  public async handleCreateTaskStream(createTaskStream: Readable, taskPlugin: Plugin, batchSize: number): Promise<number> {
    // 最终用于返回的Promise
    return new Promise<number>((resolve, reject) => {
      const writable = new CreateTaskWritable(this, new SiteService(this.db), taskPlugin, batchSize)
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
   * @param pluginLoader
   */
  public async saveWorksInfo(task: Task, pluginLoader: PluginLoader<TaskHandler>): Promise<number> {
    AssertNotNullish(task.id, this.constructor.name, `保存作品信息失败，任务id不能为空`)
    const taskId = task.id
    // 加载插件
    const plugin = await this.getPluginInfo(task.pluginAuthor, task.pluginName, task.pluginVersion, '保存作品信息失败')
    AssertNotNullish(plugin, this.constructor.name, `保存作品信息失败，创建任务的插件不可用`)
    AssertNotNullish(plugin.id, this.constructor.name, `保存作品信息失败，创建任务的插件id不能为空`)
    task.pluginAuthor = plugin.author
    task.pluginName = plugin.name
    task.pluginVersion = plugin.version
    const taskHandler: TaskHandler = await pluginLoader.load(plugin.id)

    // 调用插件的createWorksInfo方法，获取作品信息
    let worksPluginDTO: PluginWorksResponseDTO
    try {
      worksPluginDTO = await taskHandler.createWorksInfo(task)
    } catch (error) {
      LogUtil.error(this.constructor.name, `任务${taskId}调用插件获取作品信息时失败`, error)
      throw error
    }
    worksPluginDTO.works.siteId = task.siteId

    // 保存远程资源是否可接续
    task.continuable = IsNullish(worksPluginDTO.resource?.continuable) ? false : worksPluginDTO.resource.continuable
    const updateContinuableTask = new Task()
    updateContinuableTask.id = taskId
    updateContinuableTask.continuable = task.continuable
    await this.updateById(updateContinuableTask)

    // 生成作品保存用的信息
    const worksSaveInfo = await WorksService.createSaveInfoFromPlugin(worksPluginDTO, taskId)

    // 保存作品信息
    const worksService = new WorksService()
    return worksService.saveOrUpdateWorksInfos(worksSaveInfo, false)
  }

  /**
   * 处理任务
   * @param task
   * @param worksId
   * @param pluginLoader
   * @param resourceWriter
   */
  public async startTask(
    task: Task,
    worksId: number,
    pluginLoader: PluginLoader<TaskHandler>,
    resourceWriter: ResourceWriter
  ): Promise<TaskProcessResponseDTO> {
    AssertNotNullish(task.id, this.constructor.name, `开始任务失败，任务id不能为空`)
    const taskId = task.id

    const worksService = new WorksService()

    // 加载插件
    const plugin = await this.getPluginInfo(task.pluginAuthor, task.pluginName, task.pluginVersion, '开始任务失败')
    AssertNotNullish(plugin?.id, this.constructor.name, `开始任务失败，创建任务的插件id不能为空`)

    // 调用插件的start方法，获取资源
    let pluginResponse: PluginWorksResponseDTO
    try {
      const taskHandler: TaskHandler = await pluginLoader.load(plugin.id)
      pluginResponse = await taskHandler.start(task)
    } catch (error) {
      LogUtil.error(this.constructor.name, `任务${taskId}调用插件开始时失败`, error)
      return new TaskProcessResponseDTO(TaskStatusEnum.FAILED, error as Error)
    }
    AssertNotNullish(pluginResponse.resource?.resourceStream, this.constructor.name, `插件没有返回任务${taskId}的资源`)

    const oldWorks = await worksService.getFullWorksInfoById(worksId)
    AssertNotNullish(oldWorks, `开始任务失败，任务的作品id不可用，taskId: ${taskId}`)
    // 用已经保存在数据库里的作品信息补全插件返回的作品信息
    pluginResponse.works = ObjectUtil.mergeObjects<Works>(pluginResponse.works, new Works(oldWorks), (src) => new Works(src))
    // 创建资源保存DTO
    const temp = await TaskService.createResAndWorksSaveData(oldWorks, pluginResponse, taskId, worksId)
    const resourceSaveDTO = temp.resourceSaveDTO
    // 判断是否需要更新作品数据
    if (pluginResponse.doUpdate) {
      const newWorksSaveInfo = temp.newWorksSaveInfo
      newWorksSaveInfo.id = worksId
      await worksService.saveOrUpdateWorksInfos(newWorksSaveInfo, true)
    }
    // 查询作品已经存在的可用资源
    const resService = new ResourceService()
    const activeRes = await resService.getActiveByWorksId(worksId)
    if (IsNullish(activeRes)) {
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
    const resSavePromise: Promise<FileSaveResult> = IsNullish(activeRes)
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
    const taskQueue = GVar.get(GVarEnum.TASK_QUEUE)
    const taskTree = await taskQueue.listTaskTree(taskIds, includeStatus)

    for (const parent of taskTree) {
      try {
        // 获取要处理的任务
        let children: TaskTreeDTO[]
        if (parent.isCollection && ArrayNotEmpty(parent.children)) {
          children = parent.children
        } else if (!parent.isCollection) {
          children = [parent]
        } else {
          continue
        }

        await taskQueue.pushBatch(children, TaskOperation.START)
      } catch (error) {
        LogUtil.error(this.constructor.name, error)
        await this.taskFailed(parent.id, String(error))
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
   * @param pluginLoader 插件加载器
   * @param resourceWriter
   */
  public async pauseTask(task: Task, pluginLoader: PluginLoader<TaskHandler>, resourceWriter: ResourceWriter): Promise<boolean> {
    // 加载插件
    const plugin = await this.getPluginInfo(task.pluginAuthor, task.pluginName, task.pluginVersion, '暂停任务失败')
    AssertNotNullish(plugin?.id, this.constructor.name, `暂停任务失败，创建任务的插件id不能为空，taskId: ${task.id}`)
    const taskHandler = await pluginLoader.load(plugin.id)

    // 创建TaskPluginDTO对象
    const taskPluginDTO = new PluginTaskResParam(task)
    taskPluginDTO.resourcePluginDTO = new ResourcePluginDTO()
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
        if (NotNullish(resourceWriter.readable)) {
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
    const taskQueue = GVar.get(GVarEnum.TASK_QUEUE)
    const taskTree = await taskQueue.listTaskTree(ids, [TaskStatusEnum.PROCESSING, TaskStatusEnum.WAITING])

    for (const parent of taskTree) {
      // 获取要处理的任务
      let children: TaskTreeDTO[]
      if (parent.isCollection && ArrayNotEmpty(parent.children)) {
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
   * @param pluginLoader 插件加载器
   * @param resourceWriter
   */
  public async stopTask(task: Task, pluginLoader: PluginLoader<TaskHandler>, resourceWriter: ResourceWriter): Promise<boolean> {
    // 加载插件
    const plugin = await this.getPluginInfo(task.pluginAuthor, task.pluginName, task.pluginVersion, '停止任务失败')
    AssertNotNullish(plugin?.id, this.constructor.name, `停止任务失败，创建任务的插件id不能为空，taskId: ${task.id}`)
    const taskHandler = await pluginLoader.load(plugin.id)

    // 创建TaskPluginDTO对象
    const taskPluginDTO = new PluginTaskResParam(task)
    taskPluginDTO.resourcePluginDTO = new ResourcePluginDTO()
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
        if (NotNullish(resourceWriter.readable)) {
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
    const taskQueue = GVar.get(GVarEnum.TASK_QUEUE)
    const taskTree = await taskQueue.listTaskTree(ids, [TaskStatusEnum.PROCESSING, TaskStatusEnum.WAITING])

    for (const parent of taskTree) {
      // 获取要处理的任务
      let children: TaskTreeDTO[]
      if (parent.isCollection && ArrayNotEmpty(parent.children)) {
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
   * @param worksId
   * @param pluginLoader 插件加载器
   * @param resourceWriter
   */
  public async resumeTask(
    task: Task,
    worksId: number,
    pluginLoader: PluginLoader<TaskHandler>,
    resourceWriter: ResourceWriter
  ): Promise<TaskProcessResponseDTO> {
    AssertNotNullish(task.id, this.constructor.name, '恢复任务失败，任务id不能为空')
    const taskId = task.id
    AssertNotNullish(task.pendingResourceId, this.constructor.name, `恢复任务失败，任务的处理中的资源id不能为空，taskId: ${taskId}`)
    // 加载插件
    const plugin = await this.getPluginInfo(task.pluginAuthor, task.pluginName, task.pluginVersion, '恢复任务失败')
    AssertNotNullish(plugin?.id, this.constructor.name, `暂停任务失败，创建任务的插件id不能为空，taskId: ${taskId}`)
    const taskHandler: TaskHandler = await pluginLoader.load(plugin.id)

    // 插件用于恢复下载的任务信息
    const taskPluginDTO = new PluginTaskResParam(task)
    // 获取任务writer中的资源信息
    taskPluginDTO.resourcePluginDTO = new ResourcePluginDTO()
    taskPluginDTO.resourcePluginDTO.resourceSize = resourceWriter.resourceSize
    taskPluginDTO.resourcePluginDTO.resourceStream = resourceWriter.readable
    taskPluginDTO.resourcePluginDTO.filenameExtension = resourceWriter.resource?.filenameExtension
    const resourceService = new ResourceService()
    taskPluginDTO.resourcePath = await resourceService.getFullResourcePath(task.pendingResourceId)

    // 恢复下载
    const worksService = new WorksService()

    // 标记为进行中
    task.status = TaskStatusEnum.PROCESSING
    // 调用插件的resume函数，获取资源
    let pluginResponse: PluginWorksResponseDTO = await taskHandler.resume(taskPluginDTO)
    const resourcePluginDTO = pluginResponse.resource
    AssertNotNullish(resourcePluginDTO, this.constructor.name, `恢复任务失败，插件返回的资源为空，taskId: ${taskId}`)
    AssertNotNullish(resourcePluginDTO.resourceStream, this.constructor.name, `恢复任务失败，插件返回的资源为空，taskId: ${taskId}`)

    const oldWorks = await worksService.getFullWorksInfoById(worksId)
    AssertNotNullish(oldWorks, `恢复任务失败，任务的作品id不可用，taskId: ${taskId}`)
    // 用旧的作品信息补全插件返回的信息
    pluginResponse = ObjectUtil.mergeObjects<PluginWorksResponseDTO>(
      pluginResponse,
      oldWorks,
      (src) => new PluginWorksResponseDTO(src)
    )
    // 创建资源保存DTO
    const temp = await TaskService.createResAndWorksSaveData(oldWorks, pluginResponse, taskId, worksId)
    const resourceSaveDTO = temp.resourceSaveDTO
    resourceSaveDTO.id = task.pendingResourceId
    // 判断是否需要更新作品数据
    if (pluginResponse.doUpdate) {
      const newWorksSaveInfo = temp.newWorksSaveInfo
      newWorksSaveInfo.id = worksId
      await worksService.saveOrUpdateWorksInfos(newWorksSaveInfo, true)
    }

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
    const taskQueue = GVar.get(GVarEnum.TASK_QUEUE)
    const taskTree = await taskQueue.listTaskTree(ids, [TaskStatusEnum.PAUSE])

    for (const parent of taskTree) {
      // 获取要处理的任务
      let children: TaskTreeDTO[]
      if (parent.isCollection && ArrayNotEmpty(parent.children)) {
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
    AssertNotNullish(root.isCollection, this.constructor.name, '刷新状态的任务不能为子任务')
    AssertTrue(root.isCollection, this.constructor.name, '刷新状态的任务不能为子任务')
    const originalStatus = root.status
    let newStatus: TaskStatusEnum
    if (NotNullish(root.children) && root.children.length > 0) {
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

    if (IsNullish(originalStatus) || originalStatus !== newStatus) {
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
      const tempTask = GetNode(root, requestDeleteId)
      if (IsNullish(tempTask)) {
        continue
      }
      if (tempTask.isCollection && NotNullish(tempTask.children)) {
        const tempChildren = tempTask.children.map((child) => child.id).filter((id) => NotNullish(id))
        if (ArrayNotEmpty(tempChildren)) {
          waitingDelete = waitingDelete.concat(tempChildren)
        }
      }
      waitingDelete.push(tempTask.id as number)
    }
    if (ArrayNotEmpty(waitingDelete)) {
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
    AssertNotNullish(taskId, this.constructor.name, '任务标记为进行中失败，任务id不能为空')
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
    AssertNotNullish(taskId, this.constructor.name, '任务标记为进行中失败，任务id不能为空')
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
    AssertNotNullish(taskId, this.constructor.name, '任务标记为完成失败，任务id不能为空')
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
    AssertNotNullish(taskId, this.constructor.name, '任务标记为暂停失败，任务id不能为空')
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
    AssertNotNullish(taskId, this.constructor.name, '任务标记为失败失败，任务id不能为空')
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
    return this.dao.getById(id).then((task) => (IsNullish(task) ? undefined : new Task(task)))
  }

  /**
   * 分页查询父任务
   * @param page
   */
  public async queryParentPage(page: Page<TaskQueryDTO, Task>): Promise<Page<TaskQueryDTO, TaskProgressTreeDTO>> {
    if (NotNullish(page.query)) {
      page.query.operators = {
        ...{ taskName: Operator.LIKE, siteDomain: Operator.LIKE },
        ...page.query.operators
      }
    }
    const sourcePage = await this.dao.queryParentPage(page)
    const resultPage = sourcePage.transform<TaskProgressTreeDTO>()
    const tasks = sourcePage.data
    if (NotNullish(tasks) && tasks.length > 0) {
      // 查询站点信息
      const siteIds = tasks.map((tempTask) => tempTask.siteId).filter(NotNullish)
      let idSiteMap: Map<number, Site[]>
      if (ArrayNotEmpty(siteIds)) {
        const siteService = new SiteService()
        const sites = await siteService.listByIds(siteIds)
        idSiteMap = Map.groupBy<number, Site>(sites, (site) => site.id as number)
      }
      resultPage.data = tasks.map((task) => {
        const dto = new TaskProgressTreeDTO(task)
        dto.hasChildren = dto.isCollection
        dto.children = []
        // 写入站点名称
        if (NotNullish(idSiteMap)) {
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
    if (NotNullish(page.query)) {
      page.query.operators = {
        ...{ taskName: Operator.LIKE, siteDomain: Operator.LIKE },
        ...page.query.operators
      }
      page.query.isCollection = false
    }
    const sourcePage = await super.queryPage(page)
    const resultPage = sourcePage.transform<TaskProgressTreeDTO>()
    const tasks = sourcePage.data
    if (ArrayNotEmpty(tasks)) {
      // 查询站点信息
      const siteIds = tasks.map((tempTask) => tempTask.siteId).filter(NotNullish)
      let idSiteMap: Map<number, Site[]>
      if (ArrayNotEmpty(siteIds)) {
        const siteService = new SiteService()
        const sites = await siteService.listByIds(siteIds)
        idSiteMap = Map.groupBy<number, Site>(sites, (site) => site.id as number)
      }
      resultPage.data = tasks.map((task) => {
        const dto = new TaskProgressTreeDTO(task)
        dto.hasChildren = dto.isCollection
        dto.children = []
        // 写入站点名称
        if (NotNullish(idSiteMap)) {
          const tempSites = idSiteMap.get(task.siteId as number)
          dto.siteName = tempSites?.[0].siteName
        }
        // 从任务队列中查询任务状态
        const tempStatus = GVar.get(GVarEnum.TASK_QUEUE).getTaskStatus(task.id as number)
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
    if (NotNullish(page.query)) {
      page.query.operators = {
        ...{ taskName: Operator.LIKE },
        ...page.query.operators
      }
    }
    const sourcePage = await super.queryPage(page)
    const resultPage = sourcePage.transform<TaskTreeDTO>()

    // 组装为树形数据
    if (NotNullish(sourcePage.data) && sourcePage.data.length > 0) {
      const tasks = sourcePage.data.map((task) => new TaskTreeDTO(task))
      for (let index = 0; index < tasks.length; index++) {
        if (tasks[index].isCollection) {
          // 初始化children数组
          if (IsNullish(tasks[index].children)) {
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
    const taskQueue = GVar.get(GVarEnum.TASK_QUEUE)
    ids.forEach((id: number) => {
      const schedule = taskQueue.getSchedule(id)
      if (NotNullish(schedule)) {
        result.push(schedule)
      } else {
        noListenerIds.push(id)
      }
    })
    // 没有监听器的任务去数据库查询状态
    if (ArrayNotEmpty(noListenerIds)) {
      const noListener = await this.listStatus(noListenerIds)
      result = result.concat(noListener)
    }
    return result
  }

  /**
   * 获取插件信息
   * @param author
   * @param name
   * @param version
   * @param logPrefix
   * @private
   */
  private async getPluginInfo(
    author: string | undefined | null,
    name: string | undefined | null,
    version: string | undefined | null,
    logPrefix: string
  ): Promise<Plugin | undefined> {
    const pluginService = new PluginService()
    AssertNotBlank(author, this.constructor.name, `${logPrefix}，创建任务的插件的作者不能为空`)
    AssertNotBlank(name, this.constructor.name, `${logPrefix}，创建任务的插件的名称不能为空`)
    AssertNotBlank(version, this.constructor.name, `${logPrefix}，创建任务的插件的版本不能为空`)
    return pluginService.getByInfo(author, name, version)
  }

  /**
   * 创建资源保存DTO和作品信息保存DTO
   * @param oldWorksFullDTO 调用插件前保存的作品信息
   * @param pluginResponse 插件返回的数据
   * @param taskId 任务id
   * @param worksId 作品id
   * @private
   */
  private static async createResAndWorksSaveData(
    oldWorksFullDTO: WorksFullDTO,
    pluginResponse: PluginWorksResponseDTO,
    taskId: number,
    worksId: number
  ): Promise<{ resourceSaveDTO: ResourceSaveDTO; newWorksSaveInfo: WorksSaveDTO }> {
    // 用旧的作品信息补全插件返回的信息
    const tempResponse = ObjectUtil.mergeObjects<PluginWorksResponseDTO>(
      pluginResponse,
      oldWorksFullDTO,
      (src) => new PluginWorksResponseDTO(src)
    )
    tempResponse.works = new Works(oldWorksFullDTO)
    const newWorksSaveInfo = await WorksService.createSaveInfoFromPlugin(tempResponse, taskId)
    // 创建资源保存DTO
    let resourceSaveDTO: ResourceSaveDTO | undefined
    if (pluginResponse.doUpdate) {
      newWorksSaveInfo.resource = new Resource()
      newWorksSaveInfo.resource.worksId = worksId
      newWorksSaveInfo.resource.taskId = taskId
      newWorksSaveInfo.resource.filenameExtension = pluginResponse.resource?.filenameExtension
      newWorksSaveInfo.resource.suggestedName = pluginResponse.resource?.suggestedName
      newWorksSaveInfo.resource.importMethod = pluginResponse.resource?.importMethod
      newWorksSaveInfo.resource.resourceSize = pluginResponse.resource?.resourceSize
      resourceSaveDTO = await ResourceService.createSaveInfo(newWorksSaveInfo)
    } else {
      const temp = new WorksFullDTO(oldWorksFullDTO)
      temp.resource = new Resource()
      temp.resource.worksId = worksId
      temp.resource.taskId = taskId
      temp.resource.filenameExtension = pluginResponse.resource?.filenameExtension
      temp.resource.suggestedName = pluginResponse.resource?.suggestedName
      temp.resource.importMethod = pluginResponse.resource?.importMethod
      temp.resource.resourceSize = pluginResponse.resource?.resourceSize
      resourceSaveDTO = await ResourceService.createSaveInfo(temp)
    }
    resourceSaveDTO.worksId = worksId
    resourceSaveDTO.taskId = taskId
    resourceSaveDTO.resourceStream = pluginResponse.resource?.resourceStream
    return { resourceSaveDTO, newWorksSaveInfo }
  }
}
