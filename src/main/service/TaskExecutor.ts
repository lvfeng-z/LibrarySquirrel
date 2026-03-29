import Task from '@shared/model/entity/Task.ts'
import log from '../util/LogUtil.ts'
import { TaskStatusEnum } from '../constant/TaskStatusEnum.ts'
import ResourceWriter from '../util/ResourceWriter.js'
import { TaskHandler } from '../plugin/types/ContributionTypes.ts'
import WorkService from './WorkService.ts'
import ResourceService from './ResourceService.js'
import TaskProcessResponseDTO from '@shared/model/dto/TaskProcessResponseDTO.js'
import { PluginTaskResParam } from '../plugin/PluginTaskResParam.ts'
import PluginResourceDTO from '@shared/model/dto/PluginResourceDTO.ts'
import { FileSaveResult } from '../constant/FileSaveResult.js'
import { assertNotNullish } from '@shared/util/AssertUtil.ts'
import { isNullish, notNullish } from '@shared/util/CommonUtil.ts'
import { mergeObjects } from '@shared/util/ObjectUtil.ts'
import PluginWorkResponseDTO from '@shared/model/dto/PluginWorkResponseDTO.ts'
import { Database } from '../database/Database.ts'

/**
 * 任务执行结果（包含响应和资源写入器）
 */
export interface TaskExecutionResult {
  response: TaskProcessResponseDTO
  resourceWriter: ResourceWriter
}

/**
 * 任务执行器（用于子线程）
 *
 * 职责：封装任务执行的核心逻辑（开始、暂停、恢复、停止）
 * 这些方法在子线程中执行，不依赖主线程特有的模块（如 PluginManager）
 */
export class TaskExecutor {
  /**
   * 保存作品信息（用于子线程）
   * @param task 任务
   * @param taskHandler 任务处理器（由调用方注入）
   * @param update 是否更新已有作品信息
   * @returns 作品ID
   */
  public static async saveWorkInfo(task: Task, taskHandler: TaskHandler, update: boolean): Promise<number> {
    assertNotNullish(task.id, `保存作品信息失败，任务id不能为空`)
    const taskId = task.id

    // 调用插件的createWorkInfo方法，获取作品信息
    let pluginWorkResponseDTO: PluginWorkResponseDTO
    try {
      pluginWorkResponseDTO = await taskHandler.createWorkInfo(task)
    } catch (error) {
      log.error('TaskExecutor', `任务${taskId}调用插件获取作品信息时失败`, error)
      throw error
    }
    pluginWorkResponseDTO.work.siteId = task.siteId

    // 保存远程资源是否可接续
    task.continuable = isNullish(pluginWorkResponseDTO.resource?.continuable) ? false : pluginWorkResponseDTO.resource.continuable
    const updateContinuableTask = new Task()
    updateContinuableTask.id = taskId
    updateContinuableTask.continuable = task.continuable
    await Database.run('UPDATE task SET continuable = ? WHERE id = ?', [task.continuable, taskId])

    // 生成作品保存用的信息
    const workService = new WorkService()
    const workSaveDTO = await workService.createSaveInfoFromPlugin(pluginWorkResponseDTO, taskId, undefined)

    // 保存作品信息
    return workService.saveOrUpdateWorkInfos(workSaveDTO, update)
  }

