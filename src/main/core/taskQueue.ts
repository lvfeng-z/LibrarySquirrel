import { TaskQueue } from './classes/TaskQueue.ts'
import { TaskWorkerPool } from './classes/TaskWorkerPool.ts'
import { isNullish, notNullish } from '@shared/util/CommonUtil.ts'
import log from '../util/LogUtil.ts'

let taskQueue: TaskQueue | undefined = undefined
let taskWorkerPool: TaskWorkerPool | undefined = undefined

/**
 * 创建任务队列
 */
function createTaskQueue() {
  if (isNullish(taskQueue)) {
    taskQueue = new TaskQueue()
    log.info('TaskQueue', '任务队列已创建')
  }
}

/**
 * 获取任务队列
 */
function getTaskQueue() {
  if (isNullish(taskQueue)) {
    throw new Error('任务队列未初始化！')
  }
  return taskQueue
}

/**
 * 创建工作线程池
 * @param maxWorkers 最大工作线程数
 */
async function createTaskWorkerPool(maxWorkers: number): Promise<void> {
  if (isNullish(taskWorkerPool)) {
    taskWorkerPool = new TaskWorkerPool(maxWorkers)
    await taskWorkerPool.initialize()
    log.info('TaskWorkerPool', `工作线程池已创建，最大工作线程数: ${maxWorkers}`)
  }
}

/**
 * 获取工作线程池
 */
function getTaskWorkerPool(): TaskWorkerPool {
  if (isNullish(taskWorkerPool)) {
    throw new Error('工作线程池未初始化！')
  }
  return taskWorkerPool
}

/**
 * 更新工作线程池最大工作线程数
 * @param maxWorkers 最大工作线程数
 */
function updateTaskWorkerPoolSize(maxWorkers: number): void {
  if (notNullish(taskWorkerPool)) {
    taskWorkerPool.updateMaxWorkers(maxWorkers)
  }
}

/**
 * 关闭工作线程池
 */
async function shutdownTaskWorkerPool(): Promise<void> {
  if (notNullish(taskWorkerPool)) {
    await taskWorkerPool.shutdown()
    taskWorkerPool = undefined
    log.info('TaskWorkerPool', '工作线程池已关闭')
  }
}

export { createTaskQueue, getTaskQueue, createTaskWorkerPool, getTaskWorkerPool, updateTaskWorkerPoolSize, shutdownTaskWorkerPool }
