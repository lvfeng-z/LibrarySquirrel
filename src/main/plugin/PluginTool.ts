import { MeaningOfPath } from '../model/util/MeaningOfPath.ts'
import { GetBrowserWindow } from '../util/MainWindowUtil.js'
import log from 'electron-log'
import WorkSetService from '../service/WorkSetService.ts'
import WorkSet from '../model/entity/WorkSet.ts'

export default class PluginTool {
  /**
   * 插件日志工具
   */
  public pluginLogUtil: PluginLogUtil

  /**
   * 作品集服务
   * @private
   */
  private readonly _workSetService: WorkSetService

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
    getPluginData: () => Promise<string | undefined>,
    workSetService: WorkSetService
  ) {
    this.pluginLogUtil = new PluginLogUtil(pluginName)
    this._requestExplainPath = requestExplainPath
    this._updatePluginData = updatePluginData
    this._getPluginData = getPluginData
    this._workSetService = workSetService
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

  /**
   * 根据作品集在站点的id和站点名称查询作品集
   * @param siteWorkSetId 作品集在站点的id
   * @param siteName 入库任务的id
   */
  public async getWorkSetBySiteWorkSetId(siteWorkSetId: string, siteName: string): Promise<WorkSet | undefined> {
    return this._workSetService.getBySiteWorkSetIdAndSiteName(siteWorkSetId, siteName)
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
