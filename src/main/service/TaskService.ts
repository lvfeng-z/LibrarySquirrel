import Task from '../model/Task.ts'
import LogUtil from '../util/LogUtil.ts'
import logUtil from '../util/LogUtil.ts'
import TaskDao from '../dao/TaskDao.ts'
import PluginLoader from '../plugin/PluginLoader.ts'
import TaskConstant from '../constant/TaskConstant.ts'
import TaskQueryDTO from '../model/queryDTO/TaskQueryDTO.ts'
import InstalledPluginsService from './InstalledPluginsService.ts'
import TaskPluginListenerService from './TaskPluginListenerService.ts'
import WorksService from './WorksService.ts'
import CrudConstant from '../constant/CrudConstant.ts'
import InstalledPlugins from '../model/InstalledPlugins.ts'
import { Readable } from 'node:stream'

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
  // 查询监听此url的插件
  // todo 需要处理监听此url的插件对应不同站点的情况
  const taskPlugins = await TaskPluginListenerService.getMonitored(url)

  if (taskPlugins.length === 0) {
    logUtil.info('TaskService', '没有监听此链接的插件，url: ', url)
    return 0
  }

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
      const pluginResponse = await taskHandler.create(url)
      if (Array.isArray(pluginResponse)) {
        await handlePluginTaskArray(pluginResponse, url, taskPlugin)
      }
      if (pluginResponse instanceof Readable) {
        await handlePluginTaskStream(pluginResponse, url, taskPlugin)
      }
    } catch (error) {
      logUtil.warn(
        'TaskService',
        `插件创建任务时出现异常，url: ${url}，plugin: ${pluginInfo}，error:`,
        error
      )
    }
  }

  // 到此处依然没有返回，说明失败了
  return 0
}

/**
 * 处理插件返回的任务数组
 * @param pluginResponseTasks 插件返回的任务数组
 * @param url 传给插件的url
 * @param taskPlugin 插件信息
 */
async function handlePluginTaskArray(
  pluginResponseTasks: Task[],
  url: string,
  taskPlugin: InstalledPlugins
): Promise<number> {
  // 查询插件信息，用于输出日志
  const pluginInfo = JSON.stringify(taskPlugin)

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
    task.status = TaskConstant.TaskStatesEnum.CREATED
    task.isCollection = false
    try {
      task.pluginData = JSON.stringify(task.pluginData)
    } catch (error) {
      logUtil.error(
        'TaskService',
        `序列化插件保存的pluginData时出错，url: ${url}，plugin: ${pluginInfo}，pluginData: ${task.pluginData}，error:`,
        error
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
        task.status = TaskConstant.TaskStatesEnum.CREATED
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
            `序列化插件保存的pluginData时出错，url: ${url}，plugin: ${pluginInfo}，pluginData: ${task.pluginData}，error:`,
            error
          )
          return undefined
        }
        return task
      })
      .filter((childTask) => childTask !== undefined) as Task[]

    return saveBatch(childTasks)
  }
}

async function handlePluginTaskStream(
  pluginResponseTaskStream: Readable,
  url: string,
  taskPlugin: InstalledPlugins
) {
  console.log(url, taskPlugin)
  let hasItems = false // 是否有数据的标记
  let itemCount = 0 // 计数器

  pluginResponseTaskStream.on('data', (chunk) => {
    const task = JSON.parse(chunk)
    logUtil.info('TaskService', task)
    // 数据到来，标记为非空并增加计数
    hasItems = true
    itemCount++
  })

  pluginResponseTaskStream.on('end', () => {
    // 所有数据读取完毕
    if (!hasItems) {
      console.log('Stream is empty.')
    } else if (itemCount === 1) {
      console.log('Stream has exactly 1 item.')
    } else {
      console.log(`Stream has more than 1 item, total: ${itemCount}`)
    }
  })

  // 开始读取流
  pluginResponseTaskStream.resume()
}

/**
 * 开始任务
 * @param taskId
 */
async function startTask(taskId: number): Promise<boolean> {
  const dao = new TaskDao()
  const baseTask = await dao.getById(taskId)

  if (baseTask === undefined) {
    const msg = `找不到任务，taskId = ${taskId}`
    LogUtil.error('TaskService', msg)
    return false
  }

  let tasks: Task[] = []

  // 如果任务是一个任务集合，则其子任务放进tasks，否则其自身放进tasks
  if (baseTask.isCollection) {
    tasks = await getChildrenTask(baseTask.id as number)
  } else {
    tasks.push(baseTask)
  }

  // 校验任务的插件id
  if (baseTask.pluginId === undefined || baseTask.pluginId === null) {
    const msg = `任务的插件id意外为空，taskId: ${baseTask.id}`
    LogUtil.error('TaskService', msg)
    throw new Error(msg)
  }

  // 查询插件信息，日志用
  const pluginInfo = JSON.stringify(await InstalledPluginsService.getById(baseTask.pluginId))

  // 加载插件
  const pluginLoader = new PluginLoader()
  const taskHandler = await pluginLoader.loadTaskPlugin(baseTask.pluginId)

  // 尝试开始任务
  try {
    const worksDTOs = await taskHandler.start(tasks)

    for (const worksDTO of worksDTOs) {
      // 如果插件未返回任务id，发出警告并跳过此次循环
      if (
        !Object.prototype.hasOwnProperty.call(worksDTO, 'includeTaskId') ||
        worksDTO.includeTaskId === undefined ||
        worksDTO.includeTaskId === null
      ) {
        LogUtil.warn('TaskService', `插件未返回任务的id，plugin: ${pluginInfo}`)
        continue
      }

      // 找到插件返回的作品对应的task
      const taskFilter = tasks.filter((task) => task.id !== worksDTO.includeTaskId)
      if (taskFilter.length < 1) {
        // 如果插件返回的任务id越界，发出警告并跳过此次循环
        LogUtil.warn(
          'TaskService',
          `插件返回的任务id越界，taskId: ${worksDTO.includeTaskId}，plugin: ${pluginInfo}`
        )
        continue
      }

      WorksService.saveWorksAndResource(worksDTO).then((worksId) => {
        if (worksId === CrudConstant.saveFailed) {
          taskFailed(taskFilter[0])
        } else {
          finishTask(taskFilter[0])
        }
      })
    }
    return true
  } catch (error) {
    LogUtil.error('TaskService', '开始任务时出错，error: ', error)
    return false
  }
}

/**
 * 获取parentId的子任务
 * @param parentId
 */
function getChildrenTask(parentId: number) {
  const dao = new TaskDao()
  const query = new TaskQueryDTO()
  query.parentId = parentId
  return dao.selectList(query)
}

/**
 * 任务完成
 * @param task 任务信息
 */
function finishTask(task: Task) {
  const dao = new TaskDao()
  task = new Task(task)
  task.status = TaskConstant.TaskStatesEnum.FINISHED
  if (task.id !== undefined && task.id !== null) {
    return dao.updateById(task.id, task)
  } else {
    throw new Error('任务标记为完成时，任务id意外为空')
  }
}

/**
 * 任务失败
 * @param task
 */
function taskFailed(task: Task) {
  const dao = new TaskDao()
  task = new Task(task)
  task.status = TaskConstant.TaskStatesEnum.FAILED
  if (task.id !== undefined && task.id !== null) {
    return dao.updateById(task.id, task)
  } else {
    throw new Error('任务标记为完成时，任务id意外为空')
  }
}

export default {
  save,
  saveBatch,
  createTask,
  startTask
}
