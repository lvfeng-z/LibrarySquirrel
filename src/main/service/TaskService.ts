import Task from '../model/Task.ts'
import LogUtil from '../util/LogUtil.ts'
import logUtil from '../util/LogUtil.ts'
import TaskDao from '../dao/TaskDao.ts'
import PluginLoader from '../plugin/PluginLoader.ts'
import { TaskStatesEnum } from '../constant/TaskStatesEnum.ts'
import TaskQueryDTO from '../model/queryDTO/TaskQueryDTO.ts'
import InstalledPluginsService from './InstalledPluginsService.ts'
import TaskPluginListenerService from './TaskPluginListenerService.ts'
import WorksService from './WorksService.ts'
import InstalledPlugins from '../model/InstalledPlugins.ts'
import { Readable } from 'node:stream'
import limit from 'p-limit'
import Electron from 'electron'
import BaseService from './BaseService.ts'
import DB from '../database/DB.ts'
import lodash from 'lodash'
import { isNullish, notNullish } from '../util/CommonUtil.ts'
import PageModel from '../model/utilModels/PageModel.ts'
import { COMPARATOR } from '../constant/CrudConstant.ts'
import TaskDTO from '../model/dto/TaskDTO.ts'
import TaskHandler from '../plugin/TaskHandler.ts'
import TaskCreateDTO from '../model/dto/TaskCreateDTO.ts'
import TaskScheduleDTO from '../model/dto/TaskScheduleDTO.ts'
import { EventEmitter } from 'node:events'
import fs from 'fs'

export default class TaskService extends BaseService<TaskQueryDTO, Task, TaskDao> {
  constructor(db?: DB) {
    super('TaskService', new TaskDao(db), db)
  }

