import Task from '../model/Task.ts'
import { Readable } from 'node:stream'
import PluginTool from './PluginTool.ts'
import { TaskPluginDTO } from '../model/dto/TaskPluginDTO.ts'
import WorksPluginDTO from '../model/dto/WorksPluginDTO.ts'
import PluginResumeResponse from '../model/utilModels/PluginResumeResponse.ts'
import InstalledPluginsService from '../service/InstalledPluginsService.js'
import StringUtil from '../util/StringUtil.js'
import LogUtil from '../util/LogUtil.js'
import { BasePlugin } from './BasePlugin.js'
import PluginFactory from './PluginFactory.js'
import { isNullish } from '../util/CommonUtil.js'

export interface TaskHandler extends BasePlugin {
  pluginTool: PluginTool

  /**
   * 创建任务
   * @param url 需解析的url
   * @return 根据解析结果创建的任务数组
   */
  create(url: string): Promise<Task[] | Readable>

  /**
   * 生成作品信息
   * @param task 需开始的任务
   */
  generateWorksInfo(task: Task): Promise<WorksPluginDTO>

  /**
   * 获取用于开始任务的读取流
   * @param task 需开始的任务
   */
  start(task: Task): Promise<WorksPluginDTO>

  /**
   * 获取用于重试下载任务的读取流
   * @param task 需要重试的任务
   */
  retry(task: Task): Promise<WorksPluginDTO>

  /**
   * 暂停下载任务
   * @description 暂停读取流
   * @param task 需要暂停的任务
   */
  pause(task: TaskPluginDTO): void

  /**
   * 恢复下载任务
   * @description 获取用于恢复已停止的下载任务的读取流，这个流必须是暂停状态，continuable表示提供的流是否可接续在已下载部分的末尾
   * @param task 需要暂停的任务
   * @return 资源的读取流（必须是暂停状态）、是否可接续、资源大小
   */
  resume(task: TaskPluginDTO): Promise<PluginResumeResponse>
}

export class TaskHandlerFactory implements PluginFactory<TaskHandler> {
  async create(pluginId: number, pluginTool?: PluginTool): Promise<TaskHandler> {
    if (isNullish(pluginTool)) {
      const msg = '创建任务插件时，pluginTool不能为空'
      LogUtil.error('TaskHandlerFactory', msg)
      throw new Error(msg)
    }

    const installedPluginsService = new InstalledPluginsService()
    const pluginDTO = await installedPluginsService.getDTOById(pluginId)
    const pluginInfo = JSON.stringify(pluginDTO)
    const loadPath = pluginDTO.loadPath
    if (StringUtil.isBlank(loadPath)) {
      const msg = '未获取到插件信息'
      LogUtil.error('PluginLoader', msg)
      throw new Error(msg)
    }

    const module = await import(loadPath)
    const response = new module.default(pluginTool)

    // 验证taskPlugin是否符合TaskHandler接口要求
    let isTaskHandler: boolean
    // 查询插件信息，日志用
    // create方法
    isTaskHandler = 'create' in response && typeof response.create === 'function'
    if (!isTaskHandler) {
      const msg = `加载任务插件时出错，插件${pluginInfo}未实现create方法`
      LogUtil.error('PluginLoader', msg)
      throw new Error(msg)
    }

    // generateWorksInfo方法
    isTaskHandler = 'generateWorksInfo' in response && typeof response.start === 'function'
    if (!isTaskHandler) {
      const msg = `加载任务插件时出错，插件${pluginInfo}未实现generateWorksInfo方法`
      LogUtil.error('PluginLoader', msg)
      throw new Error(msg)
    }

    // start方法
    isTaskHandler = 'start' in response && typeof response.start === 'function'
    if (!isTaskHandler) {
      const msg = `加载任务插件时出错，插件${pluginInfo}未实现start方法`
      LogUtil.error('PluginLoader', msg)
      throw new Error(msg)
    }

    // retry方法
    isTaskHandler = 'retry' in response && typeof response.retry === 'function'
    if (!isTaskHandler) {
      const msg = `加载任务插件时出错，插件${pluginInfo}未实现retry方法`
      LogUtil.error('PluginLoader', msg)
      throw new Error(msg)
    }

    // pause方法
    isTaskHandler = 'pause' in response && typeof response.retry === 'function'
    if (!isTaskHandler) {
      const msg = `加载任务插件时出错，插件${pluginInfo}未实现pause方法`
      LogUtil.error('PluginLoader', msg)
      throw new Error(msg)
    }

    // resume方法
    isTaskHandler = 'resume' in response && typeof response.retry === 'function'
    if (!isTaskHandler) {
      const msg = `加载任务插件时出错，插件${pluginInfo}未实现resume方法`
      LogUtil.error('PluginLoader', msg)
      throw new Error(msg)
    }

    const taskHandler = response as TaskHandler
    taskHandler.pluginId = pluginId
    return taskHandler
  }
}
