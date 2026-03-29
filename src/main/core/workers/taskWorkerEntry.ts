import { parentPort, workerData } from 'worker_threads'
import Task from '@shared/model/entity/Task.ts'
import { TaskStatusEnum } from '../../constant/TaskStatusEnum.ts'
import { fileURLToPath } from 'url'
import ResourceWriter from '../../util/ResourceWriter.js'
import { TaskHandler } from '../../plugin/types/ContributionTypes.ts'
import { isNullish } from '@shared/util/CommonUtil.ts'
import { pathToFileURL } from 'node:url'
import PluginManager from '../../plugin/PluginManager.ts'
import { createPluginContext } from '../../plugin/types/PluginContext.ts'

// 导出模块路径（用于 electron-vite ?modulePath 导入）
export default fileURLToPath(import.meta.url)

// 动态导入的 TaskExecutor 模块缓存
let TaskExecutorModule: typeof import('../../service/TaskExecutor.ts') | null = null

/**
 * 工作线程初始化数据
 */
interface TaskWorkerInitData {
  workerId: number
  threadType: string
}

/**
 * 工作线程任务消息（主线程 → Worker 线程）
 */
interface WorkerTaskMessage {
  type: 'start' | 'pause' | 'resume' | 'stop'
  taskId?: number
  taskData?: TaskDataForWorker
}

/**
 * 传递给 Worker 线程的任务数据
 */
interface TaskDataForWorker {
  /** 任务信息 */
  task: Task
  /** 插件公开 ID */
  pluginPublicId: string
  /** 贡献点文件路径 */
  contributionPath: string
  /** 工作目录（用于拼接 resourcePath） */
  workdir: string
  /** 作品 ID（在子线程中获取） */
  workId?: number
}

/**
 * Worker 线程进度消息（Worker 线程 → 主线程）
 */
interface WorkerProgressMessage {
  type: 'ready' | 'progress' | 'statusChange' | 'complete' | 'error' | 'paused'
  workerId?: number
  taskId?: number
  status?: number
  progress?: unknown
  error?: string
}

/**
 * 贡献点缓存 key
 */
type ContributionCacheKey = string

/**
 * 贡献点缓存
 */
const contributionCache: Map<ContributionCacheKey, TaskHandler> = new Map()

// 初始化数据
const initData = workerData as TaskWorkerInitData
const workerId = initData.workerId

/**
 * 当前任务的数据（用于暂停/恢复/停止操作）
 */
let currentTaskData: TaskDataForWorker | null = null

/**
 * 当前任务的 ResourceWriter（在同一 Worker 线程中共享）
 * 用于 startTask/pauseTask/resumeTask/stopTask 之间共享
 */
let currentResourceWriter: ResourceWriter | null = null

/**
 * 当前任务的 TaskHandler（在同一 Worker 线程中共享）
 * 用于 startTask/pauseTask/resumeTask/stopTask 之间共享
 */
let currentTaskHandler: TaskHandler | null = null

/**
 * 发送消息到主线程
 */
function sendToMain(message: WorkerProgressMessage): void {
  parentPort?.postMessage(message)
}

/**
 * 获取 TaskExecutor（动态导入以避免主线程模块进入子线程）
 */
async function getTaskExecutor(): Promise<typeof import('../../service/TaskExecutor.ts')> {
  if (!TaskExecutorModule) {
    TaskExecutorModule = await import('../../service/TaskExecutor.ts')
  }
  return TaskExecutorModule
}

/**
 * 从缓存或动态导入获取贡献点
 * @param pluginPublicId 插件公开id
 * @param contributionPath 贡献点文件路径
 * @returns 贡献点实例
 */
async function getContribution(pluginPublicId: string, contributionPath: string): Promise<TaskHandler> {
  let handler = contributionCache.get(contributionPath)

  if (isNullish(handler)) {
    // 动态导入贡献点（使用 entryPath）
    const temp = pathToFileURL(contributionPath).href
    const module = await import(temp)
    // 获取默认导出（贡献点实例）
    handler = module.default(createPluginContext(pluginPublicId)) as TaskHandler
    contributionCache.set(contributionPath, handler)
  }

  return handler
}

/**
 * 处理主线程消息
 */
parentPort?.on('message', async (message: WorkerTaskMessage) => {
  switch (message.type) {
    case 'start':
      await handleTaskStart(message)
      break
    case 'pause':
      await handleTaskPause()
      break
    case 'resume':
      await handleTaskResume()
      break
    case 'stop':
      await handleTaskStop()
      break
  }
})

/**
 * 处理任务开始
 */
