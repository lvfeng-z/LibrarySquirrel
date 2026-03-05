import { TaskQueue } from './classes/TaskQueue.ts'
import { isNullish } from '@shared/util/CommonUtil.ts'

let taskQueue: TaskQueue | undefined = undefined

function createTaskQueue() {
  if (isNullish(taskQueue)) {
    taskQueue = new TaskQueue()
  }
}

function getTaskQueue() {
  if (isNullish(taskQueue)) {
    throw new Error('任务队列未初始化！')
  }
  return taskQueue
}

export { createTaskQueue, getTaskQueue }
