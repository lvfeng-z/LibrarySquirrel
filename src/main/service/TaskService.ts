import Task from '../model/entity/Task.ts'
import LogUtil from '../util/LogUtil.ts'
import TaskDao from '../dao/TaskDao.ts'
import PluginLoader from '../plugin/PluginLoader.ts'
import { TaskStatusEnum } from '../constant/TaskStatusEnum.ts'
import TaskQueryDTO from '../model/queryDTO/TaskQueryDTO.ts'
import PluginService from './PluginService.ts'
import TaskPluginListenerService from './TaskPluginListenerService.ts'
import WorksService from './WorksService.ts'
import Plugin from '../model/entity/Plugin.ts'
import { Readable } from 'node:stream'
import BaseService from '../base/BaseService.ts'
import DB from '../database/DB.ts'
import lodash from 'lodash'
import { ArrayNotEmpty, IsNullish, NotNullish } from '../util/CommonUtil.ts'
import Page from '../model/util/Page.ts'
import { Operator } from '../constant/CrudConstant.ts'
import TaskTreeDTO from '../model/dto/TaskTreeDTO.ts'
import { TaskHandler, TaskHandlerFactory } from '../plugin/TaskHandler.ts'
import TaskCreateDTO from '../model/dto/TaskCreateDTO.ts'
import TaskScheduleDTO from '../model/dto/TaskScheduleDTO.ts'
import { TaskPluginDTO } from '../model/dto/TaskPluginDTO.ts'
import fs from 'fs'
import PluginWorksResponseDTO from '../model/dto/PluginWorksResponseDTO.ts'
import { GlobalVar, GlobalVars } from '../base/GlobalVar.ts'
import path from 'path'
import TaskCreateResponse from '../model/util/TaskCreateResponse.ts'
import { AssertArrayNotEmpty, AssertNotBlank, AssertNotNullish, AssertTrue } from '../util/AssertUtil.js'
import { CreateDirIfNotExists } from '../util/FileSysUtil.js'
import { GetNode } from '../util/TreeUtil.js'
import { Id } from '../base/BaseEntity.js'
import TaskWriter from '../util/TaskWriter.js'
import { FileSaveResult } from '../constant/FileSaveResult.js'
import { TaskOperation } from '../base/TaskQueue.js'
import TaskProgressTreeDTO from '../model/dto/TaskProgressTreeDTO.js'
import Works from '../model/entity/Works.js'
import ObjectUtil from '../util/ObjectUtil.js'
import SiteService from './SiteService.js'
import Site from '../model/entity/Site.js'
import CreateTaskWritable from '../model/util/CreateTaskWritable.js'
import ResourceService from './ResourceService.js'
import Resource from '../model/entity/Resource.js'
import { BOOL } from '../constant/BOOL.js'
import { OriginType } from '../constant/OriginType.js'
import PluginTaskResponseDTO from '../model/dto/PluginTaskResponseDTO.js'

export default class TaskService extends BaseService<TaskQueryDTO, Task, TaskDao> {
  constructor(db?: DB) {
    super(TaskDao, db)
  }

