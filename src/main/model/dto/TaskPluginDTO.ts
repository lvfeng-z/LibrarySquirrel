import Task from '../entity/Task.ts'
import { Readable } from 'node:stream'
import { IsNullish } from '../../util/CommonUtil.ts'

export class TaskPluginDTO extends Task {
  /**
   * 资源流
   */
  resourceStream: Readable | undefined | null

  /**
   * 已写入数据量
   */
  bytesWritten: number

  constructor(taskPluginDTO: TaskPluginDTO | Task) {
    if (IsNullish(taskPluginDTO)) {
      super()
      this.resourceStream = undefined
      this.bytesWritten = 0
    } else if (taskPluginDTO instanceof TaskPluginDTO) {
      super(taskPluginDTO)
      this.resourceStream = taskPluginDTO.resourceStream
      this.bytesWritten = taskPluginDTO.bytesWritten
    } else {
      super(taskPluginDTO)
      this.resourceStream = undefined
      this.bytesWritten = 0
    }
  }
}
