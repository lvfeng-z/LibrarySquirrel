import { Readable } from 'node:stream'
import fs from 'fs'
import { EventEmitter } from 'node:events'

export interface TaskTracker {
  status: number
  readStream: Readable
  writeStream: fs.WriteStream | undefined
  bytesSum: number
  taskProcessController: TaskProcessController
}

export class TaskProcessController {
  /**
   * 事件派发器
   * @private
   */
  public readonly eventEmitter: EventEmitter

  constructor() {
    this.eventEmitter = new EventEmitter()
  }

  public pause() {
    this.eventEmitter.emit('pause')
  }

  public resume() {
    this.eventEmitter.emit('resume')
  }
}