async function handleTaskStart(message: WorkerTaskMessage): Promise<void> {
  if (message.taskId === undefined) {
    sendToMain({ type: 'error', taskId: 0, error: '任务 ID 不能为空' })
    return
  }

  const taskData = message.taskData as TaskDataForWorker | undefined
  if (taskData === undefined) {
    sendToMain({ type: 'error', taskId: message.taskId, error: '任务数据不能为空' })
    return
  }

  if (!taskData.workdir) {
    sendToMain({ type: 'error', taskId: message.taskId, error: '工作目录不能为空' })
    return
  }

  if (typeof taskData.task.pluginData === 'string') {
    taskData.task.pluginData = JSON.parse(taskData.task.pluginData)
  }

  try {
    // 保存任务数据供暂停/恢复/停止使用
    currentTaskData = taskData

    // 获取贡献点（从缓存或动态导入）
    const taskHandler = await getContribution(taskData.pluginPublicId, taskData.contributionPath)
    currentTaskHandler = taskHandler

    // 获取 TaskExecutor（动态导入）
    const TaskExecutor = await getTaskExecutor()

    // 在子线程中获取或创建 workId（通过 DbProxy 透明地在主线程执行数据库操作）
    const update = false // 新任务默认不更新已有作品信息
    const workId = await TaskExecutor.TaskExecutor.saveWorkInfo(taskData.task, taskHandler, update)
    if (workId === null || workId === undefined) {
      sendToMain({ type: 'error', taskId: message.taskId, error: '创建作品信息失败' })
      return
    }

    // 将 workId 存储在 currentTaskData 中，供 resumeTask 使用
    taskData.workId = workId

    // 创建进度回调，用于将进度消息发送到主线程
    const onProgress = (bytesWritten: number) => {
      sendToMain({
        type: 'progress',
        taskId: message.taskId,
        progress: {
          resourceSize: currentResourceWriter?.resourceSize,
          bytesWritten: bytesWritten
        }
      })
    }

    // 调用 startTask（使用 TaskExecutor），Database 操作会通过 DbProxy 透明地路由到主线程
    const { response: result, resourceWriter } = await TaskExecutor.TaskExecutor.startTask(
      taskData.task,
      workId,
      taskHandler,
      onProgress
    )
    currentResourceWriter = resourceWriter

    // 根据结果发送消息
    if (result.taskStatus === TaskStatusEnum.FINISHED) {
      sendToMain({ type: 'complete', taskId: message.taskId, status: 1 })
    } else if (result.taskStatus === TaskStatusEnum.PAUSE) {
      sendToMain({ type: 'paused', taskId: message.taskId, status: 2 })
    } else if (result.taskStatus === TaskStatusEnum.FAILED && result.error) {
      sendToMain({ type: 'error', taskId: message.taskId, error: result.error.message })
    }

    // 清理状态
    currentTaskData = null
    currentResourceWriter = null
    currentTaskHandler = null
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    sendToMain({ type: 'error', taskId: message.taskId, error: errorMessage })

    // 清理状态
    currentTaskData = null
    currentResourceWriter = null
    currentTaskHandler = null
  }
}

/**
 * 处理任务暂停
 */
async function handleTaskPause(): Promise<void> {
  if (currentTaskData === null || currentTaskHandler === null) {
    sendToMain({ type: 'error', error: '当前没有运行中的任务，无法暂停' })
    return
  }

  try {
    // 调用 pauseTask（使用 TaskExecutor）
    const TaskExecutor = await getTaskExecutor()
    await TaskExecutor.TaskExecutor.pauseTask(currentTaskData.task, currentTaskHandler, currentResourceWriter!)

    sendToMain({ type: 'paused' })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    sendToMain({ type: 'error', error: `暂停任务失败: ${errorMessage}` })
  }
}

/**
 * 处理任务恢复
 */
async function handleTaskResume(): Promise<void> {
  if (currentTaskData === null || currentTaskHandler === null) {
    sendToMain({ type: 'error', error: '当前没有暂停的任务，无法恢复' })
    return
  }

  // 检查 workId 是否存在
  if (currentTaskData.workId === null || currentTaskData.workId === undefined) {
    sendToMain({ type: 'error', error: '恢复任务失败，workId 不存在' })
    return
  }

  try {
    // 创建进度回调，用于将进度消息发送到主线程
    const onProgress = (bytesWritten: number) => {
      const taskId = currentTaskData!.task.id
      if (taskId !== null && taskId !== undefined) {
        sendToMain({
          type: 'progress',
          taskId: taskId,
          progress: {
            resourceSize: currentResourceWriter?.resourceSize,
            bytesWritten: bytesWritten
          }
        })
      }
    }

    // 调用 resumeTask（使用 TaskExecutor）
    const TaskExecutor = await getTaskExecutor()
    const { response: result, resourceWriter } = await TaskExecutor.TaskExecutor.resumeTask(
      currentTaskData.task,
      currentTaskData.workId,
      currentTaskHandler,
      onProgress
    )
    currentResourceWriter = resourceWriter

    // 发送状态变化消息
    sendToMain({ type: 'statusChange', status: 1 }) // WorkerStatusEnum.RUNNING = 1

    // 根据结果发送最终消息
    if (result.taskStatus === TaskStatusEnum.FINISHED) {
      sendToMain({ type: 'complete', status: 1 })
    } else if (result.taskStatus === TaskStatusEnum.PAUSE) {
      sendToMain({ type: 'paused', status: 2 })
    } else if (result.taskStatus === TaskStatusEnum.FAILED && result.error) {
      sendToMain({ type: 'error', error: result.error.message })
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    sendToMain({ type: 'error', error: `恢复任务失败: ${errorMessage}` })
  }
}

/**
 * 处理任务停止
 */
async function handleTaskStop(): Promise<void> {
  if (currentTaskData === null || currentTaskHandler === null) {
    sendToMain({ type: 'error', error: '当前没有运行中的任务，无法停止' })
    return
  }

  try {
    // 调用 stopTask（使用 TaskExecutor）
    const TaskExecutor = await getTaskExecutor()
    await TaskExecutor.TaskExecutor.stopTask(currentTaskData.task, currentTaskHandler, currentResourceWriter!)

    // 清理状态
    currentTaskData = null
    currentResourceWriter = null
    currentTaskHandler = null

    sendToMain({ type: 'statusChange', status: 3 }) // WorkerStatusEnum.STOPPED = 3
    sendToMain({ type: 'complete' })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    sendToMain({ type: 'error', error: `停止任务失败: ${errorMessage}` })
  }
}

// 通知主线程 Worker 已就绪
parentPort?.postMessage({ type: 'ready', workerId })
