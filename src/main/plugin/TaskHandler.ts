import Task from '../model/Task.ts'
import WorksDTO from '../model/dto/WorksDTO.ts'
import { Readable } from 'node:stream'
import PluginTool from './PluginTool.ts'
import { TaskPluginDTO } from '../model/dto/TaskPluginDTO.ts'

export default interface TaskHandler {
  pluginTool: PluginTool

  /**
   * 创建任务
   * @param url 需解析的url
   * @return 根据解析结果创建的任务数组
   */
  create(url: string): Promise<Task[] | Readable>

  /**
   * 开始任务
   * @param task 需开始的任务
   * @return 作品信息（包含资源的数据流）
   */
  start(task: Task): Promise<WorksDTO>

  /**
   * 重试下载任务
   * @param task 需要重试的任务
   * @return 作品信息（包含资源的数据流）
   */
  retry(task: Task): Promise<WorksDTO>

  /**
   * 暂停下载任务
   * @param task 需要暂停的任务
   * @return 作品信息（包含资源的数据流）
   */
  pause(task: TaskPluginDTO): Promise<void>

  /**
   * 暂停下载任务
   * @param task 需要暂停的任务
   * @return 接续已下载的文件的流
   */
  resume(task: Task): Readable
}
