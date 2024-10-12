import Task from '../Task.ts'
import { Readable } from 'node:stream'
import { isNullish } from '../../util/CommonUtil.ts'

export class TaskPluginDTO extends Task {
  /**
   * 远程资源流
   */
  remoteStream: Readable | undefined | null

  /**
   * 已写入数据量
   */
  bytesWrote: number

  constructor(taskPluginDTO: TaskPluginDTO | Task) {
    if (isNullish(taskPluginDTO)) {
      super()
      this.remoteStream = undefined
      this.bytesWrote = 0
    } else if (taskPluginDTO instanceof TaskPluginDTO) {
      super(taskPluginDTO)
      this.remoteStream = taskPluginDTO.remoteStream
      this.bytesWrote = taskPluginDTO.bytesWrote
    } else {
      super(taskPluginDTO)
      this.remoteStream = undefined
      this.bytesWrote = 0
    }
  }
}
