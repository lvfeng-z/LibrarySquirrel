import { TaskWorker } from './TaskWorker.ts'
import { TaskStatus } from './TaskStatus.ts'
import { notNullish, isNullish, arrayNotEmpty } from '@shared/util/CommonUtil.ts'
import log from '../../util/LogUtil.ts'

/**
 * 任务进度回调类型
 */
export type TaskProgressCallback = (progress: TaskWorkerProgress) => void

/**
 * 任务进度信息
 */
export interface TaskWorkerProgress {
  taskId: number
  type: 'progress' | 'complete' | 'error'
  status?: number
  progress?: {
    resourceSize?: number
    bytesWritten?: number
  }
  error?: string
}

/**
 * 工作线程池
 *
 * 职责：管理多个工作线程，分配任务到空闲线程，维护等待队列
 */
export class TaskWorkerPool {
  /**
   * 最大工作线程数
   */
  private maxWorkers: number

  /**
   * 工作线程映射 (workerId -> TaskWorker)
   */
  private workers: Map<number, TaskWorker>

  /**
   * 空闲工作线程集合
   */
  private idleWorkers: Set<number>

  /**
   * 等待队列 (FIFO)
   */
  private waitingQueue: TaskStatus[]

  /**
   * 任务到工作线程的映射 (taskId -> workerId)
   */
  private taskToWorkerMap: Map<number, number>

  /**
   * 是否已初始化
   */
  private initialized: boolean = false

  /**
   * 下一个工作线程 ID
   */
  private nextWorkerId: number = 0

  /**
   * 任务进度回调
   */
  private taskProgressCallback: TaskProgressCallback | null = null

  constructor(maxWorkers: number) {
    this.maxWorkers = maxWorkers
    this.workers = new Map()
    this.idleWorkers = new Set()
    this.waitingQueue = []
    this.taskToWorkerMap = new Map()
  }

  /**
   * 设置任务进度回调
   * @param callback 回调函数
   */
  setTaskProgressCallback(callback: TaskProgressCallback): void {
    this.taskProgressCallback = callback
  }

  /**
   * 初始化工作线程池
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      log.warn(this.constructor.name, '工作线程池已初始化')
      return
    }

    // 创建固定数量的工作线程
    for (let i = 0; i < this.maxWorkers; i++) {
      const workerId = this.nextWorkerId++
      const worker = new TaskWorker(workerId)
      this.workers.set(workerId, worker)
      this.idleWorkers.add(workerId)
    }

    this.initialized = true
    log.info(this.constructor.name, `工作线程池已初始化，最大工作线程数: ${this.maxWorkers}`)
  }

  /**
   * 提交任务（自动分配或排队）
   * @param task 任务运行实例
   */
  submitTask(task: TaskStatus): void {
    // 查找空闲工作线程
    const idleWorkerId = this.findIdleWorker()

    if (notNullish(idleWorkerId)) {
      // 有空闲工作线程，分配任务
      this.assignTaskToWorker(idleWorkerId, task)
    } else {
      // 无空闲工作线程，加入等待队列
      this.waitingQueue.push(task)
      log.debug(this.constructor.name, `任务 ${task.taskId} 加入等待队列，当前等待任务数: ${this.waitingQueue.length}`)
    }
  }

  /**
   * 释放工作线程（任务完成后调用）
   * @param workerId 工作线程 ID
   */
  releaseWorker(workerId: number): void {
    const worker = this.workers.get(workerId)
    if (isNullish(worker)) {
      log.warn(this.constructor.name, `释放工作线程 ${workerId} 失败，工作线程不存在`)
      return
    }

    worker.release()
    this.idleWorkers.add(workerId)

    // 检查等待队列
    this.processWaitingQueue()
  }

  /**
   * 暂停指定任务
   * @param taskId 任务 ID
   */
  async pauseTask(taskId: number): Promise<boolean> {
    const workerId = this.taskToWorkerMap.get(taskId)
    if (isNullish(workerId)) {
      log.warn(this.constructor.name, `暂停任务 ${taskId} 失败，未找到对应工作线程`)
      return false
    }

    const worker = this.workers.get(workerId)
    if (isNullish(worker)) {
      log.warn(this.constructor.name, `暂停任务 ${taskId} 失败，工作线程 ${workerId} 不存在`)
      return false
    }

    const result = await worker.pause()
    if (result) {
      this.taskToWorkerMap.delete(taskId)
      this.idleWorkers.add(workerId)
      this.processWaitingQueue()
    }
    return result
  }

  /**
   * 停止指定任务
   * @param taskId 任务 ID
   */
  async stopTask(taskId: number): Promise<void> {
    const workerId = this.taskToWorkerMap.get(taskId)
    if (isNullish(workerId)) {
      log.warn(this.constructor.name, `停止任务 ${taskId} 失败，未找到对应工作线程`)
      return
    }

    const worker = this.workers.get(workerId)
    if (isNullish(worker)) {
      log.warn(this.constructor.name, `停止任务 ${taskId} 失败，工作线程 ${workerId} 不存在`)
      return
    }

    await worker.stop()
    this.taskToWorkerMap.delete(taskId)
    this.idleWorkers.add(workerId)
    this.processWaitingQueue()
  }

