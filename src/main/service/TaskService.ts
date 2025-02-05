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
import TaskDTO from '../model/dto/TaskDTO.ts'
import { TaskHandler, TaskHandlerFactory } from '../plugin/TaskHandler.ts'
import TaskCreateDTO from '../model/dto/TaskCreateDTO.ts'
import TaskScheduleDTO from '../model/dto/TaskScheduleDTO.ts'
import { TaskPluginDTO } from '../model/dto/TaskPluginDTO.ts'
import fs from 'fs'
import WorksPluginDTO from '../model/dto/WorksPluginDTO.ts'
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
import WorksSaveDTO from '../model/dto/WorksSaveDTO.js'
import StringUtil from '../util/StringUtil.js'
import TaskProcessingDTO from '../model/dto/TaskProcessingDTO.js'
import Works from '../model/entity/Works.js'
import ObjectUtil from '../util/ObjectUtil.js'
import SiteService from './SiteService.js'
import Site from '../model/entity/Site.js'

export default class TaskService extends BaseService<TaskQueryDTO, Task, TaskDao> {
  constructor(db?: DB) {
    super(TaskDao, db)
  }

  /**
   * 根据传入的url创建任务
   * @param url 作品/作品集所在url
   */
  async createTask(url: string): Promise<TaskCreateResponse> {
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
          const msg = `任务的插件id意外为空，taskId: ${taskPlugin.id}`
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
          const addedQuantity = await this.handleCreateTaskStream(pluginResponse, url, taskPlugin, parentTask, 100, 200)
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
          LogUtil.error(this.constructor.name, '插件返回了不支持的类型')
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
   * @param tasks 插件返回的任务数组
   * @param url 传给插件的url
   * @param taskPlugin 插件信息
   * @param parentTask 任务集
   */
  async handleCreateTaskArray(tasks: TaskCreateDTO[], url: string, taskPlugin: Plugin, parentTask: TaskCreateDTO): Promise<number> {
    // 查询插件信息，用于输出日志
    const pluginInfo = JSON.stringify(taskPlugin)

    // 校验是否返回了空数据或非数组
    AssertArrayNotEmpty(tasks, this.constructor.name, `插件未创建任务，url: ${url}，plugin: ${pluginInfo}`)

    // 清除所有插件不应处理的属性值
    const legalTasks = tasks.map((task) => {
      const temp = new TaskCreateDTO(task)
      temp.legalize()
      return temp
    })

    // 用于查询和缓存站点id
    const siteService = new SiteService()
    const siteCache = new Map<string, Promise<number>>()
    // 给任务赋值的函数
    const assignTask = async (task: TaskCreateDTO, pid?: number): Promise<void> => {
      // 校验
      AssertNotBlank(task.siteDomain, this.constructor.name, '创建任务失败，插件返回的任务信息中缺少站点domain')
      task.status = TaskStatusEnum.CREATED
      task.isCollection = false
      task.pid = pid
      task.pluginAuthor = taskPlugin.author
      task.pluginName = taskPlugin.name
      task.pluginVersion = taskPlugin.version
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

    // 根据插件返回的任务数组长度判断如何处理
    if (legalTasks.length === 1) {
      // 如果插件返回的的任务列表长度为1，则不需要创建子任务
      const task = legalTasks[0]
      await assignTask(task)
      const singleTask = new Task(task)
      return super.save(singleTask).then(() => 1)
    } else {
      // 如果插件返回的的任务列表长度大于1，则创建一个父任务，所有的任务作为其子任务
      const tempTask = new Task(parentTask)
      const pid = await super.save(tempTask)
      parentTask.id = pid
      parentTask.saved = true

      for (const task of legalTasks) {
        await assignTask(task, pid)
      }
      const childTasks = legalTasks.map((taskCreateDTO) => new Task(taskCreateDTO))

      return super.saveBatch(childTasks)
    }
  }

  /**
   * 处理任务创建流
   * @param createTaskStream 创建任务流
   * @param url 传给插件的url
   * @param taskPlugin 插件信息
   * @param parentTask 任务集
   * @param batchSize 每次保存任务的数量
   * @param queueMax 任务队列最大长度
   */
  async handleCreateTaskStream(
    createTaskStream: Readable,
    url: string,
    taskPlugin: Plugin,
    parentTask: TaskCreateDTO,
    batchSize: number,
    queueMax: number
  ): Promise<number> {
    // 最终用于返回的Promise
    return new Promise<number>((resolve) => {
      // error事件处理函数
      createTaskStream.on('error', (error) => {
        LogUtil.error(this.constructor.name, '插件报错: ', error)
      })

      // 用于查询和缓存站点id
      const siteService = new SiteService()
      const siteCache = new Map<string, Promise<number>>()
      // data事件处理函数
      createTaskStream.on('data', async (chunk: TaskCreateDTO) => {
        const task = new TaskCreateDTO(chunk)
        // 校验
        if (StringUtil.isBlank(task.siteDomain)) {
          LogUtil.error(this.constructor.name, '创建任务失败，插件返回的任务信息中缺少站点domain')
          return
        }
        itemCount++
        // 如果父任务尚未保存且任务数大于1，则先保存父任务
        if (parentTaskProcess === undefined && itemCount > 1) {
          parentTaskProcess = parentTaskProcessing()
          parentTask.id = await parentTaskProcess
          // 更新pid
          taskQueue.forEach((task) => (task.pid = parentTask.id as number))
        }

        // 等待父任务完成
        await parentTaskProcess
        // 创建任务对象
        task.pluginAuthor = taskPlugin.author
        task.pluginName = taskPlugin.name
        task.pluginVersion = taskPlugin.version
        task.status = TaskStatusEnum.CREATED
        task.isCollection = false
        task.pid = parentTask.id as number
        let siteId: Promise<number | null | undefined> | null | undefined = siteCache.get(task.siteDomain)
        if (IsNullish(siteId)) {
          const tempSite = siteService.getByDomain(task.siteDomain)
          siteId = tempSite.then((site) => site?.id)
        }
        task.siteId = await siteId
        if (IsNullish(siteId)) {
          LogUtil.error(this.constructor.name, '创建任务失败，插件返回的任务信息中缺少站点domain')
          return
        }

        // 将任务添加到队列
        taskQueue.push(new Task(task))

        // 如果队列中的任务数量超过上限，则暂停流
        if (taskQueue.length >= queueMax && !isPaused) {
          LogUtil.info(this.constructor.name, `任务队列超过${queueMax}个，暂停任务流，已经收到${itemCount}个任务`)
          createTaskStream.pause()
          isPaused = true
        }

        // 每batchSize个任务处理一次
        if (taskQueue.length % batchSize === 0) {
          await saveTasks()
        }
      })

      // end事件处理函数
      createTaskStream.on('end', async () => {
        try {
          // 所有数据读取完毕
          if (itemCount === 0) {
            LogUtil.warn(this.constructor.name, `插件未创建任务，url: ${url}，plugin: ${pluginInfo}`)
          } else if (itemCount === 1) {
            await super.save(taskQueue[0])
          } else if (taskQueue.length > 0) {
            await saveTasks()
          }
          resolve(itemCount)
        } catch (error) {
          LogUtil.error(this.constructor.name, '处理任务流结束事件失败，error:', error)
        } finally {
          LogUtil.info(this.constructor.name, `任务流结束，创建了${itemCount}个任务`)
        }
      })

      // 查询插件信息，用于输出日志
      const pluginInfo = JSON.stringify(taskPlugin)
      // 任务计数
      let itemCount = 0
      // 父任务存储过程
      let parentTaskProcess: Promise<number>
      // 任务队列
      const taskQueue: Task[] = []
      // 标记流是否已暂停
      let isPaused = false

      // 保存任务集的过程
      const parentTaskProcessing = (): Promise<number> => {
        const tempTask = new Task(parentTask)
        const pid = super.save(tempTask) as Promise<number>
        parentTask.saved = true
        return pid
      }

      // 保存任务队列的函数
      const saveTasks = async (): Promise<void> => {
        const taskBuffer: Task[] = []
        // 从队列中取出最多batchSize个任务
        while (taskQueue.length > 0 && taskBuffer.length < batchSize) {
          taskBuffer.push(taskQueue.shift()!)
        }

        // 检查队列是否小于上限，如果是，则恢复流
        if (taskQueue.length < queueMax && isPaused) {
          LogUtil.info(this.constructor.name, `任务队列减至${taskQueue.length}个，恢复任务流`)
          createTaskStream.resume()
          isPaused = false
        }

        // 如果缓冲区中有任务，则保存
        if (taskBuffer.length > 0) {
          super.saveBatch(taskBuffer).then()
        }
      }
    })
  }

  /**
   * 保存作品信息
   * @param task
   * @param pluginLoader
   */
  public async saveWorksInfo(task: Task, pluginLoader: PluginLoader<TaskHandler>): Promise<boolean> {
    AssertNotNullish(task.id, this.constructor.name, `保存作品信息失败，任务id意外为空`)
    const taskId = task.id
    // 加载插件
    const plugin = await this.getPluginInfo(task.pluginAuthor, task.pluginName, task.pluginVersion, '保存作品信息失败')
    AssertNotNullish(plugin, this.constructor.name, `保存作品信息失败，创建任务的插件不可用`)
    AssertNotNullish(plugin.id, this.constructor.name, `保存作品信息失败，创建任务的插件id意外为空`)
    task.pluginAuthor = plugin.author
    task.pluginName = plugin.name
    task.pluginVersion = plugin.version
    const taskHandler: TaskHandler = await pluginLoader.load(plugin.id)

    // 调用插件的generateWorksInfo方法，获取作品信息
    let worksPluginDTO: WorksPluginDTO
    try {
      worksPluginDTO = await taskHandler.generateWorksInfo(task)
    } catch (error) {
      LogUtil.error(this.constructor.name, `任务${taskId}调用插件获取作品信息时失败`, error)
      return false
    }
    worksPluginDTO.taskId = taskId
    worksPluginDTO.siteId = task.siteId

    // 保存远程资源是否可接续
    task.continuable = worksPluginDTO.continuable
    const updateContinuableTask = new Task()
    updateContinuableTask.id = taskId
    updateContinuableTask.continuable = worksPluginDTO.continuable
    await this.updateById(updateContinuableTask)

    // 生成作品保存用的信息
    const worksSaveInfo = await WorksService.createWorksSaveInfo(worksPluginDTO)

    // 保存作品信息
    const worksService = new WorksService()
    return worksService.saveWorksInfo(worksSaveInfo).then((worksId: number) => {
      // 文件的写入路径和作品id保存到任务中
      const sourceTask = new Task()
      sourceTask.id = worksSaveInfo.taskId
      sourceTask.localWorksId = worksId
      sourceTask.pendingDownloadPath = worksSaveInfo.fullSavePath
      // 作为数据源的task也要赋值，供后续下载时取值，免去从数据库查询
      task.localWorksId = worksSaveInfo.taskId
      task.pendingDownloadPath = worksSaveInfo.fullSavePath
      return this.updateById(sourceTask).then((runResult) => runResult > 0)
    })
  }

  /**
   * 处理任务
   * @param task
   * @param pluginLoader
   * @param taskWriter
   */
  public async startTask(task: Task, pluginLoader: PluginLoader<TaskHandler>, taskWriter: TaskWriter): Promise<TaskStatusEnum> {
    AssertNotNullish(task.id, this.constructor.name, `开始任务失败，任务id意外为空`)
    const taskId = task.id
    AssertNotNullish(task.localWorksId, this.constructor.name, `开始任务失败，任务的作品id意外为空`)
    const worksId = task.localWorksId

    const worksService = new WorksService()

    // 标记为进行中
    task.status = TaskStatusEnum.PROCESSING

    // 加载插件
    const plugin = await this.getPluginInfo(task.pluginAuthor, task.pluginName, task.pluginVersion, '开始任务失败')
    AssertNotNullish(plugin?.id, this.constructor.name, `开始任务失败，创建任务的插件id意外为空`)

    // 调用插件的start方法，获取资源
    let resourceDTO: WorksPluginDTO
    try {
      const taskHandler: TaskHandler = await pluginLoader.load(plugin.id)
      resourceDTO = await taskHandler.start(task)
    } catch (error) {
      LogUtil.error(this.constructor.name, `任务${taskId}调用插件开始时失败`, error)
      return TaskStatusEnum.FAILED
    }

    const oldWorks = await worksService.getFullWorksInfoById(task.localWorksId)
    AssertNotNullish(oldWorks, `开始任务失败，任务的作品id不可用，taskId: ${taskId}`)
    resourceDTO = ObjectUtil.mergeObjects<WorksPluginDTO>(resourceDTO, oldWorks, (src) => new WorksPluginDTO(src))
    let worksSaveInfo: WorksSaveDTO = new WorksSaveDTO(oldWorks)
    // 判断是否需要更新作品数据
    if (resourceDTO.doUpdate) {
      worksSaveInfo = await WorksService.createWorksSaveInfo(resourceDTO)
      // 如果插件更新了作品信息，则重新生成下载路径，并保存到任务中
      task.pendingDownloadPath = worksSaveInfo.fullSavePath
      const taskUpdate = this.updateById(new Task(task))
      worksSaveInfo.id = worksId
      worksService.updateById(new Works(worksSaveInfo))
      await taskUpdate
    }
    // 校验插件返回的任务资源等
    AssertNotNullish(resourceDTO.resourceStream, 'WorksService', `插件没有返回任务${taskId}的资源`)
    taskWriter.readable = resourceDTO.resourceStream
    worksSaveInfo.resourceStream = resourceDTO.resourceStream
    if (NotNullish(resourceDTO.resourceSize) || resourceDTO.resourceSize === 0) {
      taskWriter.bytesSum = resourceDTO.resourceSize
    } else {
      LogUtil.warn(this.constructor.name, `插件没有返回任务${taskId}的资源的大小`)
      taskWriter.bytesSum = 0
    }
    // 从任务中获取保存路径
    if (StringUtil.isBlank(task.pendingDownloadPath)) {
      const fullSavePathTask = await this.getById(taskId)
      AssertNotNullish(fullSavePathTask, this.constructor.name, `开始任务${taskId}失败，任务id无效`)
      worksSaveInfo.fullSavePath = fullSavePathTask.pendingDownloadPath
    } else {
      worksSaveInfo.fullSavePath = task.pendingDownloadPath
    }
    worksSaveInfo.taskId = taskId
    LogUtil.info(this.constructor.name, `任务${taskId}开始下载`)
    return WorksService.saveWorksResource(worksSaveInfo, taskWriter).then(async (saveResult) => {
      if (FileSaveResult.FINISH === saveResult) {
        worksService.resourceFinished(worksId)
        return TaskStatusEnum.FINISHED
      } else if (FileSaveResult.PAUSE === saveResult) {
        return TaskStatusEnum.PAUSE
      } else {
        return TaskStatusEnum.FAILED
      }
    })
  }

  /**
   * 处理任务
   * @param taskIds 任务id列表
   * @param includeStatus 要处理的任务状态
   */
  public async processTaskTree(taskIds: number[], includeStatus: TaskStatusEnum[]): Promise<void> {
    // 查找id列表对应的所有子任务
    const taskTree: TaskDTO[] = await this.dao.listTaskTree(taskIds, includeStatus)

    for (const parent of taskTree) {
      try {
        // 获取要处理的任务
        let children: TaskDTO[]
        if (parent.isCollection && ArrayNotEmpty(parent.children)) {
          children = parent.children
        } else if (!parent.isCollection) {
          children = [parent]
        } else {
          continue
        }

        GlobalVar.get(GlobalVars.TASK_QUEUE).pushBatch(children, TaskOperation.START)
      } catch (error) {
        LogUtil.error(this.constructor.name, error)
        this.taskFailed(parent.id)
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
    AssertNotNullish(task.id, this.constructor.name, `暂停任务失败，任务的id意外为空，taskId: ${task.id}`)
    const taskId = task.id
    // 加载插件
    const plugin = await this.getPluginInfo(task.pluginAuthor, task.pluginName, task.pluginVersion, '暂停任务失败')
    AssertNotNullish(plugin?.id, this.constructor.name, `暂停任务失败，创建任务的插件id意外为空，taskId: ${taskId}`)
    const taskHandler = await pluginLoader.load(plugin.id)

    // 创建TaskPluginDTO对象
    const taskPluginDTO = new TaskPluginDTO(task)
    taskPluginDTO.resourceStream = taskWriter.readable

    // 暂停写入
    taskWriter.pause()

    // 调用插件的pause方法
    try {
      taskHandler.pause(taskPluginDTO)
    } catch (error) {
      LogUtil.error(this.constructor.name, '调用插件的pause方法出错: ', error)
      if (NotNullish(taskWriter.readable)) {
        taskWriter.readable.pause()
      }
    }
    task.status = TaskStatusEnum.PAUSE
    return true
  }

  /**
   * 暂停任务树
   * @param ids id列表
   */
  public async pauseTaskTree(ids: number[]): Promise<void> {
    const taskTree = await this.dao.listTaskTree(ids, [TaskStatusEnum.PROCESSING, TaskStatusEnum.WAITING])

    for (const parent of taskTree) {
      // 获取要处理的任务
      let children: TaskDTO[]
      if (parent.isCollection && ArrayNotEmpty(parent.children)) {
        children = parent.children
      } else if (!parent.isCollection) {
        children = [parent]
      } else {
        continue
      }

      GlobalVar.get(GlobalVars.TASK_QUEUE).pushBatch(children, TaskOperation.PAUSE)
    }
  }

  /**
   * 恢复任务
   * @param task 任务
   * @param pluginLoader 插件加载器
   * @param taskWriter
   */
  public async resumeTask(task: Task, pluginLoader: PluginLoader<TaskHandler>, taskWriter: TaskWriter): Promise<TaskStatusEnum> {
    AssertNotNullish(task.id, this.constructor.name, '恢复任务失败，任务id意外为空')
    const taskId = task.id
    AssertNotNullish(task.localWorksId, this.constructor.name, `恢复任务失败，任务的localWorksId意外为空，taskId: ${taskId}`)
    const worksId = task.localWorksId
    AssertNotNullish(
      task.pendingDownloadPath,
      this.constructor.name,
      `恢复任务失败，任务的pendingDownloadPath意外为空，taskId: ${taskId}`
    )
    // 加载插件
    const plugin = await this.getPluginInfo(task.pluginAuthor, task.pluginName, task.pluginVersion, '暂停任务失败')
    AssertNotNullish(plugin?.id, this.constructor.name, `暂停任务失败，创建任务的插件id意外为空，taskId: ${taskId}`)
    const taskHandler: TaskHandler = await pluginLoader.load(plugin.id)

    // 插件用于恢复下载的任务信息
    const taskPluginDTO = new TaskPluginDTO(task)
    // 获取任务writer中的读取流
    taskPluginDTO.resourceStream = taskWriter.readable
    // 读取已下载文件信息，获取已经下载的数据量
    try {
      taskPluginDTO.bytesWritten = await fs.promises.stat(task.pendingDownloadPath).then((stats) => stats.size)
    } catch (error) {
      LogUtil.info('TasService', `恢复任务${taskId}失败，先前下载的文件已经不存在 `, error)
      await CreateDirIfNotExists(path.dirname(task.pendingDownloadPath))
      taskPluginDTO.bytesWritten = 0
    }

    // 恢复下载
    const worksService = new WorksService()

    // 标记为进行中
    task.status = TaskStatusEnum.PROCESSING
    // 调用插件的resume函数，获取资源
    let resumeResponse = await taskHandler.resume(taskPluginDTO)
    AssertNotNullish(resumeResponse.resourceStream, this.constructor.name, `恢复任务失败，插件返回的资源为空，taskId: ${taskId}`)

    const oldWorks = await worksService.getFullWorksInfoById(task.localWorksId)
    AssertNotNullish(oldWorks, `恢复任务失败，任务的作品id不可用，taskId: ${taskId}`)
    resumeResponse = ObjectUtil.mergeObjects<WorksPluginDTO>(resumeResponse, oldWorks, (src) => new WorksPluginDTO(src))
    // 判断是否需要更新作品数据
    let finalFileName: string | undefined | null // 保存修改后的finalFileName，资源下载完后再修改
    let finalFilePath: string | undefined | null // 保存修改后的finalFilePath，资源下载完后再修改
    let finalFilenameExtension: string | undefined | null // 保存修改后的finalFilenameExtension，资源下载完后再修改
    if (resumeResponse.doUpdate) {
      const worksSaveInfo = await WorksService.createWorksSaveInfo(resumeResponse)
      worksSaveInfo.id = task.localWorksId
      worksService.updateById(new Works(worksSaveInfo))
      finalFileName = worksSaveInfo.fileName
      finalFilePath = worksSaveInfo.filePath
      finalFilenameExtension = worksSaveInfo.filenameExtension
    }
    let writeable: fs.WriteStream
    // 判断是否可接续，然后从任务中获取保存路径
    if (resumeResponse.continuable) {
      writeable = fs.createWriteStream(task.pendingDownloadPath, { flags: 'a' })
      writeable.bytesWritten = taskPluginDTO.bytesWritten
    } else {
      writeable = fs.createWriteStream(task.pendingDownloadPath)
    }

    // 配置任务writer
    taskWriter.bytesSum = resumeResponse.resourceSize
    taskWriter.readable = resumeResponse.resourceStream as Readable
    taskWriter.writable = writeable

    LogUtil.info(this.constructor.name, `任务${taskId}恢复下载`)
    return WorksService.resumeSaveWorksResource(taskWriter).then(async (saveResult) => {
      if (FileSaveResult.FINISH === saveResult) {
        const tempWorks = new Works()
        tempWorks.id = worksId
        tempWorks.resourceComplete = true
        if (resumeResponse.doUpdate) {
          // TODO 文件的也需要迁移到对应路径下
          tempWorks.filePath = finalFilePath
          tempWorks.fileName = finalFileName
          tempWorks.filenameExtension = finalFilenameExtension
        }
        worksService.updateById(tempWorks)
        return TaskStatusEnum.FINISHED
      } else if (FileSaveResult.PAUSE === saveResult) {
        return TaskStatusEnum.PAUSE
      } else {
        return TaskStatusEnum.FAILED
      }
    })
  }

  /**
   * 恢复任务树
   * @param ids id列表
   */
  public async resumeTaskTree(ids: number[]): Promise<void> {
    // 查找id列表对应的所有子任务
    const taskTree: TaskDTO[] = await this.dao.listTaskTree(ids, [TaskStatusEnum.PAUSE])

    for (const parent of taskTree) {
      // 获取要处理的任务
      let children: TaskDTO[]
      if (parent.isCollection && ArrayNotEmpty(parent.children)) {
        children = parent.children
      } else if (!parent.isCollection) {
        children = [parent]
      } else {
        continue
      }

      GlobalVar.get(GlobalVars.TASK_QUEUE).pushBatch(children, TaskOperation.RESUME)
    }
  }

  /**
   * 根据父任务的children刷新其状态
   * @param root 父任务
   */
  public async refreshParentTaskStatus(root: TaskDTO): Promise<TaskStatusEnum> {
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
    const root = new TaskDTO()
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
   */
  public taskFailed(taskId: Id): Promise<number> {
    AssertNotNullish(taskId, this.constructor.name, '任务标记为失败失败，任务id不能为空')
    const task = new Task()
    task.id = taskId
    task.status = TaskStatusEnum.FAILED
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
  public async queryParentPage(page: Page<TaskQueryDTO, Task>): Promise<Page<TaskQueryDTO, TaskProcessingDTO>> {
    if (NotNullish(page.query)) {
      page.query.operators = {
        ...{ taskName: Operator.LIKE, siteDomain: Operator.LIKE },
        ...page.query.operators
      }
    }
    const sourcePage = await this.dao.queryParentPage(page)
    const resultPage = sourcePage.transform<TaskProcessingDTO>()
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
        const dto = new TaskProcessingDTO(task)
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
   * 分页查询父任务的子任务
   * @param page
   */
  public async queryChildrenTaskPage(page: Page<TaskQueryDTO, Task>): Promise<Page<TaskQueryDTO, TaskProcessingDTO>> {
    page = new Page(page)
    if (NotNullish(page.query)) {
      page.query.operators = {
        ...{ taskName: Operator.LIKE, siteDomain: Operator.LIKE },
        ...page.query.operators
      }
      page.query.isCollection = false
    }
    const sourcePage = await super.queryPage(page)
    const resultPage = sourcePage.transform<TaskProcessingDTO>()
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
        const dto = new TaskProcessingDTO(task)
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
    const resultPage = sourcePage.transform<TaskDTO>()

    // 组装为树形数据
    if (NotNullish(sourcePage.data) && sourcePage.data.length > 0) {
      const tasks = sourcePage.data.map((task) => new TaskDTO(task))
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
    AssertNotBlank(author, this.constructor.name, `${logPrefix}，创建任务的插件的作者意外为空`)
    AssertNotBlank(name, this.constructor.name, `${logPrefix}，创建任务的插件的名称意外为空`)
    AssertNotBlank(version, this.constructor.name, `${logPrefix}，创建任务的插件的版本意外为空`)
    return pluginService.getByInfo(author, name, version)
  }
}
