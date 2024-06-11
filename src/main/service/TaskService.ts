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
import { SAVE_FAILED } from '../constant/CrudConstant.ts'
import InstalledPlugins from '../model/InstalledPlugins.ts'
import { Readable } from 'node:stream'
import limit from 'p-limit'
import Electron from 'electron'

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
 * @param mainWindow
 */
async function createTask(url: string, mainWindow: Electron.BrowserWindow): Promise<number> {
  // 查询监听此url的插件
  const taskPlugins = await TaskPluginListenerService.getMonitored(url)

  if (taskPlugins.length === 0) {
    logUtil.info('TaskService', '没有监听此链接的插件，url: ', url)
    return 0
  }

  // 插件加载器
  const pluginLoader = new PluginLoader(mainWindow)

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
        return handlePluginTaskArray(pluginResponse, url, taskPlugin)
      }
      if (pluginResponse instanceof Readable) {
        return handlePluginTaskStream(pluginResponse, url, taskPlugin, 100, 200)
      }
    } catch (error) {
      logUtil.warn(
        'TaskService',
        `插件创建任务时出现异常，url: ${url}，plugin: ${pluginInfo}，error:`,
        error
      )
    }
  }

  // 未能在循环中返回，则返回0
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

/**
 * 处理插件返回的任务流
 * @param pluginResponseTaskStream 插件返回的任务流
 * @param url 传给插件的url
 * @param taskPlugin 插件信息
 * @param batchSize 每次保存任务的数量
 * @param maxQueueLength 任务队列最大长度
 */
async function handlePluginTaskStream(
  pluginResponseTaskStream: Readable,
  url: string,
  taskPlugin: InstalledPlugins,
  batchSize: number,
  maxQueueLength: number
): Promise<number> {
  // 查询插件信息，用于输出日志
  const pluginInfo = JSON.stringify(taskPlugin)
  // 任务集合，只在任务多于1个的时候进行保存
  const parentTask = new Task()
  parentTask.pluginId = taskPlugin.id as number
  parentTask.pluginInfo = pluginInfo
  parentTask.url = url
  parentTask.status = TaskConstant.TaskStatesEnum.CREATED
  parentTask.siteDomain = taskPlugin.domain
  parentTask.isCollection = true
  // 任务计数
  let itemCount = 0
  // 集合任务存储过程
  let parentTaskProcess: Promise<number>
  // 任务队列
  const taskQueue: Task[] = []
  // 标记流是否已暂停
  let isPaused = false

  const parentTaskProcessing = async () => {
    return save(parentTask)
  }
  // 处理任务队列的函数
  async function processTasks() {
    const taskBuffer: Task[] = []
    // 从队列中取出最多batchSize个任务
    while (taskQueue.length > 0 && taskBuffer.length < batchSize) {
      taskBuffer.push(taskQueue.shift()!)
    }

    // 检查队列是否小于上限，如果是，则恢复流
    if (taskQueue.length < maxQueueLength && isPaused) {
      LogUtil.info('TaskService', `任务队列减至${taskQueue.length}个，恢复任务流`)
      pluginResponseTaskStream.resume()
      isPaused = false
    }

    // 如果缓冲区中有任务，则保存
    if (taskBuffer.length > 0) {
      saveBatch(taskBuffer).then()
    }
  }

  // data事件处理函数
  pluginResponseTaskStream.on('data', async (chunk) => {
    itemCount++
    // 如果任务集合尚未保存且任务数大于1，则先保存任务集合
    if (parentTaskProcess === undefined && itemCount > 1) {
      parentTaskProcess = parentTaskProcessing()
      parentTask.id = await parentTaskProcess
      // 更新parentId
      taskQueue.forEach((task) => (task.parentId = parentTask.id as number))
    }

    // 等待任务集合完成
    await parentTaskProcess
    // 解析JSON并创建任务对象
    const task = chunk as Task
    task.pluginId = taskPlugin.id as number
    task.pluginInfo = pluginInfo
    task.status = TaskConstant.TaskStatesEnum.CREATED
    task.siteDomain = taskPlugin.domain
    task.isCollection = false
    task.parentId = parentTask.id as number

    // 将任务添加到队列
    taskQueue.push(task)

    // 如果队列中的任务数量超过上限，则暂停流
    if (taskQueue.length >= maxQueueLength && !isPaused) {
      LogUtil.info(
        'TaskService',
        `任务队列超过${maxQueueLength}个，暂停任务流，已经收到${itemCount}个任务`
      )
      pluginResponseTaskStream.pause()
      isPaused = true
    }

    // 每batchSize个任务处理一次
    if (taskQueue.length % batchSize === 0) {
      await processTasks()
    }
  })

  // end事件处理函数
  pluginResponseTaskStream.on('end', async () => {
    try {
      // 所有数据读取完毕
      if (itemCount === 0) {
        logUtil.warn('TaskService', `插件未创建任务，url: ${url}，plugin: ${pluginInfo}`)
      } else if (itemCount === 1) {
        await save(taskQueue[0])
      } else if (taskQueue.length > 0) {
        await processTasks()
      }
    } catch (error) {
      LogUtil.error('TaskService', '处理任务流结束事件时出错，error:', error)
    } finally {
      LogUtil.info('TaskService', `任务流结束，创建了${itemCount}个任务`)
    }
  })

  return itemCount
}

