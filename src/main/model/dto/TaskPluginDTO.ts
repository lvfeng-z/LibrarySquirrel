import Task from '../Task.ts'
import { Readable } from 'node:stream'

export class TaskPluginDTO extends Task {
  /**
   * 远程资源流
   */
  remoteStream: Readable | undefined | null
}
