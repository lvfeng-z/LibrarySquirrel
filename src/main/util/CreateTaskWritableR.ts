import { Writable } from 'node:stream'
import StringUtil from './StringUtil.js'
import LogUtil from './LogUtil.js'
import { TaskStatusEnum } from '../constant/TaskStatusEnum.js'
import { ArrayNotEmpty, IsNullish } from './CommonUtil.js'
import Task from '../model/entity/Task.js'
import TaskService from '../service/TaskService.js'
import SiteService from '../service/SiteService.js'
import Plugin from '../model/entity/Plugin.js'
import PluginCreateTaskResponseDTO from '../model/dto/PluginCreateTaskResponseDTO.js'
import PluginStreamCreateTaskResponseDTO from '../model/dto/PluginStreamCreateTaskResponseDTO.js'
import PluginCreateParentTaskResponseDTO from '../model/dto/PluginCreateParentTaskResponseDTO.js'

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
   * 插件Pid-真实Pid映射表
   */
  pluginPidToTruePidMapping: Map<string, number>

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

  constructor(taskService: TaskService, siteService: SiteService, taskPlugin: Plugin, batchSize?: number) {
    super({ objectMode: true, highWaterMark: 500 })
    this.taskCount = 0
    this.taskBuffer = []
    this.parentTaskSave = undefined
    this.pluginPidToTruePidMapping = new Map<string, number>()
    this.taskService = taskService
    this.siteService = siteService
    this.taskPlugin = taskPlugin
    this.pluginInfo = JSON.stringify(taskPlugin)
    this.batchSize = IsNullish(batchSize) ? 32 : batchSize
    this.siteCache = new Map<string, Promise<number>>()
  }

  async _write(
    pluginResponse: PluginStreamCreateTaskResponseDTO,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ) {
    try {
      if (pluginResponse.taskType === 'child') {
        const pluginTaskResponseDTO = pluginResponse.task as PluginCreateTaskResponseDTO
        const pluginPid = pluginTaskResponseDTO.pluginPid
        if (StringUtil.isBlank(pluginPid)) {
          LogUtil.error(this.constructor.name, '创建任务失败，插件返回的子任务信息中缺少pluginPid')
          callback()
          return
        }
        const truePid = this.pluginPidToTruePidMapping.get(pluginPid)
        if (IsNullish(truePid)) {
          LogUtil.error(this.constructor.name, '创建任务失败，插件返回的子任务中的pluginPid不可用')
          callback()
          return
        }
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
        task.pid = truePid
        task.siteId = await this.getSiteId(task.siteDomain)
        if (IsNullish(task.siteId)) {
          LogUtil.error(this.constructor.name, `创建任务失败，没有找到域名${task.siteDomain}对应的站点`)
          callback()
          return
        }

        // 将任务添加到缓冲区
        this.taskBuffer.push(new Task(task))
        this.taskCount++
      } else if (pluginResponse.taskType === 'parent') {
        const pluginCreateParentTaskResponseDTO = pluginResponse.task as PluginCreateParentTaskResponseDTO
        const pluginPid = pluginCreateParentTaskResponseDTO.pluginTaskId
        if (StringUtil.isBlank(pluginPid)) {
          LogUtil.info(this.constructor.name, '创建父任务失败，插件返回的父任务的pluginTaskId为空')
          callback()
          return
        }
        if (this.pluginPidToTruePidMapping.has(pluginPid)) {
          LogUtil.info(this.constructor.name, '保存父任务失败，插件返回了重复的pluginTaskId')
        } else {
          const parentTaskCreateDTO = PluginCreateParentTaskResponseDTO.toTaskCreateDTO(pluginCreateParentTaskResponseDTO)
          if (StringUtil.isBlank(parentTaskCreateDTO.siteDomain)) {
            LogUtil.error(this.constructor.name, '创建任务失败，插件返回的父任务信息中缺少站点域名')
            callback()
            return
          }
          parentTaskCreateDTO.isCollection = true
          parentTaskCreateDTO.status = TaskStatusEnum.CREATED
          parentTaskCreateDTO.siteId = await this.getSiteId(parentTaskCreateDTO.siteDomain)
          const truePid = await this.taskService.save(parentTaskCreateDTO)
          this.pluginPidToTruePidMapping.set(pluginPid, truePid)
        }
        callback()
        return
      }

      // 每batchSize个任务处理一次
      if (this.taskBuffer.length % this.batchSize === 0) {
        await this.saveTasks()
      }
      callback()
    } catch (error) {
      this.emit('error', error)
    }
  }

  async _final(callback: (error?: Error | null) => void) {
    try {
      if (ArrayNotEmpty(this.taskBuffer)) {
        await this.saveTasks()
      }
    } catch (error) {
      this.emit('error', error)
    } finally {
      callback()
    }
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

  private async getSiteId(siteDomain: string): Promise<number | null | undefined> {
    let siteId: Promise<number | null | undefined> | null | undefined = this.siteCache.get(siteDomain)
    if (IsNullish(siteId)) {
      const tempSite = this.siteService.getByDomain(siteDomain)
      siteId = tempSite.then((site) => site?.id)
    }
    return siteId
  }
}
