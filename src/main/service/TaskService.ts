import Task from '../model/Task.ts'
import LogUtil from '../util/LogUtil.ts'
import logUtil from '../util/LogUtil.ts'
import TaskHandler from '../plugin/TaskHandler.ts'
import TaskDao from '../dao/TaskDao.ts'
import fs from 'fs'
import SettingsService from './SettingsService.ts'
import PluginLoader from '../plugin/PluginLoader.ts'
import TaskConstant from '../constant/TaskConstant.ts'
import TaskQueryDTO from '../model/queryDTO/TaskQueryDTO.ts'
import InstalledPluginsService from './InstalledPluginsService.ts'
import TaskPluginListenerService from './TaskPluginListenerService.ts'

/**
 * 保存
 * @param task
 */
async function save(task: Task): Promise<number> {
  task = new Task(task)
  const dao = new TaskDao()
  return (await dao.save(task)) as number
}

/**
 * 批量保存
 * @param tasks
 */
async function saveBatch(tasks: Task[]): Promise<number> {
  const dao = new TaskDao()
  return (await dao.saveBatch(tasks)) as number
}

/**
 * 根据传入的url创建任务
 * @param url 作品/作品集所在url
 */
async function createTask(url: string): Promise<number> {
  if (url.startsWith('file://')) {
    // 查询监听此url的插件
    // todo 需要处理监听此url的插件对应不同站点的情况
    const taskPlugins = await TaskPluginListenerService.getMonitored(url)

    // 插件加载器
    const pluginLoader = new PluginLoader()

    // 按照排序尝试每个插件
    for (const taskPlugin of taskPlugins) {
      // 查询插件信息，用于输出日志
      const pluginInfo = JSON.stringify(
        await InstalledPluginsService.getById(taskPlugin.id as number)
      )

      try {
        // 异步加载插件
        const taskHandler = await pluginLoader.loadTaskPlugin(taskPlugin.id as number)

        // 创建任务
        const pluginResponseTasks = await taskHandler.create(url)

        // 校验是否返回了空数据或非数组
        if (
          pluginResponseTasks === undefined ||
          pluginResponseTasks === null ||
          pluginResponseTasks.length === 0
        ) {
          logUtil.warn('TaskService', `插件未创建任务，url: ${url}，plugin: ${pluginInfo}`)
          return 0
        }

        // 清除所有插件不应处理的属性值
        const tasks = pluginResponseTasks.map((task) => {
          const temp = new Task(task)
          temp.security()
          return temp
        })

        // 根据插件返回的任务数组长度判断如何处理
        if (tasks.length === 1) {
          // 如果插件返回的的任务列表长度为1，则不需要创建子任务
          const task = tasks[0]
          task.status = TaskConstant.TaskStatesEnum.created
          task.isCollection = false
          try {
            task.pluginData = JSON.stringify(task.pluginData)
          } catch (error) {
            logUtil.error(
              'TaskService',
              `序列化插件保存的pluginData时出错，error: ${error}，url: ${url}，plugin: ${pluginInfo}，pluginData: ${task.pluginData}`
            )
            return 0
          }

          return save(task).then(() => 1)
        } else {
          // 如果插件返回的的任务列表长度大于1，则创建一个任务集合，所有的任务作为其子任务
          const parentTask = new Task()
          parentTask.isCollection = true
          parentTask.siteDomain = taskPlugin.domain
          parentTask.url = url
          parentTask.pluginId = taskPlugin.id as number
          parentTask.pluginInfo = pluginInfo
          const parentId = await save(parentTask)

          const childTasks = tasks
            .map((task) => {
              task.status = TaskConstant.TaskStatesEnum.created
              task.isCollection = false
              task.parentId = parentId
              task.pluginId = taskPlugin.id as number
              task.pluginInfo = pluginInfo
              task.siteDomain = taskPlugin.domain
              try {
                task.pluginData = JSON.stringify(task.pluginData)
              } catch (error) {
                logUtil.error(
                  'TaskService',
                  `序列化插件保存的pluginData时出错，error: ${error}，url: ${url}，plugin: ${pluginInfo}，pluginData: ${task.pluginData}`
                )
                return undefined
              }
              return task
            })
            .filter((childTask) => childTask !== undefined) as Task[]

          return saveBatch(childTasks)
        }
      } catch (error) {
        logUtil.warn(
          'TaskService',
          `插件创建任务时出现异常，error: ${error}，url: ${url}，plugin: ${pluginInfo}`
        )
      }
    }
  }

  // 到此处依然没有返回，说明失败了
  return 0
}

/**
 * 开始任务
 * @param taskId
 */