  /**
   * 开始任务
   * @param task 任务
   * @param workId 作品ID
   * @param taskHandler 任务处理器（由调用方注入）
   * @param onProgress 进度回调
   * @returns 任务执行结果
   */
  public static async startTask(
    task: Task,
    workId: number,
    taskHandler: TaskHandler,
    onProgress?: (bytesWritten: number) => void
  ): Promise<TaskExecutionResult> {
    assertNotNullish(task.id, `开始任务失败，任务id不能为空`)
    const taskId = task.id

    const workService = new WorkService()

    // 调用插件的start方法，获取资源
    let pluginResponse: import('@shared/model/dto/PluginWorkResponseDTO.js').default
    try {
      pluginResponse = await taskHandler.start(task)
    } catch (error) {
      log.error('TaskExecutor', `任务${taskId}调用插件开始时失败`, error)
      return {
        response: new TaskProcessResponseDTO(TaskStatusEnum.FAILED, error as Error),
        resourceWriter: null as unknown as ResourceWriter
      }
    }
    assertNotNullish(pluginResponse.resource?.resourceStream, `插件没有返回任务${taskId}的资源`)

    const workInfo = await workService.getFullWorkInfoById(workId)
    assertNotNullish(workInfo, `开始任务失败，任务的作品id不可用，taskId: ${taskId}`)
    // 创建资源保存DTO
    const resourceSaveDTO = ResourceService.createSaveInfoFromPlugin(workInfo, pluginResponse, taskId)
    // 查询作品已经存在的可用资源
    const resService = new ResourceService()
    const activeRes = await resService.getActiveByWorkId(workId)
    if (isNullish(activeRes)) {
      resourceSaveDTO.id = await resService.saveActive(resourceSaveDTO)
    } else {
      resourceSaveDTO.id = activeRes.id
    }
    // 更新下载中的资源id
    task.pendingResourceId = resourceSaveDTO.id

    // 创建 resourceWriter（流必须在同一线程中消费）
    const resourceWriter = new ResourceWriter()
    // 设置进度回调
    if (onProgress) {
      resourceWriter.onProgress = onProgress
    }

    // 标记为进行中
    task.status = TaskStatusEnum.PROCESSING

    log.info('TaskExecutor', `任务${taskId}开始下载`)
    const resSavePromise: Promise<FileSaveResult> = isNullish(activeRes)
      ? resService.saveResource(resourceSaveDTO, resourceWriter)
      : resService.replaceResource(resourceSaveDTO, resourceWriter)
    const response = await resSavePromise.then(async (saveResult) => {
      if (FileSaveResult.FINISH === saveResult) {
        return new TaskProcessResponseDTO(TaskStatusEnum.FINISHED)
      } else if (FileSaveResult.PAUSE === saveResult) {
        return new TaskProcessResponseDTO(TaskStatusEnum.PAUSE)
      } else {
        throw new Error(`保存资源未返回预期中的值，saveResult: ${saveResult}`)
      }
    })
    return { response, resourceWriter }
  }

  /**
   * 暂停任务
   * @param task 任务
   * @param taskHandler 任务处理器（由调用方注入）
   * @param resourceWriter 资源写入器
   * @returns 是否暂停成功
   */
  public static async pauseTask(task: Task, taskHandler: TaskHandler, resourceWriter: ResourceWriter): Promise<boolean> {
    assertNotNullish(resourceWriter, `暂停任务失败，资源写入器不能为空，taskId: ${task.id}`)

    // 创建TaskPluginDTO对象
    const taskPluginDTO = new PluginTaskResParam(task)
    taskPluginDTO.resourcePluginDTO = new PluginResourceDTO()
    taskPluginDTO.resourcePluginDTO.resourceSize = resourceWriter.resourceSize
    taskPluginDTO.resourcePluginDTO.resourceStream = resourceWriter.readable
    taskPluginDTO.resourcePluginDTO.filenameExtension = resourceWriter.resource?.filenameExtension

    // 暂停写入
    const finished = resourceWriter.pause()

    if (!finished) {
      // 调用插件的pause方法
      try {
        await taskHandler.pause(taskPluginDTO)
      } catch (error) {
        log.error('TaskExecutor', '调用插件的pause方法出错: ', error)
        if (notNullish(resourceWriter.readable)) {
          resourceWriter.readable.pause()
        }
      }
      return true
    } else {
      return false
    }
  }

