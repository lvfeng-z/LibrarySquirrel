import { Readable } from 'node:stream'
import fs from 'fs'
import { EventEmitter } from 'node:events'

export interface TaskTracker {
  status: number
  readStream: Readable | undefined
  writeStream: fs.WriteStream | undefined
  bytesSum: number
  taskProcessController: TaskProcessController
}

export class TaskProcessController {
  /**
   * 事件派发器
   * @private
   */
  private readonly eventEmitter: EventEmitter

  constructor() {
    this.eventEmitter = new EventEmitter()
  }

  public pause() {
    this.eventEmitter.emit('pause')
  }

  public resume() {
    this.eventEmitter.emit('resume')
  }

  public oncePause(handler: () => unknown) {
    this.eventEmitter.once('pause', handler)
  }

  public onceResume(handler: () => unknown) {
    this.eventEmitter.emit('resume', handler)
  }
}
