import { EventEmitter } from 'node:events'
import { MeaningOfPath } from '../model/util/MeaningOfPath.ts'
import { GetBrowserWindow } from '../util/MainWindowUtil.js'

export default class PluginTool {
  /**
   * 事件收发器
   * @private
   */
  emitter: EventEmitter

  /**
   * 更新插件数据
   * @private
   */
  private readonly _updatePluginData: (pluginData: string) => Promise<number>

  /**
   * 获取插件数据
   * @private
   */
  private readonly _getPluginData: () => Promise<string | undefined>

  constructor(
    events: EventEmitter,
    updatePluginData: (pluginData: string) => Promise<number>,
    getPluginData: () => Promise<string | undefined>
  ) {
    this.emitter = events
    this._updatePluginData = updatePluginData
    this._getPluginData = getPluginData
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

  /**
   * 获取插件数据
   */
  public getPluginData(): Promise<string | undefined> {
    return this._getPluginData()
  }

  /**
   * 更新插件数据
   * @param pluginData 插件数据
   */
  public setPluginData(pluginData: string): Promise<number> {
    return this._updatePluginData(pluginData)
  }
}
