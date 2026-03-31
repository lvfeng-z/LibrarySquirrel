import log from '../../util/LogUtil.ts'
import { ConnectionWorker, createConnectionWorker } from './ConnectionWorker.ts'

export interface ConnectionPoolConfig {
  maxConnections: number
}

export enum RequestWeight {
  CRITICAL = 5,
  HIGH = 4,
  MEDIUM = 3,
  LOW = 2,
  TRIVIAL = 1
}

type WaitingRequest = {
  requestWeigh: RequestWeight
  resolve: (connection: ConnectionWorker) => void
}

export class ConnectionPool {
  /**
   * 配置
   * @private
   */
  private readonly config: ConnectionPoolConfig
  /**
   * 连接 Worker 列表
   * @private
   */
  private readonly workers: (ConnectionWorker | undefined)[]
  /**
   * 等待队列
   * @private
   */
  private readonly waitingQueue: WaitingRequest[]
  // /**
  //  * 是否写入锁定
  //  * @private
  //  */
  // private writeLocked: boolean
  // /**
  //  * 虚拟排他锁的请求队列
  //  * @private
  //  */
  // private writeLockQueue: (() => void)[]
  /**
   * 初始化状态
   * @private
   */
  private initialized: boolean = false

  constructor(config: ConnectionPoolConfig) {
    this.config = config
    this.workers = Array(this.config.maxConnections).fill(undefined)
    this.waitingQueue = []
    // this.writeLocked = false
    // this.writeLockQueue = []
  }

  /**
   * 初始化连接池，创建所有 Worker
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    log.debug('ConnectionPool', '开始初始化连接池...')

    // 预创建所有 Worker
    const initPromises: Promise<ConnectionWorker>[] = []
    for (let index = 0; index < this.config.maxConnections; index++) {
      const promise = this.createWorker(index)
      initPromises.push(promise)
    }

    await Promise.all(initPromises)
    this.initialized = true
    log.debug('ConnectionPool', `连接池初始化完成，共 ${this.config.maxConnections} 个 Worker`)
  }

  /**
   * 获取连接 Worker
   */
  public async acquire(requestWeigh: RequestWeight): Promise<ConnectionWorker> {
    // 遍历 Worker 数组，寻找是否有可复用 Worker
    let firstIdleIndex = -1
    for (let index = 0; index < this.workers.length; index++) {
      const worker = this.workers[index]
      if (worker === undefined && firstIdleIndex === -1) {
        firstIdleIndex = index
      } else if (worker !== undefined && !worker.isOccupied()) {
        log.debug('ConnectionPool', `[${index}] Worker 复用`)
        worker.occupy()
        worker.refreshOccupyStart()
        return worker
      }
    }

    // 如果遍历整个数组还没有找到可用的 Worker，尝试新增
    if (firstIdleIndex != -1) {
      const newWorker = await this.createWorker(firstIdleIndex)
      newWorker.occupy()
      log.debug('ConnectionPool', `[${firstIdleIndex}]新建 Worker`)
      return newWorker
    }

    // 没有可用 Worker，加入等待队列
    return new Promise((resolve) => {
      this.waitingQueue.push({ requestWeigh: requestWeigh, resolve })
    })
  }

  /**
   * 释放连接 Worker
   * @param index
   */
  public release(index: number): void {
    const worker = this.workers[index]
    if (worker === undefined) {
      log.error('ConnectionPool', `[${index}]释放 Worker 失败，Worker 为空`)
      return
    }
    if (!worker.isOccupied()) {
      log.error('ConnectionPool', `[${index}]释放 Worker 失败，Worker 已经处于空闲状态`)
      return
    }

    // 如果等待队列不为空，从等待队列中取第一个分配 Worker
    if (this.waitingQueue.length > 0) {
      const request = this.waitingQueue.shift()
      if (request) {
        log.debug('ConnectionPool', `[${index}] Worker 在释放时被复用，当前等待队列长度为：${this.waitingQueue.length}`)
        worker.refreshOccupyStart()
        request.resolve(worker)
      }
    } else {
      worker.release()
      log.debug('ConnectionPool', `[${index}] Worker 已释放`)
    }
  }

  // /**
  //  * 获取排他锁
  //  */
  // public async acquireLock(requester: string, operation: string): Promise<void> {
  //   return new Promise((resolve) => {
  //     if (!this.writeLocked) {
  //       log.debug('ConnectionPool.write', `${requester}锁定排他锁，操作：${operation}`)
  //       this.writeLocked = true
  //       resolve()
  //     } else {
  //       log.debug('ConnectionPool.write', `排他锁处于锁定状态，${requester}进入等待队列，操作：${operation}`)
  //       this.writeLockQueue.push(() => resolve())
  //     }
  //   })
  // }

  // /**
  //  * 释放排他锁
  //  */
  // public releaseLock(requester: string): void {
  //   if (this.writeLockQueue.length > 0) {
  //     const next = this.writeLockQueue.shift()
  //     if (next) {
  //       next()
  //     }
  //   } else {
  //     log.debug('ConnectionPool.write', `${requester}释放排他锁`)
  //     this.writeLocked = false
  //   }
  // }

  /**
   * 创建 Worker
   */
  private async createWorker(index: number): Promise<ConnectionWorker> {
    const worker = await createConnectionWorker(index)
    this.workers[index] = worker
    return worker
  }

  /**
   * 关闭所有 Worker
   */
  public async closeAll(): Promise<void> {
    log.debug('ConnectionPool', '开始关闭所有 Worker...')

    const closePromises: Promise<void>[] = []
    for (let index = 0; index < this.workers.length; index++) {
      const worker = this.workers[index]
      if (worker) {
        closePromises.push(worker.close())
      }
    }

    await Promise.all(closePromises)
    log.debug('ConnectionPool', '所有 Worker 已关闭')
  }
}