/**
 * 开始任务
 * @param taskId
 * @param mainWindow
 */
async function startTask(taskId: number, mainWindow: Electron.BrowserWindow): Promise<boolean> {
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
  const pluginLoader = new PluginLoader(mainWindow)
  const taskHandler = await pluginLoader.loadTaskPlugin(baseTask.pluginId)

  // 尝试开始任务
  try {
    // 限制最多同时保存100个
    const maxSaveWorksPromise = 100
    const promiseLimit = limit(maxSaveWorksPromise)
    for (const task of tasks) {
      taskHandler.start(task).then((worksDTO) => {
        // 如果插件未返回任务id，发出警告并跳过此次循环
        if (
          !Object.prototype.hasOwnProperty.call(worksDTO, 'includeTaskId') ||
          worksDTO.includeTaskId === undefined ||
          worksDTO.includeTaskId === null
        ) {
          LogUtil.warn('TaskService', `插件未返回任务的id，plugin: ${pluginInfo}`)
          return
        }

        // 找到插件返回的作品对应的task
        const taskFilter = tasks.filter((task) => task.id == worksDTO.includeTaskId)
        if (taskFilter.length < 1) {
          // 如果插件返回的任务id越界，发出警告并跳过此次循环
          LogUtil.warn(
            'TaskService',
            `插件返回的任务id越界，taskId: ${worksDTO.includeTaskId}，plugin: ${pluginInfo}`
          )
          return
        }

        // 保存资源和作品信息
        promiseLimit(() => {
          WorksService.saveWorksAndResource(worksDTO).then((worksId) => {
            if (worksId === SAVE_FAILED) {
              taskFailed(taskFilter[0])
            } else {
              finishTask(taskFilter[0], worksId)
            }
          })
        })
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
 * @param worksId 本地作品id
 */
function finishTask(task: Task, worksId: number) {
  const dao = new TaskDao()
  task = new Task(task)
  task.status = TaskConstant.TaskStatesEnum.FINISHED
  task.localWorksId = worksId
  if (task.id !== undefined && task.id !== null) {
    return dao.updateById(task.id, task)
  } else {
    const msg = '任务标记为完成时，任务id意外为空'
    LogUtil.error('TaskService', msg)
    throw new Error(msg)
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
    const msg = '任务标记为失败时，任务id意外为空'
    LogUtil.error('TaskService', msg)
    throw new Error(msg)
  }
}

export default {
  save,
  saveBatch,
  createTask,
  startTask
}
