import InstalledPluginsService from '../service/InstalledPluginsService.ts'
import TaskHandler from './TaskHandler.ts'
import LogUtil from '../util/LogUtil.ts'

export default class PluginLoader {
  public async loadTaskPlugin(pluginId: number) {
    const classPath = await InstalledPluginsService.getClassPathById(pluginId)
    const module = await import(classPath)
    const taskPlugin = new module.default()

    // 验证taskPlugin是否符合TaskHandler接口要求
    let isTaskHandler: boolean
    // create方法
    isTaskHandler = 'create' in taskPlugin && typeof taskPlugin.create === 'function'
    if (!isTaskHandler) {
      const msg = `加载任务插件时出错，插件${classPath}未实现create方法`
      LogUtil.error('PluginLoader', msg)
      throw new Error(msg)
    }

    // start方法
    isTaskHandler = 'start' in taskPlugin && typeof taskPlugin.start === 'function'
    if (!isTaskHandler) {
      const msg = `加载任务插件时出错，插件${classPath}未实现start方法`
      LogUtil.error('PluginLoader', msg)
      throw new Error(msg)
    }

    return taskPlugin as TaskHandler
  }
}