  /**
   * 根据传入的url创建任务
   * @param url 作品/作品集所在url
   * @param mainWindow
   */
  async createTask(url: string, mainWindow: Electron.BrowserWindow): Promise<number> {
    // 查询监听此url的插件
    const taskPluginListenerService = new TaskPluginListenerService()
    const taskPlugins = await taskPluginListenerService.getListener(url)

    if (taskPlugins.length === 0) {
      logUtil.info('TaskService', '没有监听此链接的插件，url: ', url)
      return 0
    }

    // 插件加载器
    const pluginLoader = new PluginLoader(mainWindow)

    // 按照排序尝试每个插件
    for (const taskPlugin of taskPlugins) {
      // 查询插件信息，用于输出日志
      const installedPluginsService = new InstalledPluginsService()
      const pluginInfo = JSON.stringify(
        await installedPluginsService.getById(taskPlugin.id as number)
      )

      try {
        // 异步加载插件
        const taskHandler = await pluginLoader.loadTaskPlugin(taskPlugin.id as number)

        // 任务集
        const parentTask = new TaskCreateDTO()
        parentTask.pluginId = taskPlugin.id as number
        parentTask.pluginInfo = pluginInfo
        parentTask.url = url
        parentTask.status = TaskStatesEnum.CREATED
        parentTask.siteDomain = taskPlugin.domain
        parentTask.isCollection = true
        parentTask.saved = false
        taskHandler.pluginTool.events.on('change-collection-name-request', (taskName: string) => {
          parentTask.taskName = taskName
          if (parentTask.saved) {
            const tempTask = new Task(parentTask)
            this.updateById(tempTask)
          }
        })

        // 创建任务
        const pluginResponse = await taskHandler.create(url)

        // 分别处理数组类型和流类型的响应值
        if (Array.isArray(pluginResponse)) {
          return this.handlePluginTaskArray(pluginResponse, url, taskPlugin, parentTask)
        } else if (pluginResponse instanceof Readable) {
          return this.handlePluginTaskStream(pluginResponse, url, taskPlugin, parentTask, 100, 200)
        } else {
          logUtil.warn('TaskService', '插件返回了不支持的类型')
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
   * @param parentTask 任务集
   */
  async handlePluginTaskArray(
    pluginResponseTasks: Task[],
    url: string,
    taskPlugin: InstalledPlugins,
    parentTask: TaskCreateDTO
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
      task.status = TaskStatesEnum.CREATED
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

      return super.save(task).then(() => 1)
    } else {
      // 如果插件返回的的任务列表长度大于1，则创建一个任务集合，所有的任务作为其子任务
      const tempTask = new Task(parentTask)
      const parentId = (await super.save(tempTask)) as number
      parentTask.id = parentId
      parentTask.saved = true

      const childTasks = tasks
        .map((task) => {
          task.status = TaskStatesEnum.CREATED
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

      return super.saveBatch(childTasks)
    }
  }

  /**
   * 处理插件返回的任务流
   * @param pluginResponseTaskStream 插件返回的任务流
   * @param url 传给插件的url
   * @param taskPlugin 插件信息
   * @param parentTask 任务集
   * @param batchSize 每次保存任务的数量
   * @param maxQueueLength 任务队列最大长度
   */
  async handlePluginTaskStream(
    pluginResponseTaskStream: Readable,
    url: string,
    taskPlugin: InstalledPlugins,
    parentTask: TaskCreateDTO,
    batchSize: number,
    maxQueueLength: number
  ): Promise<number> {
    // 最终用于返回的Promise
    return new Promise<number>((resolve) => {
      // 查询插件信息，用于输出日志
      const pluginInfo = JSON.stringify(taskPlugin)
      // 任务计数
      let itemCount = 0
      // 集合任务存储过程
      let parentTaskProcess: Promise<number>
      // 任务队列
      const taskQueue: Task[] = []
      // 标记流是否已暂停
      let isPaused = false

      // 保存任务集的过程
      const parentTaskProcessing = () => {
        const tempTask = new Task(parentTask)
        const parentId = super.save(tempTask) as Promise<number>
        parentTask.saved = true
        return parentId
      }

      // 处理任务队列的函数
      const processTasks = async () => {
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
          super.saveBatch(taskBuffer).then()
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
        // 创建任务对象
        const task = chunk as Task
        task.pluginId = taskPlugin.id as number
        task.pluginInfo = pluginInfo
        task.status = TaskStatesEnum.CREATED
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
            await super.save(taskQueue[0])
          } else if (taskQueue.length > 0) {
            await processTasks()
          }
          resolve(itemCount)
        } catch (error) {
          LogUtil.error('TaskService', '处理任务流结束事件时出错，error:', error)
        } finally {
          LogUtil.info('TaskService', `任务流结束，创建了${itemCount}个任务`)
        }
      })
    })
  }

  /**
   * 开始任务
   * @param taskIds 任务id列表
   * @param mainWindow 主窗口实例
   */
  async startTask(taskIds: number[], mainWindow: Electron.BrowserWindow): Promise<boolean> {
    // 查找id列表对应的所有子任务
    const tasks: Task[] = await this.dao.selectUnRepeatChildTask(taskIds)

    // 插件缓存
    const pluginCache: { [id: string]: { plugin: TaskHandler; info: string } } = {}
    const pluginLoader = new PluginLoader(mainWindow)

    // 尝试开始任务
    try {
      // 限制最多同时保存100个
      const maxSaveWorksPromise = 3
      const promiseLimit = limit(maxSaveWorksPromise)

      // 并行保存过程
      const parallelProcess = async (task: Task) => {
        // 校验任务的插件id
        if (isNullish(task.pluginId)) {
          const msg = `任务的插件id意外为空，taskId: ${task.id}`
          LogUtil.warn('TaskService', msg)
          return
        }

        // 加载并缓存插件和插件信息
        let taskHandler: TaskHandler
        let pluginInfo: string

        if (isNullish(pluginCache[task.pluginId])) {
          // 查询插件信息，用于输出日志
          const installedPluginsService = new InstalledPluginsService()
          pluginInfo = JSON.stringify(
            await installedPluginsService.getById(task.pluginId as number)
          )

          taskHandler = await pluginLoader.loadTaskPlugin(task.pluginId as number)

          pluginCache[task.pluginId] = { plugin: taskHandler, info: pluginInfo }
        } else {
          taskHandler = pluginCache[task.pluginId].plugin
          pluginInfo = pluginCache[task.pluginId].info
        }

        const worksDTO = await taskHandler.start(task)
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
        const taskFilter = tasks.find((task) => task.id == worksDTO.includeTaskId)
        if (isNullish(taskFilter)) {
          // 如果插件返回的任务id越界，发出警告并跳过此次循环
          LogUtil.warn(
            'TaskService',
            `插件返回的任务id不可用，taskId: ${worksDTO.includeTaskId}，plugin: ${pluginInfo}`
          )
          return
        }

        // 用于异步执行作品和任务处理过程
        // 开启事务
        const db = new DB('TaskService')
        try {
          await db.nestedTransaction(async (transactionDB) => {
            // 保存资源和作品信息
            const taskService = new TaskService(transactionDB)
            try {
              const worksService = new WorksService(transactionDB)
              worksService.saveWorksAndResource(worksDTO).then(async (worksId) => {
                await taskService.finishTask(taskFilter, worksId)
                db.release()
              })
            } catch (error) {
              LogUtil.warn('TaskService', '保存作品失败，error: ', error)
              await taskService.taskFailed(taskFilter)
              db.release()
            }
          }, 'startTask')
        } finally {
          db.release()
        }
      }

      // 执行并行保存
      const activeProcesses: Promise<void>[] = []
      for (const task of tasks) {
        const activeProcess = promiseLimit(() => {
          parallelProcess(task)
        })
        activeProcesses.push(activeProcess)
      }
      await Promise.all(activeProcesses)

      return true
    } catch (error) {
      LogUtil.error('TaskService', '开始任务时出错，error: ', error)
      throw error
    }
  }

  /**
   * 根据id更新
   * @param updateData
   */
  async updateById(updateData: Task) {
    const temp = lodash.cloneDeep(updateData)
    if (typeof temp.pluginData === 'object') {
      temp.pluginData = JSON.stringify(temp.pluginData)
    }
    return await super.updateById(temp)
  }

  /**
   * 任务完成
   * @param task 任务信息
   * @param worksId 本地作品id
   */
  finishTask(task: Task, worksId: number) {
    task = new Task(task)
    task.status = TaskStatesEnum.FINISHED
    task.localWorksId = worksId
    if (notNullish(task.id)) {
      return this.updateById(task)
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
  taskFailed(task: Task) {
    task = new Task(task)
    task.status = TaskStatesEnum.FAILED
    if (notNullish(task.id)) {
      return this.dao.updateById(task.id, task)
    } else {
      const msg = '任务标记为失败时，任务id意外为空'
      LogUtil.error('TaskService', msg)
      throw new Error(msg)
    }
  }

  /**
   * 分页查询任务集合
   * @param page
   */
  async selectParentPage(page: PageModel<TaskQueryDTO, Task>) {
    if (notNullish(page.query)) {
      page.query.assignComparator = {
        ...{ taskName: COMPARATOR.LIKE },
        ...page.query.assignComparator
      }
    }
    const sourcePage = await this.dao.selectParentPage(page)
    const resultPage = sourcePage.transform<TaskDTO>()
    const tasks = sourcePage.data
    if (notNullish(tasks) && tasks.length > 0) {
      resultPage.data = tasks.map((task) => {
        const dto = new TaskDTO(task)
        dto.hasChildren = dto.isCollection
        return dto
      })
    }
    return resultPage
  }

  /**
   * 分页查询parent-children结构的任务
   * @param page
   */
  async selectTreeDataPage(page: PageModel<TaskQueryDTO, Task>) {
    if (notNullish(page.query)) {
      page.query.assignComparator = {
        ...{ taskName: COMPARATOR.LIKE },
        ...page.query.assignComparator
      }
    }
    const sourcePage = await super.selectPage(page)
    const resultPage = sourcePage.transform<TaskDTO>()

    // 组装为树形数据
    if (notNullish(sourcePage.data) && sourcePage.data.length > 0) {
      const tasks = sourcePage.data.map((task) => new TaskDTO(task))
      for (let index = 0; index < tasks.length; index++) {
        if (tasks[index].isCollection) {
          // 初始化children数组
          if (isNullish(tasks[index].children)) {
            tasks[index].children = []
          }

          // 查找数组前面这个任务集合的所有任务
          let lessIndex = 0
          while (lessIndex < index) {
            if (tasks[lessIndex].parentId === tasks[index].id) {
              const childTask = tasks.splice(lessIndex, 1)[0]
              index--
              tasks[index].children?.push(childTask)
              continue
            }
            lessIndex++
          }
          // 查找数组后面这个任务集合的所有任务
          let greaterIndex = index + 1
          while (greaterIndex < tasks.length) {
            if (tasks[greaterIndex].parentId === tasks[index].id) {
              const childTask = tasks.splice(greaterIndex, 1)[0]
              tasks[index].children?.push(childTask)
              continue
            }
            greaterIndex++
          }
        }
      }
      resultPage.data = tasks
    }

    return resultPage
  }

  /**
   * 获取parentId的子任务
   * @param parentId
   */
  getChildrenTask(parentId: number) {
    const query = new TaskQueryDTO()
    query.parentId = parentId
    return this.dao.selectList(query)
  }

  /**
   * 查询状态列表
   * @param ids
   */
  public async selectStatusList(ids: number[]) {
    return this.dao.selectStatusList(ids)
  }

  /**
   * 查询任务进度
   * @param ids id列表
   */
  public async selectScheduleList(ids: number[]): Promise<TaskScheduleDTO[]> {
    // 检查全局变量是否存在
    if (!Object.prototype.hasOwnProperty.call(global, 'taskTracker')) {
      return []
    }
    let result: TaskScheduleDTO[] = []
    // 没有监听器的任务
    const noListenerIds: number[] = []
    ids.forEach((id: number) => {
      const listenerName = String(id)
      // 如果有监听器，则从监听器获取任务进度，否则从数据库查询任务状态
      if (global.taskTracker.listenerCount(listenerName) > 0) {
        const temp: TaskScheduleDTO = new TaskScheduleDTO()
        temp.id = id
        global.taskTracker.emit(listenerName, (schedule: number) => {
          temp.schedule = schedule
          // 如果进度已经达到了100%，将状态设为完成，并且清除这个监听器
          if (schedule >= 100) {
            global.taskTracker.removeAllListeners(listenerName)
            temp.status = TaskStatesEnum.FINISHED
          } else {
            temp.status = TaskStatesEnum.PROCESSING
          }
          result.push(temp)
        })
      } else {
        noListenerIds.push(id)
      }
    })
    // 没有监听器的任务去数据库查询状态
    const noListener = await this.selectStatusList(noListenerIds)

    result = result.concat(noListener)
    return result
  }

  /**
   * 新增任务跟踪
   * @param emitName
   * @param bytesWrittenTracker
   * @param taskEndHandler
   */
  public addTaskTracker(
    emitName: string,
    bytesWrittenTracker: { writeStream: fs.WriteStream; bytesSum: number },
    taskEndHandler: Promise<unknown>
  ) {
    // 检查全局变量是否存在
    if (!Object.prototype.hasOwnProperty.call(global, 'taskTracker')) {
      global.taskTracker = new EventEmitter()
    }
    global.taskTracker.on(emitName, (callback: (schedule: number) => unknown) =>
      callback((bytesWrittenTracker.writeStream.bytesWritten / bytesWrittenTracker.bytesSum) * 100)
    )
    // 确认任务结束后，延迟2秒清除其监听器
    taskEndHandler.then(() =>
      setTimeout(() => global.taskTracker.removeAllListeners(emitName), 2000)
    )
  }
}
