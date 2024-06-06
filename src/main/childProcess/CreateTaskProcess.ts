import PluginLoader from '../plugin/PluginLoader.ts'
import TaskService from '../service/TaskService.ts'
import InstalledPluginsService from '../service/InstalledPluginsService.ts'
import { Readable } from 'node:stream'
import logUtil from '../util/LogUtil.ts'

process.parentPort.on('message', async (event) => {
  try {
    // 插件加载器
    const pluginLoader = new PluginLoader()

    // 记录创建的任务数量
    let taskNum = 0
    // 查询插件信息，用于输出日志
    const pluginInfo = JSON.stringify(
      await InstalledPluginsService.getById(taskPlugin.id as number)
    )

    try {
      // 异步加载插件
      const taskHandler = await pluginLoader.loadTaskPlugin(taskPlugin.id as number)

      // 创建任务
      const pluginResponse = await taskHandler.create(url)
      if (Array.isArray(pluginResponse)) {
        taskNum = await TaskService.handlePluginTaskArray(pluginResponse, url, taskPlugin).then()
      }
      if (pluginResponse instanceof Readable) {
        taskNum = await TaskService.handlePluginTaskStream(
          pluginResponse,
          url,
          taskPlugin,
          100,
          200
        ).then()
      }
    } catch (error) {
      logUtil.warn(
        'TaskService',
        `插件创建任务时出现异常，url: ${url}，plugin: ${pluginInfo}，error:`,
        error
      )
    }

    process.parentPort.postMessage(taskNum)
  } finally {
    process.exit()
  }
})