  /**
   * 停止任务
   * @param task 任务
   * @param taskHandler 任务处理器（由调用方注入）
   * @param resourceWriter 资源写入器
   * @returns 是否停止成功
   */
  public static async stopTask(task: Task, taskHandler: TaskHandler, resourceWriter: ResourceWriter): Promise<boolean> {
    assertNotNullish(resourceWriter, `停止任务失败，资源写入器不能为空，taskId: ${task.id}`)

    // 创建TaskPluginDTO对象
    const taskPluginDTO = new PluginTaskResParam(task)
    taskPluginDTO.resourcePluginDTO = new PluginResourceDTO()
    taskPluginDTO.resourcePluginDTO.resourceSize = resourceWriter.resourceSize
    taskPluginDTO.resourcePluginDTO.resourceStream = resourceWriter.readable
    taskPluginDTO.resourcePluginDTO.filenameExtension = resourceWriter.resource?.filenameExtension

    // 暂停写入
    const finished = resourceWriter.pause()

    if (!finished) {
      // 调用插件的stop方法
      try {
        await taskHandler.stop(taskPluginDTO)
      } catch (error) {
        log.error('TaskExecutor', '调用插件的stop方法出错: ', error)
        if (notNullish(resourceWriter.readable)) {
          resourceWriter.readable.destroy()
        }
      }
      return true
    } else {
      return false
    }
  }

  /**
   * 恢复任务
   * @param task 任务
   * @param workId 作品ID
   * @param taskHandler 任务处理器（由调用方注入）
   * @param onProgress 进度回调
   * @returns 任务执行结果
   */
  public static async resumeTask(
    task: Task,
    workId: number,
    taskHandler: TaskHandler,
    onProgress?: (bytesWritten: number) => void
  ): Promise<TaskExecutionResult> {
    assertNotNullish(task.id, '恢复任务失败，任务id不能为空')
    const taskId = task.id
    assertNotNullish(task.pendingResourceId, `恢复任务失败，任务的处理中的资源id不能为空，taskId: ${taskId}`)

    // 插件用于恢复下载的任务信息
    const taskPluginDTO = new PluginTaskResParam(task)
    const resourceService = new ResourceService()
    taskPluginDTO.resourcePath = await resourceService.getFullResourcePath(task.pendingResourceId)

    // 恢复下载
    const workService = new WorkService()

    // 标记为进行中
    task.status = TaskStatusEnum.PROCESSING
    // 调用插件的resume函数，获取资源
    let pluginResponse: import('@shared/model/dto/PluginWorkResponseDTO.js').default = await taskHandler.resume(taskPluginDTO)
    const resourcePluginDTO = pluginResponse.resource
    assertNotNullish(resourcePluginDTO, `恢复任务失败，插件返回的资源为空，taskId: ${taskId}`)
    assertNotNullish(resourcePluginDTO.resourceStream, `恢复任务失败，插件返回的资源为空，taskId: ${taskId}`)

    const oldWork = await workService.getFullWorkInfoById(workId)
    assertNotNullish(oldWork, `恢复任务失败，任务的作品id不可用，taskId: ${taskId}`)
    // 用旧的作品信息补全插件返回的信息
    pluginResponse = mergeObjects(pluginResponse, oldWork, (src) => new PluginWorkResponseDTO(src))
    // 创建资源保存DTO
    const resourceSaveDTO = ResourceService.createSaveInfoFromPlugin(oldWork, pluginResponse, taskId)
    resourceSaveDTO.id = task.pendingResourceId

    // 创建新的 resourceWriter（恢复任务可能在不同的 Worker 线程中执行）
    const resourceWriter = new ResourceWriter()
    // 设置进度回调
    if (onProgress) {
      resourceWriter.onProgress = onProgress
    }

    log.info('TaskExecutor', `任务${taskId}恢复下载`)
    const response = await resourceService.resumeSaveResource(resourceSaveDTO, resourceWriter).then(async (saveResult) => {
      if (FileSaveResult.FINISH === saveResult) {
        return new TaskProcessResponseDTO(TaskStatusEnum.FINISHED)
      } else if (FileSaveResult.PAUSE === saveResult) {
        return new TaskProcessResponseDTO(TaskStatusEnum.PAUSE)
      } else {
        throw new Error(`恢复任务未返回预期的值，saveResult: ${saveResult}`)
      }
    })
    return { response, resourceWriter }
  }
}
