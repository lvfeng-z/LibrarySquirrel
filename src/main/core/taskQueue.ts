import { TaskQueue } from './classes/TaskQueue.ts'
import { IsNullish } from '../util/CommonUtil.ts'

let taskQueue: TaskQueue | undefined = undefined

function createTaskQueue() {
  if (IsNullish(taskQueue)) {
    taskQueue = new TaskQueue()
  }
}

function getTaskQueue() {
  if (IsNullish(taskQueue)) {
    throw new Error('任务队列未初始化！')
  }
  return taskQueue
}

export { createTaskQueue, getTaskQueue }
