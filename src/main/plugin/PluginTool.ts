import { EventEmitter } from 'node:events'
import { MeaningOfPath } from '../model/utilModels/MeaningOfPath.ts'

export default class PluginTool {
  /**
   * 事件收发器
   * @private
   */
  events: EventEmitter

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

  /**
   * 修改当前任务集的名称
   * @param collectionName 任务集名称
   */
  public changeCollectionName(collectionName: string): void {
    this.events.emit('change-collection-name-request', collectionName)
  }
}
