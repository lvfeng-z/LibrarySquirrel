import InstalledPluginsService from '../service/InstalledPluginsService.ts'
import TaskHandler from './TaskHandler.ts'
import LogUtil from '../util/LogUtil.ts'
import PluginTool from './PluginTool.ts'
import Electron from 'electron'
import { EventEmitter } from 'node:events'
import MeaningOfPath from '../model/utilModels/MeaningOfPath.ts'

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

    const events = new EventEmitter()

    // 处理插件工具的explain-path-request事件
    events.on('explain-path-request', (dir) => {
      const meaningOfPath = new MeaningOfPath()
      // 监听渲染进程的explain-path-response事件
      Electron.ipcMain.once('explain-path-response', (_event, args) => {
        meaningOfPath.name = args
        events.emit('explain-path-response', meaningOfPath)
      })
      // 向渲染进程发送explain-path-request事件
      this.mainWindow.webContents.send('explain-path-request', dir)
    })

    this.pluginTool = new PluginTool(events)
  }

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
}
