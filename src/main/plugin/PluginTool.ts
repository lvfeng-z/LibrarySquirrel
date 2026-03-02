import { MeaningOfPath } from '@shared/model/util/MeaningOfPath.ts'
import { GetBrowserWindow } from '../util/MainWindowUtil.js'
import log from 'electron-log'
import WorkSetService from '../service/WorkSetService.ts'
import WorkSet from '@shared/model/entity/WorkSet.ts'

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

  /**
   * 存储加密信息并获取密文键
   * @private
   */
  private readonly _storeEncryptedValue: (plainValue: string, description?: string) => Promise<string>

  /**
   * 根据密文键获取解密后的值
   * @private
   */
  private readonly _getDecryptedValue: (storageKey: string) => Promise<string | undefined>

  /**
   * 删除加密存储
   * @private
   */
  private readonly _removeEncryptedValue: (storageKey: string) => Promise<number>

  constructor(
    pluginName: string,
    requestExplainPath: (dir: string) => Promise<MeaningOfPath[]>,
    updatePluginData: (pluginData: string) => Promise<number>,
    getPluginData: () => Promise<string | undefined>,
    workSetService: WorkSetService,
    storeEncryptedValue: (plainValue: string, description?: string) => Promise<string>,
    getDecryptedValue: (storageKey: string) => Promise<string | undefined>,
    removeEncryptedValue: (storageKey: string) => Promise<number>
  ) {
    this.pluginLogUtil = new PluginLogUtil(pluginName)
    this._requestExplainPath = requestExplainPath
    this._updatePluginData = updatePluginData
    this._getPluginData = getPluginData
    this._workSetService = workSetService
    this._storeEncryptedValue = storeEncryptedValue
    this._getDecryptedValue = getDecryptedValue
    this._removeEncryptedValue = removeEncryptedValue
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
   * 存储加密信息并获取密文键
   * 将明文加密存储，返回一个密文键。后续可通过此键获取解密后的值
   * @param plainValue 明文值（将被加密存储）
   * @param description 描述（可选），用于标识存储的内容
   * @returns 密文键，用于后续获取解密后的值
   */
  public storeEncryptedValue(plainValue: string, description?: string): Promise<string> {
    return this._storeEncryptedValue(plainValue, description)
  }

  /**
   * 根据密文键获取解密后的值
   * @param storageKey 密文键
   * @returns 解密后的明文值，如果不存在则返回 undefined
   */
  public getDecryptedValue(storageKey: string): Promise<string | undefined> {
    return this._getDecryptedValue(storageKey)
  }

  /**
   * 删除加密存储
   * @param storageKey 密文键
   * @returns 删除的行数
   */
  public removeEncryptedValue(storageKey: string): Promise<number> {
    return this._removeEncryptedValue(storageKey)
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
