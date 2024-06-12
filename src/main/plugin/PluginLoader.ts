import InstalledPluginsService from '../service/InstalledPluginsService.ts'
import TaskHandler from './TaskHandler.ts'
import LogUtil from '../util/LogUtil.ts'
import PluginTool from './PluginTool.ts'
import Electron from 'electron'
import { EventEmitter } from 'node:events'
import { MeaningOfPath } from '../model/utilModels/MeaningOfPath.ts'
import LocalAuthorService from '../service/LocalAuthorService.ts'
import LocalTagService from '../service/LocalTagService.ts'

export default class PluginLoader {
  /**
   * 主窗口对象
   */
  mainWindow: Electron.BrowserWindow
  /**
   * 插件工具
   */
  pluginTool: PluginTool

  constructor(mainWindow: Electron.BrowserWindow) {
    this.mainWindow = mainWindow
    const event = new EventEmitter()

    this.attachExplainPathEvents(event)
    this.pluginTool = new PluginTool(event)
  }

  /**
   * 加载任务插件
   * @param pluginId
   */
  public async loadTaskPlugin(pluginId: number) {
    const classPath = await InstalledPluginsService.getClassPathById(pluginId)
    const module = await import(classPath)
    const taskPlugin = new module.default(this.pluginTool)

    // 验证taskPlugin是否符合TaskHandler接口要求
    let isTaskHandler: boolean
    // 查询插件信息，日志用
    const pluginInfo = JSON.stringify(await InstalledPluginsService.getById(pluginId))
    // create方法
    isTaskHandler = 'create' in taskPlugin && typeof taskPlugin.create === 'function'
    if (!isTaskHandler) {
      const msg = `加载任务插件时出错，插件${pluginInfo}未实现create方法`
      LogUtil.error('PluginLoader', msg)
      throw new Error(msg)
    }

    // start方法
    isTaskHandler = 'start' in taskPlugin && typeof taskPlugin.start === 'function'
    if (!isTaskHandler) {
      const msg = `加载任务插件时出错，插件${pluginInfo}未实现start方法`
      LogUtil.error('PluginLoader', msg)
      throw new Error(msg)
    }

    // retry方法
    isTaskHandler = 'retry' in taskPlugin && typeof taskPlugin.retry === 'function'
    if (!isTaskHandler) {
      const msg = `加载任务插件时出错，插件${pluginInfo}未实现retry方法`
      LogUtil.error('PluginLoader', msg)
      throw new Error(msg)
    }

    return taskPlugin as TaskHandler
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
      Electron.ipcMain.once(
        'explain-path-response',
        async (_event, meaningOfPaths: MeaningOfPath[]) => {
          for (const meaningOfPath of meaningOfPaths) {
            if (meaningOfPath.id === undefined || meaningOfPath.id === null) {
              const msg = '获取目录含义的详情时，id意外为空，'
              LogUtil.error('PluginLoader', msg)
              throw new Error(msg)
            }

            if (meaningOfPath.type === 'author') {
              const localAuthorService = new LocalAuthorService()
              const localAuthor = await localAuthorService.getById(meaningOfPath.id)
              meaningOfPath.name = localAuthor.localAuthorName
              meaningOfPath.details = localAuthor
            }
            if (meaningOfPath.type === 'tag') {
              const localTagService = new LocalTagService()
              const localTag = await localTagService.getById(meaningOfPath.id)
              meaningOfPath.name = localTag.localTagName
              meaningOfPath.details = localTag
            }
          }
          event.emit('explain-path-response', meaningOfPaths)
        }
      )
      // 向渲染进程发送explain-path-request事件
      this.mainWindow.webContents.send('explain-path-request', dir)
    })
  }
}
