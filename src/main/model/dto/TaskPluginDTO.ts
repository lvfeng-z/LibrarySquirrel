import Task from '../Task.ts'
import { Readable } from 'node:stream'
import { isNullish } from '../../util/CommonUtil.ts'

export class TaskPluginDTO extends Task {
  /**
   * 远程资源流
   */
  remoteStream: Readable | undefined | null

  constructor(taskPluginDTO: TaskPluginDTO | Task) {
    if (isNullish(taskPluginDTO)) {
      super()
      this.remoteStream = undefined
    } else if (taskPluginDTO instanceof TaskPluginDTO) {
      super(taskPluginDTO)
      this.remoteStream = taskPluginDTO.remoteStream
    } else {
      super(taskPluginDTO)
      this.remoteStream = undefined
    }
  }
}
