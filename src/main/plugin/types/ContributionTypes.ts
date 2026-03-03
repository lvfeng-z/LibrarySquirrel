import { Readable } from 'node:stream'
import PluginTool from '../PluginTool.ts'
import { PluginTaskResParam } from '../PluginTaskResParam.ts'
import PluginWorkResponseDTO from '@shared/model/dto/PluginWorkResponseDTO.ts'
import Task from '@shared/model/entity/Task.ts'
import PluginCreateParentTaskResponseDTO from '@shared/model/dto/PluginCreateParentTaskResponseDTO.ts'

/**
 * 任务贡献点接口
 * 定义插件处理任务所需的所有方法
 */
export interface TaskContribution {
  /** 插件ID */
  pluginId: number
  /** 插件工具 */
  pluginTool: PluginTool

  /**
   * 创建任务
   * @param url 需解析的url
   * @return 任务数组或可读流
   */
  create(url: string): Promise<PluginCreateParentTaskResponseDTO[] | Readable>

  /**
   * 生成作品信息
   * @param task 需开始的任务
   */
  createWorkInfo(task: Task): Promise<PluginWorkResponseDTO>

  /**
   * 获取用于开始任务的读取流
   * @param task 需开始的任务
   */
  start(task: Task): Promise<PluginWorkResponseDTO>

  /**
   * 获取用于重试下载任务的读取流
   * @param task 需要重试的任务
   */
  retry(task: Task): Promise<PluginWorkResponseDTO>

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
  resume(taskResParam: PluginTaskResParam): Promise<PluginWorkResponseDTO>
}

/**
 * 贡献点映射表
 * 键为贡献点名称，值为对应的接口类型
 * 可在此扩展新的贡献点类型
 */
export interface ContributionMap {
  /** 任务贡献点 */
  task: TaskContribution
}

/**
 * 贡献点键名类型
 */
export type ContributionKey = keyof ContributionMap

/**
 * 获取指定贡献点的实现类型
 */
export type ContributionImplementation<K extends ContributionKey> = ContributionMap[K]
