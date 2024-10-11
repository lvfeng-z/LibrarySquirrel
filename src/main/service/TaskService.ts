import Task from '../model/Task.ts'
import LogUtil from '../util/LogUtil.ts'
import TaskDao from '../dao/TaskDao.ts'
import PluginLoader from '../plugin/PluginLoader.ts'
import { TaskStatesEnum } from '../constant/TaskStatesEnum.ts'
import TaskQueryDTO from '../model/queryDTO/TaskQueryDTO.ts'
import InstalledPluginsService from './InstalledPluginsService.ts'
import TaskPluginListenerService from './TaskPluginListenerService.ts'
import WorksService from './WorksService.ts'
import InstalledPlugins from '../model/InstalledPlugins.ts'
import { Readable } from 'node:stream'
import Electron from 'electron'
import BaseService from './BaseService.ts'
import DB from '../database/DB.ts'
import lodash from 'lodash'
import { isNullish, notNullish } from '../util/CommonUtil.ts'
import PageModel from '../model/utilModels/PageModel.ts'
import { COMPARATOR } from '../constant/CrudConstant.ts'
import TaskDTO from '../model/dto/TaskDTO.ts'
import { TaskHandler, TaskHandlerFactory } from '../plugin/TaskHandler.ts'
import TaskCreateDTO from '../model/dto/TaskCreateDTO.ts'
import TaskScheduleDTO from '../model/dto/TaskScheduleDTO.ts'
import { TaskProcessController, TaskTracker } from '../model/utilModels/TaskTracker.ts'
import { TaskPluginDTO } from '../model/dto/TaskPluginDTO.ts'
import fs from 'fs'
import StringUtil from '../util/StringUtil.ts'
import WorksPluginDTO from '../model/dto/WorksPluginDTO.ts'
import PluginResumeResponse from '../model/utilModels/PluginResumeResponse.ts'
import { GlobalVarManager, GlobalVars } from '../GlobalVar.ts'
import path from 'path'
import TaskCreateResponse from '../model/utilModels/TaskCreateResponse.ts'

export default class TaskService extends BaseService<TaskQueryDTO, Task, TaskDao> {
  constructor(db?: DB) {
    super('TaskService', new TaskDao(db), db)
  }

  /**
   * 根据传入的url创建任务
   * @param url 作品/作品集所在url
   * @param mainWindow
   */
  async createTask(url: string, mainWindow: Electron.BrowserWindow): Promise<TaskCreateResponse> {
    // 查询监听此url的插件
    const taskPluginListenerService = new TaskPluginListenerService()
    const taskPlugins = await taskPluginListenerService.getListener(url)

    if (taskPlugins.length === 0) {
      const msg = `没有监听此链接的插件，url: ${url}`
      LogUtil.info('TaskService', msg)
      return new TaskCreateResponse({
        succeed: false,
        addedQuantity: 0,
        msg: msg,
        plugin: undefined
      })
    }

    // 插件加载器
    const pluginLoader = new PluginLoader(new TaskHandlerFactory(), mainWindow)

    // 按照排序尝试每个插件
    for (const taskPlugin of taskPlugins) {
      // 查询插件信息，用于输出日志
      const installedPluginsService = new InstalledPluginsService()
      const pluginInfo = JSON.stringify(
        await installedPluginsService.getById(taskPlugin.id as number)
      )

      try {
        // 加载插件
        if (isNullish(taskPlugin.id)) {
          const msg = `任务的插件id意外为空，taskId: ${taskPlugin.id}`
          LogUtil.error('TaskService', msg)
          continue
        }
        const taskHandler = await pluginLoader.load(taskPlugin.id)

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
        if (pluginResponse instanceof Readable) {
          const addedQuantity = await this.handlePluginTaskStream(
            pluginResponse,
            url,
            taskPlugin,
            parentTask,
            100,
            200
          )
          return new TaskCreateResponse({
            succeed: true,
            addedQuantity: addedQuantity,
            msg: '创建成功',
            plugin: taskPlugin
          })
        } else if (Array.isArray(pluginResponse)) {
          const addedQuantity = await this.handlePluginTaskArray(
            pluginResponse,
            url,
            taskPlugin,
            parentTask
          )
          return new TaskCreateResponse({
            succeed: true,
            addedQuantity: addedQuantity,
            msg: '创建成功',
            plugin: taskPlugin
          })
        } else {
          LogUtil.error('TaskService', '插件返回了不支持的类型')
        }
      } catch (error) {
        LogUtil.error(
          'TaskService',
          `插件创建任务时出现异常，url: ${url}，plugin: ${pluginInfo}，error:`,
          error
        )
      }
    }

    // 未能在循环中返回，则返回0
    const msg = `尝试了所有插件均未成功，url: ${url}`
    LogUtil.info('TaskService', msg)
    return new TaskCreateResponse({ succeed: false, addedQuantity: 0, msg: msg, plugin: undefined })
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
      LogUtil.warn('TaskService', `插件未创建任务，url: ${url}，plugin: ${pluginInfo}`)
      return 0
    }

