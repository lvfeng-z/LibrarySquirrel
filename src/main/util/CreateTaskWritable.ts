import { Writable } from 'node:stream'
import TaskCreateDTO from '../model/dto/TaskCreateDTO.js'
import StringUtil from './StringUtil.js'
import LogUtil from './LogUtil.js'
import { TaskStatusEnum } from '../constant/TaskStatusEnum.js'
import { ArrayNotEmpty, IsNullish } from './CommonUtil.js'
import Task from '../model/entity/Task.js'
import TaskService from '../service/TaskService.js'
import SiteService from '../service/SiteService.js'
import Plugin from '../model/entity/Plugin.js'
import PluginCreateTaskResponseDTO from '../model/dto/PluginCreateTaskResponseDTO.js'

export default class CreateTaskWritable extends Writable {
  /**
   * 任务个数
   */
  taskCount: number

  /**
   * 任务缓冲区
   */
  taskBuffer: Task[]

  /**
   * 保存父任务的Promise
   */
  parentTaskSave: Promise<number> | undefined

  /**
   * 父任务
   */
  parentTask: TaskCreateDTO

  /**
   * 任务服务
   */
  taskService: TaskService

  /**
   * 任务服务
   */
  siteService: SiteService

  /**
   * 插件信息
   */
  taskPlugin: Plugin

  /**
   * 插件信息
   */
  pluginInfo: string

  /**
   * 批量保存的大小
   */
  batchSize: number

  /**
   * 站点缓存
   */
  siteCache: Map<string, Promise<number>>

  constructor(parentTask: TaskCreateDTO, taskService: TaskService, siteService: SiteService, taskPlugin: Plugin, batchSize?: number) {
    super({ objectMode: true, highWaterMark: 500 })
    this.taskCount = 0
    this.taskBuffer = []
    this.parentTaskSave = undefined
    this.parentTask = parentTask
    this.taskService = taskService
    this.siteService = siteService
    this.taskPlugin = taskPlugin
    this.pluginInfo = JSON.stringify(taskPlugin)
    this.batchSize = IsNullish(batchSize) ? 32 : batchSize
    this.siteCache = new Map<string, Promise<number>>()
  }

  async _write(
    pluginTaskResponseDTO: PluginCreateTaskResponseDTO,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ) {
    const task = PluginCreateTaskResponseDTO.toTaskCreateDTO(pluginTaskResponseDTO)
    // 校验
    if (StringUtil.isBlank(task.siteDomain)) {
      LogUtil.error(this.constructor.name, '创建任务失败，插件返回的任务信息中缺少站点域名')
      callback()
      return
    }
    if (StringUtil.isBlank(task.siteWorksId)) {
      LogUtil.error(this.constructor.name, '创建任务失败，插件返回的任务信息中缺少siteWorksId')
      callback()
      return
    }

    // 创建任务对象
    task.pluginAuthor = this.taskPlugin.author
    task.pluginName = this.taskPlugin.name
    task.pluginVersion = this.taskPlugin.version
    task.status = TaskStatusEnum.CREATED
    task.isCollection = false
    task.pid = this.parentTask.id
    // 根据站点域名查询站点id
    let siteId: Promise<number | null | undefined> | null | undefined = this.siteCache.get(task.siteDomain)
    if (IsNullish(siteId)) {
      const tempSite = this.siteService.getByDomain(task.siteDomain)
      siteId = tempSite.then((site) => site?.id)
    }
    task.siteId = await siteId
    if (IsNullish(task.siteId)) {
      LogUtil.error(this.constructor.name, `创建任务失败，没有找到域名${task.siteDomain}对应的站点`)
      callback()
      return
    }

    // 将任务添加到缓冲区
    this.taskBuffer.push(new Task(task))
    this.taskCount++

    // 每batchSize个任务处理一次
    if (this.taskBuffer.length % this.batchSize === 0) {
      // 如果父任务尚未保存且任务数大于1，则先保存父任务
      if (this.parentTaskSave === undefined && this.taskCount > 1) {
        // 父任务使用第一个子任务的站点id
        this.parentTask.siteId = task.siteId
        this.parentTaskSave = this.saveParentTask()
        this.parentTask.id = await this.parentTaskSave
        // 更新pid
        this.taskBuffer.forEach((task) => (task.pid = this.parentTask.id as number))
      }
      await this.saveTasks()
    }
    callback()
  }

  async _final(callback: (error?: Error | null) => void) {
    // 如果父任务尚未保存且任务数大于1，则先保存父任务
    if (this.parentTaskSave === undefined && this.taskCount > 1) {
      // 父任务使用第一个子任务的站点id
      this.parentTask.siteId = this.taskBuffer[0].siteId
      this.parentTaskSave = this.saveParentTask()
      this.parentTask.id = await this.parentTaskSave
      // 更新pid
      this.taskBuffer.forEach((task) => (task.pid = this.parentTask.id as number))
    }
    if (ArrayNotEmpty(this.taskBuffer)) {
      await this.saveTasks()
    }
    callback(null)
  }

  /**
   * 保存父任务
   * @private
   */
  private saveParentTask(): Promise<number> {
    return this.taskService.save(this.parentTask)
  }

  /**
   * 保存任务列表
   */
  private async saveTasks(): Promise<number> {
    const taskBuffer: Task[] = []
    // 从缓冲区中取出batchSize个任务
    taskBuffer.push(...this.taskBuffer.splice(0, this.batchSize))

    // 如果缓冲区中有任务，则保存
    if (taskBuffer.length > 0) {
      return this.taskService.saveBatch(taskBuffer)
    } else {
      return 0
    }
  }
}
