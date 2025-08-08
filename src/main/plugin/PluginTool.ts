import { MeaningOfPath } from '../model/util/MeaningOfPath.ts'
import { GetBrowserWindow } from '../util/MainWindowUtil.js'
import log from 'electron-log'

export default class PluginTool {
  /**
   * 插件日志工具
   */
  public pluginLogUtil: PluginLogUtil

  /**
   * 请求用户解释路径含义
   * @private
   */
  private readonly _requestExplainPath: (dir: string) => Promise<MeaningOfPath[]>

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
    pluginName: string,
    requestExplainPath: (dir: string) => Promise<MeaningOfPath[]>,
    updatePluginData: (pluginData: string) => Promise<number>,
    getPluginData: () => Promise<string | undefined>
  ) {
    this.pluginLogUtil = new PluginLogUtil(pluginName)
    this._requestExplainPath = requestExplainPath
    this._updatePluginData = updatePluginData
    this._getPluginData = getPluginData
  }

  /**
   * 在主窗口弹窗，由用户确认目录含义
   * @param dir 目录
   */
  public explainPath(dir: string): Promise<MeaningOfPath[]> {
    return this._requestExplainPath(dir)
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

class PluginLogUtil {
  private readonly pluginName: string
  constructor(pluginName: string) {
    this.pluginName = pluginName
  }
  public info(...args: unknown[]) {
    log.info(this.pluginName + ':', ...args)
  }

  public debug(...args: unknown[]) {
    log.debug(this.pluginName + ':', ...args)
  }

  public warn(...args: unknown[]) {
    log.warn(this.pluginName + ':', ...args)
  }

  public error(...args: unknown[]) {
    log.error(this.pluginName + ':', ...args)
  }
}