    // 清除所有插件不应处理的属性值
    const tasks = pluginResponseTasks.map((task) => {
      const temp = new Task(task)
      temp.security()
      return temp
    })

    // 给任务赋值的函数
    const assignTask = (task: Task, pid?: number) => {
      task.status = TaskStatesEnum.CREATED
      task.isCollection = false
      task.pid = pid
      task.pluginId = taskPlugin.id as number
      task.pluginInfo = pluginInfo
      task.siteDomain = taskPlugin.domain
      try {
        task.pluginData = JSON.stringify(task.pluginData)
      } catch (error) {
        LogUtil.error(
          'TaskService',
          `序列化插件保存的pluginData时出错，url: ${url}，plugin: ${pluginInfo}，pluginData: ${task.pluginData}，error:`,
          error
        )
        return undefined
      }
    }

    // 根据插件返回的任务数组长度判断如何处理
    if (tasks.length === 1) {
      // 如果插件返回的的任务列表长度为1，则不需要创建子任务
      const task = tasks[0]
      assignTask(task)
      return super.save(task).then(() => 1)
    } else {
      // 如果插件返回的的任务列表长度大于1，则创建一个任务集合，所有的任务作为其子任务
      const tempTask = new Task(parentTask)
      const pid = (await super.save(tempTask)) as number
      parentTask.id = pid
      parentTask.saved = true

      const childTasks = tasks
        .map((task) => {
          assignTask(task, pid)
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
      // error事件处理函数
      pluginResponseTaskStream.on('error', (error) => {
        LogUtil.error('TaskService', '插件报错: ', error)
      })

      // data事件处理函数
      pluginResponseTaskStream.on('data', async (chunk) => {
        itemCount++
        // 如果任务集合尚未保存且任务数大于1，则先保存任务集合
        if (parentTaskProcess === undefined && itemCount > 1) {
          parentTaskProcess = parentTaskProcessing()
          parentTask.id = await parentTaskProcess
          // 更新pid
          taskQueue.forEach((task) => (task.pid = parentTask.id as number))
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
        task.pid = parentTask.id as number

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
            LogUtil.warn('TaskService', `插件未创建任务，url: ${url}，plugin: ${pluginInfo}`)
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
        const pid = super.save(tempTask) as Promise<number>
        parentTask.saved = true
        return pid
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
    })
  }

  /**
   * 处理任务
   * @param taskIds 任务id列表
   * @param includeStatus 要处理的任务状态
   * @param mainWindow 主窗口实例
   */
  async processTask(
    taskIds: number[],
    includeStatus: TaskStatesEnum[],
    mainWindow: Electron.BrowserWindow
  ): Promise<number> {
    // 所有任务设置为等待中
    await this.dao.setTaskTreeStatus(taskIds, TaskStatesEnum.WAITING, includeStatus)
    // 查找id列表对应的所有子任务
    const taskTree: TaskDTO[] = await this.dao.selectTaskTreeList(taskIds, [TaskStatesEnum.WAITING])

    // 插件加载器
    const pluginLoader = new PluginLoader(new TaskHandlerFactory(), mainWindow)

    // 计数器
    let counter = 0

    // 获取下载限制器
    const limit = GlobalVarManager.get(GlobalVars.DOWNLOAD_LIMIT)

    // 处理任务集合的状态的函数
    const handleRootStatus = (rootId: number) => {
      const root = taskTree.find((task) => task.id === rootId)
      if (isNullish(root)) {
        return
      }

      if (notNullish(root.children) && root.children.length > 0) {
        const processing = root.children.some((child) => TaskStatesEnum.PROCESSING === child.status)
        if (processing) {
          return
        } else {
          const finished = root.children.filter(
            (child) => TaskStatesEnum.FINISHED === child.status
          ).length
          const failed = root.children.filter(
            (child) => TaskStatesEnum.FAILED === child.status
          ).length
          if (finished > 0 && failed > 0) {
            root.status = TaskStatesEnum.PARTLY_FINISHED
          } else if (finished > 0) {
            root.status = TaskStatesEnum.FINISHED
          } else {
            root.status = TaskStatesEnum.FAILED
          }
        }
      } else {
        root.status = TaskStatesEnum.FINISHED
      }
      if (TaskStatesEnum.PROCESSING !== root.status) {
        this.dao.refreshTaskStatus(root.id as number)
      }
    }

    // 保存作品资源和作品信息的函数
    const savingProcess = async (
      task: Task
    ): Promise<{ status: TaskStatesEnum; worksId: number }> => {
      if (isNullish(task.id)) {
        const msg = `任务的任务id意外为空`
        LogUtil.error('TaskService', msg)
        return { status: TaskStatesEnum.FAILED, worksId: -1 }
      }
      // 加载插件
      if (isNullish(task.pluginId)) {
        const msg = `任务的插件id意外为空，taskId: ${task.id}`
        LogUtil.error('TaskService', msg)
        return { status: TaskStatesEnum.FAILED, worksId: -1 }
      }
      const taskHandler: TaskHandler = await pluginLoader.load(task.pluginId)

      const worksDTO: WorksPluginDTO = await taskHandler.start(task)
      worksDTO.includeTaskId = task.id
      // 校验插件有没有返回任务资源
      if (worksDTO.resourceStream === undefined || worksDTO.resourceStream === null) {
        const msg = `保存作品时，资源意外为空，taskId: ${worksDTO.includeTaskId}`
        LogUtil.error('WorksService', msg)
        throw new Error(msg)
      }

      // 保存远程资源是否可接续
      task.continuable = worksDTO.continuable
      const updateContinuableTask = new Task()
      updateContinuableTask.id = task.id
      updateContinuableTask.continuable = worksDTO.continuable
      await this.updateById(updateContinuableTask)

      // 生成作品保存用的信息
      const worksService = new WorksService()
      const worksSaveInfo = worksService.generateWorksSaveInfo(worksDTO)

      // 保存作品信息
      const worksId = await worksService.saveWorksInfo(worksSaveInfo)
      // 文件的写入路径和作品id保存到任务中
      const sourceTask = new Task()
      sourceTask.id = worksSaveInfo.includeTaskId
      sourceTask.localWorksId = worksId
      sourceTask.pendingDownloadPath = path.join(
        worksSaveInfo.fullSaveDir as string,
        worksSaveInfo.fileName as string
      )
      const updatePendingDownloadPathService = new TaskService()
      await updatePendingDownloadPathService.updateById(sourceTask)
      // 创建任务追踪器
      const taskProcessController = new TaskProcessController()
      const taskTracker: TaskTracker = {
        status: TaskStatesEnum.PROCESSING,
        readStream: worksDTO.resourceStream,
        writeStream: undefined,
        bytesSum: isNullish(worksDTO.resourceSize) ? 0 : worksDTO.resourceSize,
        taskProcessController: taskProcessController
      }
      // 保存资源
      const savePromise = limit(() => worksService.saveWorksResource(worksSaveInfo, taskTracker))
      // 添加任务追踪器
      if (isNullish(worksDTO.includeTaskId)) {
        const msg = '创建任务追踪器时，任务id意外为空'
        LogUtil.warn('WorksService', msg)
      } else {
        const taskService = new TaskService()
        taskService.addTaskTracker(worksDTO.includeTaskId, taskTracker, savePromise)
      }

      const saveResult = await savePromise

      if (TaskStatesEnum.FINISHED === saveResult) {
        counter++
        worksService.resourceFinished(worksId)
      }
      return { status: saveResult, worksId: worksId }
    }

    // 任务等待列表
    const activeProcesses: Promise<boolean>[] = []

    for (const parent of taskTree) {
      const isCollection = notNullish(parent.children) && parent.children.length > 0
      const tasks = isCollection ? (parent.children as TaskDTO[]) : [parent]
      parent.status = TaskStatesEnum.PROCESSING
      const tempParent = new Task(parent)
      await this.dao.updateById(parent.id as number, tempParent)

      // 尝试开始任务
      for (const task of tasks) {
        task.status = TaskStatesEnum.PROCESSING
        const activeProcess = savingProcess(task)
          .then(async (processResult) => {
            // 修改任务状态和作品资源状态(只有完成状态进行修改，暂停状态在暂停函数中处理)
            if (processResult.status === TaskStatesEnum.FINISHED) {
              task.status = TaskStatesEnum.FINISHED
              await this.finishTask(task, processResult.worksId)
            }
            return true
          })
          .catch(async (error) => {
            LogUtil.error('TaskService', `保存任务时出错，taskId: ${task.id}，error: `, error)
            task.status = TaskStatesEnum.FAILED
            await this.taskFailed(task)
            return false
          })
          .finally(() => handleRootStatus(task.pid as number))
        activeProcesses.push(activeProcess)
      }
    }

    await Promise.allSettled(activeProcesses)

    return counter
  }

  /**
   * 开始任务
   * @param taskIds 任务id列表
   * @param mainWindow 主窗口实例
   */
  async startTask(taskIds: number[], mainWindow: Electron.BrowserWindow) {
    return this.processTask(
      taskIds,
      [
        TaskStatesEnum.CREATED,
        TaskStatesEnum.FAILED,
        TaskStatesEnum.PARTLY_FINISHED,
        TaskStatesEnum.PAUSE
      ],
      mainWindow
    )
  }

  /**
   * 重试任务
   * @param taskIds 任务id列表
   * @param mainWindow 主窗口实例
   */
  async retryTask(taskIds: number[], mainWindow: Electron.BrowserWindow) {
    return this.processTask(
      taskIds,
      [
        TaskStatesEnum.CREATED,
        TaskStatesEnum.FINISHED,
        TaskStatesEnum.FAILED,
        TaskStatesEnum.PARTLY_FINISHED,
        TaskStatesEnum.PAUSE
      ],
      mainWindow
    )
  }

  /**
   * 暂停任务
   * @param ids id列表
   * @param mainWindow
   */
  public async pauseTaskTree(ids: number[], mainWindow: Electron.BrowserWindow): Promise<void> {
    const taskTree = await this.dao.selectTaskTreeList(ids)

    // 插件加载器
    const pluginLoader = new PluginLoader(new TaskHandlerFactory(), mainWindow)

    // 暂停任务的函数
    const pauseSingleTask = async (child: Task): Promise<boolean> => {
      if (isNullish(child.id)) {
        LogUtil.error('TaskService', '暂停任务时，任务的id意外为空，taskId: ', child.id)
        return false
      }
      // 加载插件
      if (isNullish(child.pluginId)) {
        LogUtil.error('TaskService', '暂停任务时，任务的pluginId意外为空，taskId: ', child.id)
        return false
      }
      const taskHandler = await pluginLoader.load(child.pluginId)

      // 创建TaskPluginDTO对象
      const taskPluginDTO = new TaskPluginDTO(child)
      const taskTracker = this.getTaskTracker(taskPluginDTO.id as number)
      if (isNullish(taskTracker)) {
        LogUtil.info('TaskService', '暂停任务时，任务追踪器不存在，taskId: ', child.id)
        return false
      }
      if (isNullish(taskTracker.readStream)) {
        LogUtil.error('TaskService', '暂停任务时，任务追踪器的读取流不存在，taskId: ', child.id)
        return false
      }
      taskPluginDTO.remoteStream = taskTracker.readStream

      // 调用插件的pause方法
      taskHandler.pause(taskPluginDTO)
      // 等待写入流处理完所有缓冲区中的数据，断开连接
      taskTracker.writeStream?.once('drain', () => {
        taskTracker.readStream.unpipe(taskTracker.writeStream)
      })
      // 调用任务控制器的pause方法
      taskTracker.taskProcessController.pause()
      // 更新任务追踪器的状态
      this.updateTaskTracker(child.id, { status: TaskStatesEnum.PAUSE })
      // 更新数据库中任务的状态
      return this.pauseTask(child).then((runResult) => runResult > 0)
    }

    // 任务等待列表
    const activeProcesses: Promise<boolean>[] = []

    for (const parent of taskTree) {
      // 处理parent为单个任务的情况
      if (!parent.isCollection) {
        const tempProcess = pauseSingleTask(parent)
        activeProcesses.push(tempProcess)
        continue
      }

      // 处理下级任务
      const children = parent.children
      if (isNullish(children) || children.length < 1) {
        continue
      }

      for (const child of children) {
        const tempProcess = pauseSingleTask(child)
        activeProcesses.push(tempProcess)
      }
    }

    await Promise.allSettled(activeProcesses)
  }

  /**
   *
   * @param child
   * @param pluginLoader
   */
  async resumeTask(child: Task, pluginLoader: PluginLoader<TaskHandler>): Promise<void> {
    // 加载插件
    if (isNullish(child.pluginId)) {
      LogUtil.error('TaskService', '恢复任务时，任务的pluginId意外为空，taskId: ', child.id)
      return
    }
    const taskHandler: TaskHandler = await pluginLoader.load(child.pluginId)

    // 创建TaskPluginDTO对象
    const taskPluginDTO = new TaskPluginDTO(child)
    // todo 如果追踪器已经不存在，则创建一个新的追踪器，读取流由插件从远程获取，否则插件尝试恢复读取流，如果恢复不成功，再重新从远程获取
    // const taskTracker = this.getTaskTracker(taskPluginDTO.id as number)
    // if (isNullish(taskTracker)) {
    //   // 创建一个追踪器
    //   taskTracker = {
    //     bytesSum: 1,
    //     readStream: new Readable(),
    //     writeStream: new Writable()
    //   }
    // }
    // if (isNullish(taskTracker.readStream)) {
    //   LogUtil.info('TaskService', '恢复任务时，任务追踪器的读取流不存在，taskId: ', child.id)
    //   return
    // }
    // taskPluginDTO.remoteStream = taskTracker.readStream

    // 调用插件的pause方法
    const response: PluginResumeResponse = await taskHandler.resume(taskPluginDTO)

    // 根据未完成的文件创建接续写入流
    if (StringUtil.isBlank(child.pendingDownloadPath)) {
      LogUtil.error('TaskService', '恢复任务时，下载中的文件路径意外为空，taskId: ', child.id)
      return
    }

    if (isNullish(response.remoteStream)) {
      LogUtil.error('TaskService', '恢复任务时，插件未返回读取流，taskId: ', child.id)
      return
    }

    // 判断返回的流是否可接续在已下载部分末尾
  }

  /**
   * 恢复任务
   * @param ids id列表
   * @param mainWindow
   */
  public async resumeTaskTree(ids: number[], mainWindow: Electron.BrowserWindow): Promise<void> {
    const taskTree = await this.dao.selectTaskTreeList(ids)

    // 插件加载器
    const pluginLoader = new PluginLoader(new TaskHandlerFactory(), mainWindow)

    // 获取下载限制器
    const limit = GlobalVarManager.get(GlobalVars.DOWNLOAD_LIMIT)

    for (const parent of taskTree) {
      // 处理parent为单个任务的情况
      if (!parent.isCollection) {
        limit(() => this.resumeTask(parent, pluginLoader))
        continue
      }

      // 处理下级任务
      const children = parent.children
      if (isNullish(children) || children.length < 1) {
        continue
      }

      for (const child of children) {
        limit(() => this.resumeTask(child, pluginLoader))
      }
    }
  }

  /**
   * 删除任务
   * @param taskIds 任务id列表
   */
  async deleteTask(taskIds: number[]): Promise<number> {
    const waitingDelete: number[] = []
    const taskTree = await this.dao.selectTaskTreeList(taskIds)
    for (const task of taskTree) {
      if (task.status === TaskStatesEnum.WAITING) {
        throw new Error('不能删除等待开始的任务')
      } else if (task.isCollection && notNullish(task.children)) {
        const hasWaiting = task.children.some((child) => child.status === TaskStatesEnum.WAITING)
        if (hasWaiting) {
          throw new Error('不能删除等待开始的任务')
        }
        waitingDelete.push(task.id as number)
        const childrenIds = task.children.map((child) => child.id as number)
        waitingDelete.push(...childrenIds)
      } else {
        waitingDelete.push(task.id as number)
      }
    }
    return this.deleteBatchById(waitingDelete)
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
   * 暂停任务
   * @param task 任务信息
   */
  pauseTask(task: Task) {
    const tempTask = new Task()
    tempTask.id = task.id
    tempTask.status = TaskStatesEnum.PAUSE
    if (notNullish(tempTask.id)) {
      return this.updateById(tempTask)
    } else {
      const msg = '任务标记为暂停时，任务id意外为空'
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
        ...{ taskName: COMPARATOR.LIKE, siteDomain: COMPARATOR.LIKE },
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
            if (tasks[lessIndex].pid === tasks[index].id) {
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
            if (tasks[greaterIndex].pid === tasks[index].id) {
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
   * 获取任务集合的子任务
   * @param pid
   */
  getChildrenTask(pid: number) {
    const query = new TaskQueryDTO()
    query.pid = pid
    return this.dao.selectList(query)
  }

  /**
   * 分页查询任务集合的子任务
   * @param page
   */
  async selectChildrenTaskPage(page: PageModel<TaskQueryDTO, Task>) {
    if (notNullish(page.query)) {
      page.query.assignComparator = {
        ...{ taskName: COMPARATOR.LIKE, siteDomain: COMPARATOR.LIKE },
        ...page.query.assignComparator
      }
      page.query.isCollection = false
    }
    return await super.selectPage(page)
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
    let result: TaskScheduleDTO[] = []
    // 没有监听器的任务
    const noListenerIds: number[] = []
    ids.forEach((id: number) => {
      // 如果有追踪器，则从追踪器获取任务进度，否则从数据库查询任务状态
      const taskTracker = this.getTaskTracker(id)
      if (notNullish(taskTracker)) {
        const temp: TaskScheduleDTO = new TaskScheduleDTO()
        temp.id = id
        temp.status = taskTracker.status
        if (
          taskTracker.status !== TaskStatesEnum.FINISHED &&
          taskTracker.status !== TaskStatesEnum.FAILED
        ) {
          if (taskTracker.bytesSum === 0) {
            temp.schedule = 0
          } else {
            if (notNullish(taskTracker.writeStream)) {
              temp.schedule = (taskTracker.writeStream.bytesWritten / taskTracker.bytesSum) * 100
            } else {
              const msg = `查询任务进度时，写入流意外为空，taskId: ${id}`
              LogUtil.error('WorksService', msg)
              temp.schedule = 0
            }
          }
        }
        result.push(temp)
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
   * @param taskId 任务id，会在全局变量taskTracker中创建以此为名的属性
   * @param taskTracker 任务追踪器，包含任务的读取和写入流，以及资源大小
   * @param taskEndHandler 任务完成的承诺，得到解决后会清除对应的追踪事件
   */
  public addTaskTracker(
    taskId: number,
    taskTracker: TaskTracker,
    taskEndHandler: Promise<TaskStatesEnum>
  ) {
    const trackerName = String(taskId)
    GlobalVarManager.get(GlobalVars.TASK_TRACKER)[trackerName] = taskTracker
    // 确认任务结束或失败后，延迟2秒清除其追踪器
    taskEndHandler
      .then((taskStatus) => {
        taskTracker.status = taskStatus
        if (taskStatus === TaskStatesEnum.FINISHED) {
          setTimeout(() => delete GlobalVarManager.get(GlobalVars.TASK_TRACKER)[trackerName], 2000)
        }
      })
      .catch(() => {
        taskTracker.status = TaskStatesEnum.FAILED
        setTimeout(() => delete GlobalVarManager.get(GlobalVars.TASK_TRACKER)[trackerName], 2000)
      })
  }

  /**
   * 获取任务跟踪器
   * @param taskId 任务id
   * @param newTaskTracker 新的任务跟踪器属性
   */
  public updateTaskTracker(
    taskId: number,
    newTaskTracker: {
      status?: number
      readStream?: Readable
      writeStream?: fs.WriteStream
      bytesSum?: number
    }
  ) {
    const old = this.getTaskTracker(taskId)
    if (isNullish(old)) {
      LogUtil.warn('TaskService', `没有找到需要更新的任务跟踪器，taskId: ${taskId}`)
      return
    }
    if (newTaskTracker.status !== undefined) {
      old.status = newTaskTracker.status
    }
    if (newTaskTracker.bytesSum !== undefined) {
      old.bytesSum = newTaskTracker.bytesSum
    }
    if (newTaskTracker.readStream !== undefined) {
      old.readStream = newTaskTracker.readStream
    }
    if (newTaskTracker.writeStream !== undefined) {
      old.writeStream = newTaskTracker.writeStream
    }
  }

  /**
   * 获取任务跟踪器
   * @param taskId
   */
  public getTaskTracker(taskId: number): TaskTracker | undefined {
    const listenerName = String(taskId)
    return GlobalVarManager.get(GlobalVars.TASK_TRACKER)[listenerName]
  }
}
