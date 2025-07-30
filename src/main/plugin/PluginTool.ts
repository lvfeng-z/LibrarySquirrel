import { EventEmitter } from 'node:events'
import { MeaningOfPath } from '../model/util/MeaningOfPath.ts'
import { GetBrowserWindow } from '../util/MainWindowUtil.js'

export default class PluginTool {
  /**
   * 事件收发器
   * @private
   */
  emitter: EventEmitter

  constructor(events: EventEmitter) {
    this.emitter = events
  }

  /**
   * 在主窗口弹窗，由用户确认目录含义
   * @param dir 目录
   */
  public explainPath(dir: string): Promise<MeaningOfPath[]> {
    return new Promise((resolve) => {
      this.emitter.on('explain-path-response', (response) => {
        resolve(response)
      })
      this.emitter.emit('explain-path-request', dir)
    })
  }

  /**
   * 修改当前任务集的名称
   * @param collectionName 任务集名称
   */
  public changeCollectionName(collectionName: string): void {
    this.emitter.emit('change-collection-name-request', collectionName)
  }

  /**
   * 获取一个BrowserWindow实例
   * @param width 窗口宽度
   * @param height 窗口高度
   */
  public getBrowserWindow(width?: number, height?: number): Electron.BrowserWindow {
    return GetBrowserWindow(width, height)
  }
}