  /**
   * 根据传入的url创建任务
   * @param url 作品/作品集所在url
   */
  public async createTask(url: string): Promise<TaskCreateResponse> {
    // 查询监听此url的插件
    const taskPluginListenerService = new TaskPluginListenerService()
    const taskPlugins = await taskPluginListenerService.listListener(url)

    if (taskPlugins.length === 0) {
      const msg = `没有监听此链接的插件，url: ${url}`
      LogUtil.info(this.constructor.name, msg)
      return new TaskCreateResponse({
        succeed: false,
        addedQuantity: 0,
        msg: msg,
        plugin: undefined
      })
    }

    // 插件加载器
    const pluginLoader = new PluginLoader(new TaskHandlerFactory())

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
        taskHandler.pluginTool.events.on('change-collection-name-request', (taskName: string) => {
          parentTask.taskName = taskName
          if (parentTask.saved) {
            const tempTask = new Task(parentTask)
            this.updateById(tempTask)
          }
        })

        // 创建任务
        const pluginResponse = await taskHandler.create(url)

        // 分别处理数组类型和流类型的响应值
        if (pluginResponse instanceof Readable) {
          const addedQuantity = await this.handleCreateTaskStream(pluginResponse, taskPlugin, parentTask, 100)
          return new TaskCreateResponse({
            succeed: true,
            addedQuantity: addedQuantity,
            msg: '创建成功',
            plugin: taskPlugin
          })
        } else if (Array.isArray(pluginResponse)) {
          const addedQuantity = await this.handleCreateTaskArray(pluginResponse, url, taskPlugin, parentTask)
          return new TaskCreateResponse({
            succeed: true,
            addedQuantity: addedQuantity,
            msg: '创建成功',
            plugin: taskPlugin
          })
        } else {
          LogUtil.error(this.constructor.name, '插件创建任务失败，插件返回了不支持的类型')
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
   * @param pluginTaskResponseDTOS 插件返回的任务数组
   * @param url 传给插件的url
   * @param taskPlugin 插件信息
   * @param parentTask 任务集
   */
  public async handleCreateTaskArray(
    pluginTaskResponseDTOS: PluginTaskResponseDTO[],
    url: string,
    taskPlugin: Plugin,
    parentTask: TaskCreateDTO
  ): Promise<number> {
    // 查询插件信息，用于输出日志
    const pluginInfo = JSON.stringify(taskPlugin)

    // 校验是否返回了空数据或非数组
    AssertArrayNotEmpty(pluginTaskResponseDTOS, this.constructor.name, `插件未创建任务，url: ${url}，plugin: ${pluginInfo}`)

    // 转换为TaskCreateDTO
    const taskCreateDTOS = pluginTaskResponseDTOS.map((task) => PluginTaskResponseDTO.toTaskCreateDTO(task))

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
      if (task.originType !== OriginType.LOCAL) {
        let siteId: Promise<number | null | undefined> | null | undefined = siteCache.get(task.siteDomain)
        if (IsNullish(siteId)) {
          const tempSite = siteService.getByDomain(task.siteDomain)
          siteId = tempSite.then((site) => site?.id)
        }
        task.siteId = await siteId
        AssertNotNullish(task.siteId, this.constructor.name, `创建任务失败，没有找到域名${task.siteDomain}对应的站点`)
      }
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

    // 根据插件返回的任务数组长度判断如何处理
    if (taskCreateDTOS.length === 1) {
      // 如果插件返回的的任务列表长度为1，则不需要创建子任务
      const task = taskCreateDTOS[0]
      await assignTask(task)
      const singleTask = new Task(task)
      return super.save(singleTask).then(() => 1)
    } else {
      // 如果插件返回的的任务列表长度大于1，则创建一个父任务，所有的任务作为其子任务
      const tempTask = new Task(parentTask)
      const pid = await super.save(tempTask)
      parentTask.id = pid
      parentTask.saved = true

      for (const task of taskCreateDTOS) {
        await assignTask(task, pid)
      }
      const childTasks = taskCreateDTOS.map((taskCreateDTO) => new Task(taskCreateDTO))

      return super.saveBatch(childTasks)
    }
  }

  /**
   * 处理任务创建流
   * @param createTaskStream 创建任务流
   * @param taskPlugin 插件信息
   * @param parentTask 任务集
   * @param batchSize 每次保存任务的数量
   */
  public async handleCreateTaskStream(
    createTaskStream: Readable,
    taskPlugin: Plugin,
    parentTask: TaskCreateDTO,
    batchSize: number
  ): Promise<number> {
    // 最终用于返回的Promise
    return new Promise<number>((resolve, reject) => {
      const writable = new CreateTaskWritable(parentTask, this, new SiteService(), taskPlugin, batchSize)
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
    const worksSaveInfo = await WorksService.createSaveInfo(worksPluginDTO, taskId)

    // 保存作品信息
    const worksService = new WorksService()
    return worksService.saveOrUpdateWorksInfos(worksSaveInfo, false)
  }

  /**
   * 处理任务
   * @param task
   * @param worksId
   * @param pluginLoader
   * @param taskWriter
   */
  public async startTask(
    task: Task,
    worksId: number,
    pluginLoader: PluginLoader<TaskHandler>,
    taskWriter: TaskWriter
  ): Promise<TaskStatusEnum> {
    AssertNotNullish(task.id, this.constructor.name, `开始任务失败，任务id不能为空`)
    const taskId = task.id

    const worksService = new WorksService()

    // 标记为进行中
    task.status = TaskStatusEnum.PROCESSING

    // 加载插件
    const plugin = await this.getPluginInfo(task.pluginAuthor, task.pluginName, task.pluginVersion, '开始任务失败')
    AssertNotNullish(plugin?.id, this.constructor.name, `开始任务失败，创建任务的插件id不能为空`)

    // 调用插件的start方法，获取资源
    let resourceDTO: PluginWorksResponseDTO
    try {
      const taskHandler: TaskHandler = await pluginLoader.load(plugin.id)
      resourceDTO = await taskHandler.start(task)
    } catch (error) {
      LogUtil.error(this.constructor.name, `任务${taskId}调用插件开始时失败`, error)
      return TaskStatusEnum.FAILED
    }

    const oldWorks = await worksService.getFullWorksInfoById(worksId)
    AssertNotNullish(oldWorks, `开始任务失败，任务的作品id不可用，taskId: ${taskId}`)
    // 用已经保存在数据库里的作品信息补全插件返回的作品信息
    resourceDTO.works = ObjectUtil.mergeObjects<Works>(resourceDTO.works, new Works(oldWorks), (src) => new Works(src))
    // 判断是否需要更新作品数据
    if (resourceDTO.doUpdate) {
      const worksSaveInfo = await WorksService.createSaveInfo(resourceDTO, taskId)
      worksSaveInfo.id = worksId
      await worksService.saveOrUpdateWorksInfos(worksSaveInfo, true)
    }
    // 获取任务资源
    AssertNotNullish(resourceDTO.resource?.resourceStream, 'WorksService', `插件没有返回任务${taskId}的资源`)
    taskWriter.readable = resourceDTO.resource.resourceStream
    if (NotNullish(resourceDTO.resource.resourceSize)) {
      taskWriter.bytesSum = resourceDTO.resource.resourceSize
    } else {
      LogUtil.warn(this.constructor.name, `插件没有返回任务${taskId}的资源的大小`)
      taskWriter.bytesSum = 0
    }
    // 查询作品已经存在的可用资源
    const resService = new ResourceService()
    const activeRes = await resService.getActiveByWorksId(worksId)
    // 生成用于保存资源的信息
    oldWorks.resource = new Resource()
    oldWorks.resource.worksId = worksId
    oldWorks.resource.taskId = taskId
    oldWorks.resource.filenameExtension = resourceDTO.resource.filenameExtension
    oldWorks.resource.suggestedName = resourceDTO.resource.suggestedName
    oldWorks.resource.importMethod = resourceDTO.resource.importMethod
    const resourceSaveDTO = await ResourceService.createSaveInfo(oldWorks)
    resourceSaveDTO.worksId = worksId
    resourceSaveDTO.taskId = taskId
    resourceSaveDTO.resourceStream = resourceDTO.resource.resourceStream
    if (IsNullish(activeRes)) {
      resourceSaveDTO.id = await resService.saveActive(resourceSaveDTO)
    } else {
      resourceSaveDTO.id = activeRes.id
    }
    // 更新下载中的文件路径
    task.pendingResourceId = resourceSaveDTO.id
    task.pendingSavePath = resourceSaveDTO.fullSavePath
    this.updateById(task)

    LogUtil.info(this.constructor.name, `任务${taskId}开始下载`)
    const resSavePromise: Promise<FileSaveResult> = IsNullish(activeRes)
      ? resService.saveResource(resourceSaveDTO, taskWriter)
      : resService.replaceResource(resourceSaveDTO, taskWriter)
    return resSavePromise.then(async (saveResult) => {
      if (FileSaveResult.FINISH === saveResult) {
        const resourceService = new ResourceService()
        resourceService.resourceFinished(taskWriter.resourceId)
        return TaskStatusEnum.FINISHED
      } else if (FileSaveResult.PAUSE === saveResult) {
        return TaskStatusEnum.PAUSE
      } else {
        throw new Error(`保存资源未返回预期的值，saveResult: ${saveResult}`)
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
    const taskQueue = GlobalVar.get(GlobalVars.TASK_QUEUE)
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
   * @param taskWriter
   */
  public async pauseTask(task: Task, pluginLoader: PluginLoader<TaskHandler>, taskWriter: TaskWriter): Promise<boolean> {
    // 加载插件
    const plugin = await this.getPluginInfo(task.pluginAuthor, task.pluginName, task.pluginVersion, '暂停任务失败')
    AssertNotNullish(plugin?.id, this.constructor.name, `暂停任务失败，创建任务的插件id不能为空，taskId: ${task.id}`)
    const taskHandler = await pluginLoader.load(plugin.id)

    // 创建TaskPluginDTO对象
    const taskPluginDTO = new TaskPluginDTO(task)
    taskPluginDTO.resourceStream = taskWriter.readable

    // 暂停写入
    const finished = taskWriter.pause()

    if (!finished) {
      // 调用插件的pause方法
      try {
        await taskHandler.pause(taskPluginDTO)
      } catch (error) {
        LogUtil.error(this.constructor.name, '调用插件的pause方法出错: ', error)
        if (NotNullish(taskWriter.readable)) {
          taskWriter.readable.pause()
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
    const taskQueue = GlobalVar.get(GlobalVars.TASK_QUEUE)
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
   * @param taskWriter
   */
  public async stopTask(task: Task, pluginLoader: PluginLoader<TaskHandler>, taskWriter: TaskWriter): Promise<boolean> {
    // 加载插件
    const plugin = await this.getPluginInfo(task.pluginAuthor, task.pluginName, task.pluginVersion, '停止任务失败')
    AssertNotNullish(plugin?.id, this.constructor.name, `停止任务失败，创建任务的插件id不能为空，taskId: ${task.id}`)
    const taskHandler = await pluginLoader.load(plugin.id)

    // 创建TaskPluginDTO对象
    const taskPluginDTO = new TaskPluginDTO(task)
    taskPluginDTO.resourceStream = taskWriter.readable

    // 暂停写入
    const finished = taskWriter.pause()

    if (!finished) {
      // 调用插件的pause方法
      try {
        await taskHandler.stop(taskPluginDTO)
      } catch (error) {
        LogUtil.error(this.constructor.name, '调用插件的stop方法出错: ', error)
        if (NotNullish(taskWriter.readable)) {
          taskWriter.readable.destroy()
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
    const taskQueue = GlobalVar.get(GlobalVars.TASK_QUEUE)
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
   * @param taskWriter
   */
  public async resumeTask(
    task: Task,
    worksId: number,
    pluginLoader: PluginLoader<TaskHandler>,
    taskWriter: TaskWriter
  ): Promise<TaskStatusEnum> {
    AssertNotNullish(task.id, this.constructor.name, '恢复任务失败，任务id不能为空')
    const taskId = task.id
    AssertNotNullish(task.pendingSavePath, this.constructor.name, `恢复任务失败，任务的pendingSavePath不能为空，taskId: ${taskId}`)
    // 加载插件
    const plugin = await this.getPluginInfo(task.pluginAuthor, task.pluginName, task.pluginVersion, '恢复任务失败')
    AssertNotNullish(plugin?.id, this.constructor.name, `暂停任务失败，创建任务的插件id不能为空，taskId: ${taskId}`)
    const taskHandler: TaskHandler = await pluginLoader.load(plugin.id)

    // 插件用于恢复下载的任务信息
    const taskPluginDTO = new TaskPluginDTO(task)
    // 获取任务writer中的读取流
    taskPluginDTO.resourceStream = taskWriter.readable
    // 读取已下载文件信息，获取已经下载的数据量
    try {
      taskPluginDTO.bytesWritten = await fs.promises.stat(task.pendingSavePath).then((stats) => stats.size)
    } catch (error) {
      LogUtil.info('TasService', `恢复任务${taskId}失败，先前下载的文件已经不存在 `, error)
      await CreateDirIfNotExists(path.dirname(task.pendingSavePath))
      taskPluginDTO.bytesWritten = 0
    }

    // 恢复下载
    const worksService = new WorksService()

    // 标记为进行中
    task.status = TaskStatusEnum.PROCESSING
    // 调用插件的resume函数，获取资源
    let resumeResponse = await taskHandler.resume(taskPluginDTO)
    const resourcePluginDTO = resumeResponse.resource
    AssertNotNullish(resourcePluginDTO, this.constructor.name, `恢复任务失败，插件返回的资源为空，taskId: ${taskId}`)
    AssertNotNullish(resourcePluginDTO.resourceStream, this.constructor.name, `恢复任务失败，插件返回的资源为空，taskId: ${taskId}`)

    const oldWorks = await worksService.getFullWorksInfoById(worksId)
    AssertNotNullish(oldWorks, `恢复任务失败，任务的作品id不可用，taskId: ${taskId}`)
    resumeResponse = ObjectUtil.mergeObjects<PluginWorksResponseDTO>(
      resumeResponse,
      oldWorks,
      (src) => new PluginWorksResponseDTO(src)
    )
    // 判断是否需要更新作品数据
    let finalFileName: string | undefined | null // 保存修改后的finalFileName，资源下载完后再修改
    let finalFilePath: string | undefined | null // 保存修改后的finalFilePath，资源下载完后再修改
    let finalFilenameExtension: string | undefined | null // 保存修改后的finalFilenameExtension，资源下载完后再修改
    if (resumeResponse.doUpdate) {
      const worksSaveInfo = await WorksService.createSaveInfo(resumeResponse, taskId)
      worksSaveInfo.id = worksId
      await worksService.saveOrUpdateWorksInfos(worksSaveInfo, true)
    }
    let writeable: fs.WriteStream
    // 判断是否可接续，然后从任务中获取保存路径
    if (resourcePluginDTO.continuable) {
      writeable = fs.createWriteStream(task.pendingSavePath, { flags: 'a' })
      writeable.bytesWritten = taskPluginDTO.bytesWritten
    } else {
      writeable = fs.createWriteStream(task.pendingSavePath)
    }

    // 配置任务writer
    taskWriter.bytesSum = IsNullish(resourcePluginDTO.resourceSize) ? -1 : resourcePluginDTO.resourceSize
    taskWriter.readable = resourcePluginDTO.resourceStream as Readable
    taskWriter.writable = writeable

    LogUtil.info(this.constructor.name, `任务${taskId}恢复下载`)
    return ResourceService.resumeSaveResource(taskWriter).then(async (saveResult) => {
      if (FileSaveResult.FINISH === saveResult) {
        const tempResource = new Resource()
        tempResource.id = taskWriter.resourceId
        tempResource.worksId = worksId
        tempResource.resourceComplete = BOOL.TRUE
        if (resumeResponse.doUpdate) {
          // TODO 文件的也需要迁移到对应路径下
          tempResource.filePath = finalFilePath
          tempResource.fileName = finalFileName
          tempResource.filenameExtension = finalFilenameExtension
        }
        const resourceService = new ResourceService()
        resourceService.updateById(tempResource)
        return TaskStatusEnum.FINISHED
      } else if (FileSaveResult.PAUSE === saveResult) {
        return TaskStatusEnum.PAUSE
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
    const taskQueue = GlobalVar.get(GlobalVars.TASK_QUEUE)
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
    return this.deleteBatchById(waitingDelete)
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
    const taskQueue = GlobalVar.get(GlobalVars.TASK_QUEUE)
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
}
