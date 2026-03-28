import { parentPort, workerData } from 'worker_threads'
import Task from '@shared/model/entity/Task.ts'
import TaskService from '../../service/TaskService.ts'
import { TaskStatusEnum } from '../../constant/TaskStatusEnum.ts'

/**
 * 工作线程初始化数据
 */
interface TaskWorkerInitData {
  workerId: number
  threadType: string
}

/**
 * 贡献点文件路径信息（来自主线程）
 */
interface ContributionFilePathInfo {
  /** 插件入口文件路径 */
  entryPath: string
  /** 贡献点键名 */
  key: string
  /** 贡献点 ID */
  contributionId: string
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
  /** 贡献点文件路径信息 */
  contributionInfo: ContributionFilePathInfo
  /** 作品 ID */
  workId: number
  /** 工作目录（用于拼接 resourcePath） */
  workdir: string
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

// 初始化数据
const initData = workerData as TaskWorkerInitData
const workerId = initData.workerId

/**
 * 当前任务的数据（用于暂停/恢复/停止操作）
 */
let currentTaskData: TaskDataForWorker | null = null

/**
 * Worker 线程中共享的 TaskService 实例
 * 用于在同一 Worker 线程中的 startTask/pauseTask/stopTask 之间共享 currentResourceWriter
 */
const taskService = new TaskService()

/**
 * 发送消息到主线程
 */
function sendToMain(message: WorkerProgressMessage): void {
  parentPort?.postMessage(message)
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

  try {
    // 保存任务数据供暂停/恢复/停止使用
    currentTaskData = taskData

    // 创建进度回调，用于将进度消息发送到主线程
    const onProgress = (bytesWritten: number) => {
      sendToMain({
        type: 'progress',
        taskId: message.taskId,
        progress: {
          resourceSize: taskService.getCurrentResourceWriter()?.resourceSize,
          bytesWritten: bytesWritten
        }
      })
    }

    // 调用 startTask，Database 操作会通过 DbProxy 透明地路由到主线程
    const result = await taskService.startTask(taskData.task, taskData.workId, onProgress)

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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    sendToMain({ type: 'error', taskId: message.taskId, error: errorMessage })

    // 清理状态
    currentTaskData = null
  }
}

/**
 * 处理任务暂停
 */
async function handleTaskPause(): Promise<void> {
  if (currentTaskData === null) {
    sendToMain({ type: 'error', error: '当前没有运行中的任务，无法暂停' })
    return
  }

  try {
    // 调用 pauseTask
    await taskService.pauseTask(currentTaskData.task)

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
  if (currentTaskData === null) {
    sendToMain({ type: 'error', error: '当前没有暂停的任务，无法恢复' })
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
            resourceSize: taskService.getCurrentResourceWriter()?.resourceSize,
            bytesWritten: bytesWritten
          }
        })
      }
    }

    // 调用 resumeTask
    const result = await taskService.resumeTask(currentTaskData.task, currentTaskData.workId, onProgress)

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
  if (currentTaskData === null) {
    sendToMain({ type: 'error', error: '当前没有运行中的任务，无法停止' })
    return
  }

  try {
    // 调用 stopTask
    await taskService.stopTask(currentTaskData.task)

    // 清理状态
    currentTaskData = null

    sendToMain({ type: 'statusChange', status: 3 }) // WorkerStatusEnum.STOPPED = 3
    sendToMain({ type: 'complete' })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    sendToMain({ type: 'error', error: `停止任务失败: ${errorMessage}` })
  }
}

// 通知主线程 Worker 已就绪
parentPort?.postMessage({ type: 'ready', workerId })