  /**
   * 恢复指定任务
   * 将暂停的任务重新分配到工作线程池
   * @param task 暂停的任务实例
   */
  async resumeTask(task: TaskStatus): Promise<void> {
    const taskId = task.taskId

    // 查找空闲工作线程
    const idleWorkerId = this.findIdleWorker()

    if (notNullish(idleWorkerId)) {
      // 有空闲工作线程，直接分配任务
      log.debug(this.constructor.name, `恢复任务 ${taskId}，分配到空闲工作线程 ${idleWorkerId}`)
      this.assignTaskToWorker(idleWorkerId, task)
    } else {
      // 无空闲工作线程，加入等待队列
      log.debug(this.constructor.name, `恢复任务 ${taskId}，加入等待队列`)
      this.waitingQueue.push(task)
    }
  }

  /**
   * 动态调整最大工作线程数
   * @param count 新的大小
   */
  updateMaxWorkers(count: number): void {
    if (count < 1) {
      log.warn(this.constructor.name, `无效的最大工作线程数: ${count}`)
      return
    }

    const oldMaxWorkers = this.maxWorkers
    this.maxWorkers = count

    if (count > oldMaxWorkers) {
      // 增加工作线程
      for (let i = 0; i < count - oldMaxWorkers; i++) {
        const workerId = this.nextWorkerId++
        const worker = new TaskWorker(workerId)
        this.workers.set(workerId, worker)
        this.idleWorkers.add(workerId)
      }
      log.info(this.constructor.name, `工作线程池已扩容: ${oldMaxWorkers} -> ${count}`)
    } else if (count < oldMaxWorkers) {
      // 缩容工作线程
      let removed = 0
      for (const [workerId, worker] of this.workers) {
        if (removed >= oldMaxWorkers - count) {
          break
        }
        if (this.idleWorkers.has(workerId)) {
          worker.release()
          this.workers.delete(workerId)
          this.idleWorkers.delete(workerId)
          removed++
        }
      }
      log.info(this.constructor.name, `工作线程池已缩容: ${oldMaxWorkers} -> ${count}`)
    }

    this.processWaitingQueue()
  }

  /**
   * 获取工作线程池状态
   */
  getStatus(): { idle: number; running: number; waiting: number } {
    return {
      idle: this.idleWorkers.size,
      running: this.workers.size - this.idleWorkers.size,
      waiting: this.waitingQueue.length
    }
  }

  /**
   * 关闭工作线程池
   */
  async shutdown(): Promise<void> {
    for (const [, worker] of this.workers) {
      worker.release()
    }
    this.workers.clear()
    this.idleWorkers.clear()
    this.waitingQueue = []
    this.taskToWorkerMap.clear()
    this.initialized = false
    log.info(this.constructor.name, '工作线程池已关闭')
  }

  /**
   * 查找空闲工作线程
   */
  private findIdleWorker(): number | null {
    if (this.idleWorkers.size === 0) {
      return null
    }
    // 返回第一个空闲工作线程 ID
    return this.idleWorkers.values().next().value ?? null
  }

  /**
   * 分配任务到工作线程
   */
  private async assignTaskToWorker(workerId: number, task: TaskStatus): Promise<void> {
    const worker = this.workers.get(workerId)
    if (isNullish(worker)) {
      log.error(this.constructor.name, `分配任务 ${task.taskId} 失败，工作线程 ${workerId} 不存在`)
      return
    }

    // 从空闲集合移除
    this.idleWorkers.delete(workerId)

    // 建立映射
    this.taskToWorkerMap.set(task.taskId, workerId)

    // 设置任务完成回调
    worker.setOnTaskComplete((completedWorkerId) => {
      this.releaseWorker(completedWorkerId)
    })

    // 设置任务进度回调
    if (this.taskProgressCallback !== null) {
      worker.setOnTaskProgress((taskId, progress) => {
        this.taskProgressCallback!({
          taskId,
          type: 'progress',
          progress: {
            resourceSize: progress.total ?? undefined,
            bytesWritten: progress.finished ?? undefined
          }
        })
      })
    }

    // 启动任务
    await worker.start(task)
  }

  /**
   * 处理等待队列
   */
  private processWaitingQueue(): void {
    while (arrayNotEmpty(this.waitingQueue)) {
      const idleWorkerId = this.findIdleWorker()
      if (isNullish(idleWorkerId)) {
        break
      }

      // FIFO: 取出队列中第一个任务
      const task = this.waitingQueue.shift()
      if (notNullish(task)) {
        this.assignTaskToWorker(idleWorkerId, task)
      }
    }
  }
}
