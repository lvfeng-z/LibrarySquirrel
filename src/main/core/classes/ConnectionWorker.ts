import { Worker } from 'worker_threads'
import { DataBasePath } from '../../util/DatabaseUtil.ts'
import DataBaseConstant from '../../constant/DataBaseConstant.ts'
import log from '../../util/LogUtil.ts'
import d from '../workers/databaseWorker.ts?modulePath'

interface DatabaseRequest {
  id: string
  type: 'run' | 'get' | 'all' | 'exec' | 'prepare' | 'close'
  statement?: string
  params?: unknown[]
}

interface DatabaseResponse {
  id: string
  success: boolean
  result?: unknown
  error?: string
}

type RequestCallback = (response: DatabaseResponse) => void

/**
 * 数据库工作线程
 * 每个 ConnectionWorker 持有一个 Worker 线程，线程内维护一个 SQLite 连接
 */
export class ConnectionWorker {
  private readonly index: number
  private readonly worker!: Worker
  private occupied: boolean = false
  private _occupyStart: number
  private requestCallbacks: Map<string, RequestCallback> = new Map()
  private _ready: boolean = false
  private readyPromise: Promise<void>
  private requestIdCounter: number = 0

  constructor(index: number) {
    this.index = index
    this._occupyStart = Math.floor(Date.now() / 1000)

    // 创建 Worker Promise
    this.readyPromise = new Promise((resolve) => {
      const worker = new Worker(d, {
        workerData: {
          databasePath: DataBasePath() + DataBaseConstant.DB_FILE_NAME
        }
      })

      worker.on('message', (message: DatabaseResponse | { type: string }) => {
        if ((message as { type: string }).type === 'ready') {
          this._ready = true
          log.debug('ConnectionWorker', `[${this.index}] Worker 已就绪`)
          resolve()
          return
        }

        const response = message as DatabaseResponse
        const callback = this.requestCallbacks.get(response.id)
        if (callback) {
          this.requestCallbacks.delete(response.id)
          callback(response)
        }
      })

      worker.on('error', (error) => {
        log.error('ConnectionWorker', `[${this.index}] Worker 错误:`, error)
      })

      worker.on('exit', (code) => {
        log.debug('ConnectionWorker', `[${this.index}] Worker 退出，code: ${code}`)
        this._ready = false
      })

      // 使用 Object.defineProperty 来绕过 readonly 限制
      Object.defineProperty(this, 'worker', {
        value: worker,
        writable: false,
        configurable: true
      })
    })
  }

  /**
   * 等待 Worker 就绪
   */
  async waitReady(): Promise<void> {
    await this.readyPromise
  }

  /**
   * 是否已就绪
   */
  get ready(): boolean {
    return this._ready
  }

  /**
   * 占用开始时间
   */
  get occupyStart(): number {
    return this._occupyStart
  }

  /**
   * 生成唯一请求 ID
   */
  private generateRequestId(): string {
    return `req_${this.index}_${Date.now()}_${this.requestIdCounter++}`
  }

  /**
   * 发送请求到 Worker 并等待响应
   */
  private async sendRequest(request: Omit<DatabaseRequest, 'id'>): Promise<DatabaseResponse> {
    const requestId = this.generateRequestId()
    const fullRequest: DatabaseRequest = { ...request, id: requestId }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.requestCallbacks.delete(requestId)
        reject(new Error(`Worker 请求超时: ${request.type}`))
      }, 30000) // 30秒超时

      this.requestCallbacks.set(requestId, (response) => {
        clearTimeout(timeout)
        if (response.success) {
          resolve(response)
        } else {
          reject(new Error(response.error || 'Unknown error'))
        }
      })

      this.worker.postMessage(fullRequest)
    })
  }

  /**
   * 执行写操作
   */
  async run(statement: string, params?: unknown[]): Promise<unknown> {
    const response = await this.sendRequest({ type: 'run', statement, params })
    return response.result
  }

  /**
   * 执行读操作 - 单条
   */
  async get(statement: string, params?: unknown[]): Promise<unknown> {
    const response = await this.sendRequest({ type: 'get', statement, params })
    return response.result
  }

  /**
   * 执行读操作 - 列表
   */
  async all(statement: string, params?: unknown[]): Promise<unknown[]> {
    const response = await this.sendRequest({ type: 'all', statement, params })
    return response.result as unknown[]
  }

  /**
   * 执行语句
   */
  async exec(statement: string): Promise<boolean> {
    const response = await this.sendRequest({ type: 'exec', statement })
    return response.result as boolean
  }

  /**
   * 标记为占用
   */
  public occupy(): void {
    this.occupied = true
    this._occupyStart = Math.floor(Date.now() / 1000)
  }

  /**
   * 释放占用
   */
  public release(): void {
    this.occupied = false
  }

  /**
   * 是否占用
   */
  public isOccupied(): boolean {
    return this.occupied
  }

  /**
   * 获取索引
   */
  public getIndex(): number {
    return this.index
  }

  /**
   * 刷新占用时间
   */
  public refreshOccupyStart(): void {
    this._occupyStart = Math.floor(Date.now() / 1000)
  }

  /**
   * 关闭 Worker
   */
  async close(): Promise<void> {
    try {
      await this.sendRequest({ type: 'close' })
    } catch {
      // 忽略关闭错误
    } finally {
      await this.worker.terminate()
    }
  }
}

/**
 * 创建 ConnectionWorker 的工厂函数
 */
export async function createConnectionWorker(index: number): Promise<ConnectionWorker> {
  const worker = new ConnectionWorker(index)
  await worker.waitReady()
  return worker
}
