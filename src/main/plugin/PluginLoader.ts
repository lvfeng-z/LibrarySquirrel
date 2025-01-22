import LogUtil from '../util/LogUtil.ts'
import PluginTool from './PluginTool.ts'
import Electron from 'electron'
import { EventEmitter } from 'node:events'
import { MeaningOfPath } from '../model/util/MeaningOfPath.ts'
import LocalAuthorService from '../service/LocalAuthorService.ts'
import LocalTagService from '../service/LocalTagService.ts'
import SiteService from '../service/SiteService.ts'
import { IsNullish, NotNullish } from '../util/CommonUtil.ts'
import { PathTypeEnum } from '../constant/PathTypeEnum.ts'
import PluginFactory from './PluginFactory.js'
import { BasePlugin } from './BasePlugin.js'
import { GlobalVar, GlobalVars } from '../global/GlobalVar.js'

export default class PluginLoader<T extends BasePlugin> {
  /**
   * 插件工厂类
   * @private
   */
  private factory: PluginFactory<T>
  /**
   * 主窗口对象
   */
  private mainWindow: Electron.BrowserWindow
  /**
   * 插件工具
   */
  private pluginTool: PluginTool

  /**
   * 插件缓存
   * @private
   */
  private readonly pluginCache: Record<number, Promise<T>>

  constructor(factory: PluginFactory<T>) {
    this.factory = factory
    this.mainWindow = GlobalVar.get(GlobalVars.MAIN_WINDOW)
    const event = new EventEmitter()

    this.attachExplainPathEvents(event)
    this.pluginTool = new PluginTool(event)
    this.pluginCache = {}
  }

  public async load(pluginId: number) {
    // 加载并缓存插件和插件信息
    let plugin: Promise<T>

    if (IsNullish(this.pluginCache[pluginId])) {
      plugin = this.factory.create(pluginId, this.pluginTool)
      this.pluginCache[pluginId] = plugin
      return plugin
    } else {
      plugin = this.pluginCache[pluginId]
      return plugin
    }
  }

  /**
   * 为事件发射器附加用户解释目录含义的一系列事件和处理函数
   * @param event
   * @private
   */
  private async attachExplainPathEvents(event: EventEmitter) {
    // 处理插件工具的explain-path-request事件
    event.on('explain-path-request', (dir) => {
      // 监听渲染进程的explain-path-response事件
      Electron.ipcMain.once('explain-path-response', async (_event, meaningOfPaths: MeaningOfPath[]) => {
        for (const meaningOfPath of meaningOfPaths) {
          if (meaningOfPath.type === PathTypeEnum.AUTHOR) {
            const localAuthorService = new LocalAuthorService()
            if (NotNullish(meaningOfPath.id)) {
              const localAuthor = await localAuthorService.getById(meaningOfPath.id)
              if (IsNullish(localAuthor)) {
                const msg = '附加目录含义中的作者信息失败，未查询到作者'
                LogUtil.error('PluginLoader', msg)
                throw new Error(msg)
              }
              meaningOfPath.name = localAuthor.localAuthorName
              meaningOfPath.details = localAuthor
            }
          }
          if (meaningOfPath.type === PathTypeEnum.TAG) {
            const localTagService = new LocalTagService()
            if (NotNullish(meaningOfPath.id)) {
              const localTag = await localTagService.getById(meaningOfPath.id)
              if (IsNullish(localTag)) {
                const msg = '附加目录含义中的标签信息失败，未查询到作者'
                LogUtil.error('PluginLoader', msg)
                throw new Error(msg)
              }
              meaningOfPath.name = localTag.localTagName
              meaningOfPath.details = localTag
            }
          }
          if (meaningOfPath.type === PathTypeEnum.SITE) {
            const siteService = new SiteService()
            if (NotNullish(meaningOfPath.id)) {
              const site = await siteService.getById(meaningOfPath.id)
              if (IsNullish(site)) {
                const msg = '附加目录含义中的站点信息失败，未查询到作者'
                LogUtil.error('PluginLoader', msg)
                throw new Error(msg)
              }
              meaningOfPath.name = site.siteName
              meaningOfPath.details = site
            }
          }
        }
        event.emit('explain-path-response', meaningOfPaths)
      })
      // 向渲染进程发送explain-path-request事件
      this.mainWindow.webContents.send('explain-path-request', dir)
    })
  }
}
