import Task from '../model/entity/Task.ts'
import { Readable } from 'node:stream'
import PluginTool from './PluginTool.ts'
import { PluginTaskResParam } from './PluginTaskResParam.ts'
import PluginWorksResponseDTO from '../model/dto/PluginWorksResponseDTO.ts'
import { BasePlugin } from '../base/BasePlugin.js'
import PluginFactory from './PluginFactory.js'
import PluginParentTaskResponseDTO from '../model/dto/PluginParentTaskResponseDTO.js'
import { AssertNotBlank, AssertNotNullish, AssertTrue } from '../util/AssertUtil.js'
import PluginLoadDTO from '../model/dto/PluginLoadDTO.js'

export interface TaskHandler extends BasePlugin {
  pluginTool: PluginTool

  /**
   * 创建任务
   * @param url 需解析的url
   * @return 根据解析结果创建的任务数组
   */
  create(url: string): Promise<PluginParentTaskResponseDTO[] | Readable>

  /**
   * 生成作品信息
   * @param task 需开始的任务
   */
  createWorksInfo(task: Task): Promise<PluginWorksResponseDTO>

  /**
   * 获取用于开始任务的读取流
   * @param task 需开始的任务
   */
  start(task: Task): Promise<PluginWorksResponseDTO>

  /**
   * 获取用于重试下载任务的读取流
   * @param task 需要重试的任务
   */
  retry(task: Task): Promise<PluginWorksResponseDTO>

  /**
   * 暂停下载任务
   * @description 暂停读取流
   * @param taskResParam 需要暂停的任务和资源数据
   */
  pause(taskResParam: PluginTaskResParam): Promise<void>

  /**
   * 停止下载任务
   * @param taskResParam 需要停止的任务和资源数据
   */
  stop(taskResParam: PluginTaskResParam): Promise<void>

  /**
   * 恢复下载任务
   * @description 获取用于恢复已停止的下载任务的数据，continuable表示提供的流是否可接续在已下载部分的末尾
   * @param taskResParam 需要恢复下载的任务和资源数据
   */
  resume(taskResParam: PluginTaskResParam): Promise<PluginWorksResponseDTO>
}

export class TaskHandlerFactory implements PluginFactory<TaskHandler> {
  async create(pluginDTO: PluginLoadDTO, pluginTool?: PluginTool): Promise<TaskHandler> {
    AssertNotNullish(pluginDTO.id, this.constructor.name, `创建任务插件失败，pluginId不能为空`)
    AssertNotNullish(pluginTool, this.constructor.name, `创建任务插件失败，pluginTool不能为空`)

    AssertNotBlank(pluginDTO.loadPath, this.constructor.name, `创建任务插件失败，插件加载入口不可用`)
    const pluginInfo = JSON.stringify(pluginDTO)

    const module = await import(pluginDTO.loadPath)
    const response = new module.default(pluginTool, pluginDTO.pluginData)

    // 验证taskPlugin是否实现了TaskHandler接口
    let isTaskHandler: boolean
    // create方法
    isTaskHandler = 'create' in response && typeof response.create === 'function'
    AssertTrue(isTaskHandler, `加载任务插件失败，插件未实现create方法，${pluginInfo}`)

    // createWorksInfo方法
    isTaskHandler = 'createWorksInfo' in response && typeof response.createWorksInfo === 'function'
    AssertTrue(isTaskHandler, `加载任务插件失败，插件未实现createWorksInfo方法，${pluginInfo}`)

    // start方法
    isTaskHandler = 'start' in response && typeof response.start === 'function'
    AssertTrue(isTaskHandler, `加载任务插件失败，插件未实现start方法，${pluginInfo}`)

    // retry方法
    isTaskHandler = 'retry' in response && typeof response.retry === 'function'
    AssertTrue(isTaskHandler, `加载任务插件失败，插件未实现retry方法，${pluginInfo}`)

    // pause方法
    isTaskHandler = 'pause' in response && typeof response.pause === 'function'
    AssertTrue(isTaskHandler, `加载任务插件失败，插件未实现pause方法，${pluginInfo}`)

    // stop方法
    isTaskHandler = 'stop' in response && typeof response.stop === 'function'
    AssertTrue(isTaskHandler, `加载任务插件失败，插件未实现stop方法，${pluginInfo}`)

    // resume方法
    isTaskHandler = 'resume' in response && typeof response.resume === 'function'
    AssertTrue(isTaskHandler, `加载任务插件失败，插件未实现resume方法，${pluginInfo}`)

    const taskHandler = response as TaskHandler
    taskHandler.pluginId = pluginDTO.id
    return taskHandler
  }
}
