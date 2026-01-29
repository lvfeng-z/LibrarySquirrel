import LogUtil from '../util/LogUtil.ts'
import PluginTool from './PluginTool.ts'
import Electron from 'electron'
import { MeaningOfPath } from '../model/util/MeaningOfPath.ts'
import LocalAuthorService from '../service/LocalAuthorService.ts'
import LocalTagService from '../service/LocalTagService.ts'
import SiteService from '../service/SiteService.ts'
import { IsNullish, NotNullish } from '../util/CommonUtil.ts'
import { PathTypeEnum } from '../constant/PathTypeEnum.ts'
import PluginFactory from './PluginFactory.js'
import { BasePlugin } from '../base/BasePlugin.js'
import PluginService from '../service/PluginService.js'
import Plugin from '../model/entity/Plugin.js'
import WorkSetService from '../service/WorkSetService.ts'
import { getMainWindow } from '../core/mainWindow.ts'

export default class PluginLoader<T extends BasePlugin> {
  /**
   * 插件工厂类
   * @private
   */
  private factory: PluginFactory<T>
  /**
   * 主窗口对象
   */
  private readonly mainWindow: Electron.BrowserWindow
  /**
   * 插件缓存
   * @private
   */
  private readonly pluginCache: Record<number, Promise<T>>
  private readonly pluginService: PluginService

  constructor(factory: PluginFactory<T>, pluginService: PluginService) {
    this.factory = factory
    this.mainWindow = getMainWindow()
    this.pluginService = pluginService

    this.pluginCache = {}
  }

  public async load(pluginId: number) {
    // 加载并缓存插件和插件信息
    let plugin: Promise<T>

    if (IsNullish(this.pluginCache[pluginId])) {
      const pluginService = new PluginService()
      const pluginLoadDTO = await pluginService.getDTOById(pluginId)
      const pluginName = `Plugin[${pluginLoadDTO.author}-${pluginLoadDTO.name}-${pluginLoadDTO.version}]`
      const pluginTool = new PluginTool(
        pluginName,
        (dir: string) => this.requestExplainPath(dir),
        async (pluginData: string) => {
          const tempPlugin = new Plugin()
          tempPlugin.id = pluginId
          tempPlugin.pluginData = pluginData
          return this.pluginService.updateById(tempPlugin)
        },
        () => this.pluginService.getById(pluginId).then((plugin) => (IsNullish(plugin?.pluginData) ? undefined : plugin.pluginData)),
        new WorkSetService()
      )
      plugin = this.factory.create(pluginLoadDTO, pluginTool)
      this.pluginCache[pluginId] = plugin
      return plugin
    } else {
      plugin = this.pluginCache[pluginId]
      return plugin
    }
  }

  /**
   * 请求用户解释目录含义
   * @param dir 目录
   * @private
   */
  private requestExplainPath(dir: string): Promise<MeaningOfPath[]> {
    return new Promise((resolve, reject) => {
      // 监听渲染进程的explain-path-response事件
      Electron.ipcMain.once('explain-path-response', async (_event, meaningOfPaths: MeaningOfPath[]) => {
        for (const meaningOfPath of meaningOfPaths) {
          if (meaningOfPath.type === PathTypeEnum.AUTHOR) {
            const localAuthorService = new LocalAuthorService()
            if (NotNullish(meaningOfPath.id)) {
              const localAuthor = await localAuthorService.getById(meaningOfPath.id)
              if (IsNullish(localAuthor)) {
                const msg = '附加目录含义中的作者信息失败，作者id不可用'
                LogUtil.error('PluginLoader', msg)
                reject(msg)
              } else {
                meaningOfPath.name = localAuthor.authorName
                meaningOfPath.details = localAuthor
              }
            }
          }
          if (meaningOfPath.type === PathTypeEnum.TAG) {
            const localTagService = new LocalTagService()
            if (NotNullish(meaningOfPath.id)) {
              const localTag = await localTagService.getById(meaningOfPath.id)
              if (IsNullish(localTag)) {
                const msg = '附加目录含义中的标签信息失败，标签id不可用'
                LogUtil.error('PluginLoader', msg)
                reject(msg)
              } else {
                meaningOfPath.name = localTag.localTagName
                meaningOfPath.details = localTag
              }
            }
          }
          if (meaningOfPath.type === PathTypeEnum.SITE) {
            const siteService = new SiteService()
            if (NotNullish(meaningOfPath.id)) {
              const site = await siteService.getById(meaningOfPath.id)
              if (IsNullish(site)) {
                const msg = '附加目录含义中的站点信息失败，站点id不可用'
                LogUtil.error('PluginLoader', msg)
                reject(msg)
              } else {
                meaningOfPath.name = site.siteName
                meaningOfPath.details = site
              }
            }
          }
        }
        resolve(meaningOfPaths)
      })
      // 向渲染进程发送explain-path-request事件
      this.mainWindow.webContents.send('explain-path-request', dir)
    })
  }
}