async function startTask(taskId: number): Promise<boolean> {
  const dao = new TaskDao()
  const task = await dao.getById(taskId)

  if (task === undefined) {
    const msg = `找不到任务，taskId = ${taskId}`
    LogUtil.error('TaskService', msg)
    return false
  }

  let tasks: Task[] = []

  if (task.isCollection) {
    tasks = await getChildrenTask(task.id as number)
  }

  // 校验任务的插件id
  if (task.pluginId === undefined || task.pluginId === null) {
    const msg = `任务的插件id意外为空，taskId: ${task.id}`
    LogUtil.error('TaskService', msg)
    throw new Error(msg)
  }

  // 查询插件信息，日志用
  const pluginInfo = JSON.stringify(await InstalledPluginsService.getById(task.pluginId))

  const pluginLoader = new PluginLoader()
  return pluginLoader.loadTaskPlugin(task.pluginId).then(async (taskHandler: TaskHandler) => {
    try {
      const worksDTOs = await taskHandler.start(tasks)
      // 记录任务id，用于校验插件返回的任务id是否越界
      const taskIds = tasks.map((task) => task.id)

      const settings = SettingsService.getSettings() as { workdir: string }

      for (const worksDTO of worksDTOs) {
        // 如果插件未返回任务id，发出警告并跳过此次循环
        if (
          Object.prototype.hasOwnProperty.call(worksDTO, 'includeTaskId') &&
          worksDTO.includeTaskId !== undefined &&
          worksDTO.includeTaskId !== null
        ) {
          // 如果插件返回的任务id越界，发出警告并跳过此次循环
          if (!taskIds.includes(worksDTO.includeTaskId)) {
            LogUtil.warn(
              'TaskService',
              `插件返回的任务id越界，taskId: ${worksDTO.includeTaskId}，plugin: ${pluginInfo}`
            )
            continue
          }
        } else {
          LogUtil.warn('TaskService', `插件未返回任务的id，plugin: ${pluginInfo}`)
          continue
        }

        // 如果插件返回了任务资源，将资源保存至本地，否则发出警告
        if (
          Object.prototype.hasOwnProperty.call(worksDTO, 'resourceStream') &&
          worksDTO.resourceStream !== undefined &&
          worksDTO.resourceStream !== null
        ) {
          // 提取作品的部分信息，用于文件命名
          // 作者信息
          const siteAuthorName: string = 'unknown'
          if (
            Object.prototype.hasOwnProperty.call(worksDTO, 'siteAuthor') &&
            worksDTO.siteAuthor !== undefined &&
            worksDTO.siteAuthor !== null
          ) {
            if (
              worksDTO.siteAuthor.siteAuthorName === undefined ||
              worksDTO.siteAuthor.siteAuthorName === null
            ) {
              LogUtil.warn('TaskService', `任务taskId: ${worksDTO.includeTaskId}未返回作者名称`)
            }
          }
          // 作品信息
          const siteWorksName =
            worksDTO.siteWorksName === undefined ? 'unknown' : worksDTO.siteWorksName

          const writeStream = fs.createWriteStream(
            `${settings.workdir}/download/[${siteAuthorName}_${siteWorksName}]`
          )
          worksDTO.resourceStream.pipe(writeStream)

          worksDTO.resourceStream.on('end', () => {
            finishTask(worksDTO.includeTaskId as number)
          })
          worksDTO.resourceStream.on('error', () => {
            taskFailed(worksDTO.includeTaskId as number)
          })
        } else {
          taskFailed(worksDTO.includeTaskId as number)
          LogUtil.warn(
            'TaskService',
            `插件未返回任务的资源，taskId: ${worksDTO.includeTaskId}，plugin: ${pluginInfo}`
          )
        }
      }
      return true
    } catch (err) {
      LogUtil.error('TaskService', err)
      return false
    }
  })
}

function getChildrenTask(parentId: number) {
  const dao = new TaskDao()
  const query = new TaskQueryDTO()
  query.parentId = parentId
  return dao.selectList(query)
}

/**
 * 任务完成
 * @param taskId
 */
function finishTask(taskId: number) {
  const dao = new TaskDao()
  const task = new Task()
  task.status = TaskConstant.TaskStatesEnum.finished
  return dao.updateById(taskId, task)
}

/**
 * 任务失败
 * @param taskId
 */
function taskFailed(taskId: number) {
  const dao = new TaskDao()
  const task = new Task()
  task.status = TaskConstant.TaskStatesEnum.failed
  return dao.updateById(taskId, task)
}

export default {
  save,
  saveBatch,
  createTask,
  startTask
}
