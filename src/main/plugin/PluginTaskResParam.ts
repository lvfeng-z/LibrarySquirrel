import Task from '../model/entity/Task.ts'
import ResourcePluginDTO from '../model/dto/ResourcePluginDTO.js'

export class PluginTaskResParam {
  /**
   * 任务
   */
  task: Task | undefined | null

  /**
   * 资源信息
   */
  resourcePluginDTO: ResourcePluginDTO | undefined | null

  /**
   * 已写入数据量
   */
  bytesWritten: number

  constructor(task: Task) {
    this.task = task
    this.resourcePluginDTO = undefined
    this.bytesWritten = 0
  }
}
