import { EventEmitter } from 'node:events'
import { MeaningOfPath } from '../model/utilModels/MeaningOfPath.ts'

export default class PluginTool {
  /**
   * 事件收发器
   * @private
   */
  private events: EventEmitter

  constructor(events: EventEmitter) {
    this.events = events
  }

  /**
   * 在主窗口弹窗，由用户确认目录含义
   * @param dir 目录
   */
  public explainPath(dir: string): Promise<MeaningOfPath[]> {
    return new Promise((resolve) => {
      this.events.on('explain-path-response', (response) => {
        resolve(response)
      })
      this.events.emit('explain-path-request', dir)
    })
  }
}
