import Task from '../model/entity/Task.ts'
import PluginResourceDTO from '../model/dto/PluginResourceDTO.ts'

export class PluginTaskResParam {
  /**
   * 任务
   */
  task: Task | undefined | null

  /**
   * 资源信息
   */
  resourcePluginDTO: PluginResourceDTO | undefined | null

  /**
   * 资源路径
   */
  resourcePath: string | undefined

  constructor(task: Task) {
    this.task = task
    this.resourcePluginDTO = undefined
    this.resourcePath = undefined
  }
}
