# 非主线程数据库操作实现计划

## 背景

当前项目的数据库操作通过 `Database.ts` 统一入口访问，该入口依赖 `ConnectionPool` 获取数据库连接。然而：

1. **ConnectionPool 位于主线程**：连接池在主线程中初始化，工作线程无法直接访问
2. **任务队列需要多线程化**：任务队列重构计划需要工作线程能够执行数据库操作
3. **当前架构限制**：现有 `databaseWorker.ts` 仅用于数据库工作线程，不支持从其他 Worker 线程发起请求

本计划的目标是：**让非主线程（Worker 线程）能够执行数据库操作**，为任务队列多线程化提供基础设施。

---

## 核心设计约束（重要）

### 关键要求

1. **代理持有连接**：当子线程向代理请求连接时，主线程从连接池获取一个专用连接，由代理持有
2. **1:1 映射**：
   - 子线程向代理请求连接 = 主线程为代理请求连接（从连接池获取）
   - 子线程向代理请求数据库操作 = 主线程使用该代理持有的连接进行数据库操作
   - 子线程向代理请求释放连接 = 主线程释放该代理持有的连接（归还到连接池）
3. **显式释放**：直到子线程**明确请求释放**该连接时，主线程才将其归还到连接池

### 设计含义

```
┌─────────────────────────────────────────────────────────────────┐
│                          主线程                                  │
│                                                                  │
│   ┌──────────────────┐         ┌──────────────────────────┐   │
│   │   ConnectionPool │         │    专用连接 (Worker)        │   │
│   │    (连接池)      │◀───────▶│   (由 DedicatedDbProxy    │   │
│   └────────┬─────────┘         │    持有，长期占用)           │   │
│            │                   └───────────┬──────────────┘   │
│            │ acquire (获取)                │                    │
│            │ release (归还)                │                    │
│            │                               │                    │
│            │    ┌──────────────────────────┴─────────────┐    │
│            │    │  DbProxyRegistry                       │    │
│            │    │  (管理代理与连接的映射)                 │    │
│            │    └──────────────────────────┬─────────────┘    │
│            │                               │                    │
└────────────┼───────────────────────────────┼────────────────────┘
             │                               │
             │ 1. 请求连接                    │ 2. 请求操作
             │ 2. 请求操作                    │    (使用同一连接)
             │ 3. 请求释放                    │ 3. 释放连接
             │                               │
             │  (通过消息机制)                │
             │                               │
             ▼                               ▼
┌──────────────────────┐         ┌──────────────────────────┐
│   TaskWorker 1       │         │   TaskWorker 2          │
│  (Worker 线程)       │         │   (Worker 线程)         │
│                      │         │                          │
│  Database.run()      │         │  Database.run()          │
│       │              │         │       │                  │
│       ▼              │         │       ▼                  │
│  DedicatedDbProxy    │         │  DedicatedDbProxy       │
│       │              │         │       │                  │
│       │ (消息)        │         │       │ (消息)            │
│       └──────────────┼─────────┼───────┘                  │
│                      │         │                          │
└──────────────────────┴─────────┴──────────────────────────┘

说明：
1. 子线程请求连接 → 主线程从连接池获取 → 代理持有
2. 子线程请求操作 → 主线程使用代理持有的连接执行 → 返回结果
3. 子线程请求释放 → 主线程归还连接到连接池 → 代理不再持有

流程详解（以 TaskWorker 1 为例）：
┌─────────────────────────────────────────────────────────────────┐
│ TaskWorker 1                                                    │
│                                                                 │
│ 1. Database.run('SELECT * FROM task')                          │
│    │                                                           │
│    ▼ (Database.ts 检测到非主线程，调用 DedicatedDbProxy)        │
│                                                                 │
│ 2. DedicatedDbProxy.run('SELECT * FROM task')                  │
│    │                                                           │
│    │ (发送消息到主线程)                                         │
│    ▼                                                           │
│ 3. process.parentPort.postMessage({                            │
│       type: 'run',                                             │
│       statement: 'SELECT * FROM task',                         │
│       threadId: 1                                              │
│     })                                                         │
│    │                                                           │
└────┼───────────────────────────────────────────────────────────┘
     │
     │ 消息通信
     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 主线程: DbProxyRegistry                                        │
│                                                                 │
│ 4. 接收消息，根据 threadId=1 找到对应的 ConnectionWorker        │
│    │                                                           │
│    ▼                                                           │
│ 5. worker.run('SELECT * FROM task')                            │
│    │ (使用该代理持有的专用连接执行)                              │
│    │                                                           │
│ 6. 返回结果到子线程                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 影响分析

### 依赖关系

```
┌─────────────────────────────────────────┐
│      非主线程数据库操作实现计划           │
└────────────────┬────────────────────────┘
                 │
                 ▼ (前置条件)
┌─────────────────────────────────────────┐
│        任务队列重构计划                  │
└─────────────────────────────────────────┘
```

### 对任务队列重构的影响

1. **TaskWorker 可直接调用 Database**：无需在主线程中代理数据库操作，简化 TaskWorker 实现
2. **Database.ts 需支持线程感知**：自动检测运行环境，选择正确的数据库访问路径
3. **每个 TaskWorker 拥有独立数据库连接**：任务执行期间独占连接，完成后释放

---

## 技术方案

### 一、如何判断当前是否在主线程

**方案**：使用 workerData（已确定）

```typescript
// 在主线程创建 TaskWorker 时传入
const worker = new Worker(taskWorkerPath, {
  workerData: {
    threadType: 'task',  // 标识为任务工作线程
    databasePath: '...'  // 数据库路径
  }
})

// 在 Database.ts 中判断
import { workerData } from 'worker_threads'

private static isInMainThread(): boolean {
  try {
    // 在 Worker 线程中，workerData 会被传入
    // 在主线程中，无法访问 workerData（或为 undefined）
    return workerData?.threadType !== 'task'
  } catch {
    return true
  }
}
```

### 二、架构设计

#### 1. 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                          主线程                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐   │
│  │   Database     │  │ DbProxyRegistry │  │ConnectionPool│   │
│  │ (数据库入口)     │──│  (代理注册表)    │──│  (连接池)    │   │
│  └─────────────────┘  └─────────────────┘  └──────────────┘   │
│         │                    │                    │            │
│         │                    │ acquire/release     │            │
│         │                    │ (专用连接)          │            │
└────────-|--------------------|--------------------|────────────┘
          │                    │                    │
          │ isMainThread=true  │ isMainThread=false │
          │                    │ (数据库操作请求)    │
          ▼                    ▼                    ▼
┌──────────────────┐   ┌──────────────────┐  ┌──────────────────┐
│ 直接使用         │   │ 通过 DedicatedDb  │  │ 获取/创建         │
│ ConnectionPool   │   │   Proxy          │  │ DedicatedDbProxy │
└──────────────────┘   └──────────────────┘  └──────────────────┘
```

#### 2. 组件说明

| 组件 | 位置 | 职责 |
|------|------|------|
| Database | `src/main/database/Database.ts` | 数据库操作入口，增加线程感知逻辑 |
| DbProxyRegistry | `src/main/core/DbProxyRegistry.ts` | 管理所有子线程的专用数据库连接，按线程ID索引 |
| DedicatedDbProxy | `src/main/core/classes/DedicatedDbProxy.ts` | 每个 Worker 线程独立的专用数据库代理（各自持有独立连接） |

**关键点**：DedicatedDbProxy **不是单例**，每个 Worker 线程拥有独立的代理实例，各自持有独立的数据库连接。

#### 3. Database.ts 改造

```typescript
export class Database {
  // 判断是否在主线程
  private static isInMainThread(): boolean {
    try {
      return workerData?.threadType !== 'task'
    } catch {
      return true
    }
  }

  // 获取当前线程的专用数据库代理（仅非主线程使用）
  private static getDedicatedProxy(): DedicatedDbProxy | null {
    return DedicatedDbProxy.getInstance()
  }

  // 获取数据库连接 Worker
  private static async acquireWorker(): Promise<ConnectionWorker> {
    if (this.isInMainThread()) {
      // 主线程：使用现有逻辑
      if (TransactionContext.inTransaction()) {
        return TransactionContext.getWorker()!
      }
      const pool = getConnectionPool()
      const worker = await pool.acquire(RequestWeight.LOW)
      borrowedWorkers.set(worker, worker.getIndex())
      return worker
    } else {
      // 非主线程：通过专用代理获取连接
      const proxy = this.getDedicatedProxy()
      if (!proxy) {
        throw new Error('DedicatedDbProxy 未初始化')
      }
      return proxy.acquireWorker()
    }
  }

  // 释放数据库连接 Worker
  private static releaseWorker(worker: ConnectionWorker): void {
    if (this.isInMainThread()) {
      // 主线程：现有逻辑
      if (TransactionContext.inTransaction()) {
        return
      }
      const pool = getConnectionPool()
      const index = borrowedWorkers.get(worker)
      if (!isNullish(index)) {
        pool.release(index)
        borrowedWorkers.delete(worker)
      }
    } else {
      // 非主线程：通过专用代理释放连接
      const proxy = this.getDedicatedProxy()
      if (proxy) {
        proxy.releaseWorker(worker)
      }
    }
  }
}
```

**关键改进**：
- 新增 `getDedicatedProxy()` 方法，获取当前线程的代理实例
- Database.ts 无需关心 threadId，由 DedicatedDbProxy 内部管理
- 子线程只需调用 `Database.run()`，无感知地使用数据库操作

#### 4. DedicatedDbProxy 设计（关键组件）

**核心职责**：在每个 Worker 线程中维护一个与主线程数据库连接的 1:1 映射

**重要**：
- DedicatedDbProxy 在**每个 Worker 线程中是单例**（通过 `getInstance()` 获取）
- 不同 Worker 线程拥有不同的 DedicatedDbProxy 实例，各自持有独立的数据库连接
- Worker 线程启动时自动初始化，Database.ts 无需传递 threadId

```typescript
// src/main/core/classes/DedicatedDbProxy.ts

interface DbRequest {
  requestId: string
  threadId: number  // 线程ID，用于主线程区分来源
  type: 'run' | 'get' | 'all' | 'exec' | 'acquire' | 'release'
  statement?: string
  params?: unknown[]
}

interface DbResponse {
  requestId: string
  success: boolean
  result?: unknown
  error?: string
  workerIndex?: number  // 用于标识连接
}

// 模块级变量：存储当前线程的代理实例
let dbProxyInstance: DedicatedDbProxy | null = null

/**
 * 专用数据库代理
 *
 * 使用方式：
 * 1. Worker 线程启动时：new DedicatedDbProxy() 自动初始化
 * 2. Database.ts 调用：DedicatedDbProxy.getInstance() 获取当前线程的代理
 */
export class DedicatedDbProxy {
  private readonly threadId: number  // 当前线程ID
  private pendingRequests: Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void }> = new Map()
  private acquiredWorker: ConnectionWorker | null = null  // 当前持有的专用连接
  private workerIndex: number | null = null  // 连接索引

  constructor(threadId: number) {
    this.threadId = threadId

    // Worker 线程启动时自动初始化（存储到模块级变量）
    dbProxyInstance = this

    // 监听主线程返回的消息
    process.parentPort?.on('message', (message: DbResponse) => {
      const pending = this.pendingRequests.get(message.requestId)
      if (pending) {
        this.pendingRequests.delete(message.requestId)
        if (message.success) {
          pending.resolve(message.result)
        } else {
          pending.reject(new Error(message.error))
        }
      }
    })
  }

  // 获取当前线程的代理实例（供 Database.ts 调用）
  static getInstance(): DedicatedDbProxy | null {
    return dbProxyInstance
  }

  // 获取线程ID
  getThreadId(): number {
    return this.threadId
  }

  // 从主线程获取专用数据库连接（长期占用）
  async acquireWorker(): Promise<ConnectionWorker> {
    if (this.acquiredWorker) {
      return this.acquiredWorker  // 已有专用连接，复用
    }

    const requestId = `acquire_${Date.now()}`
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, {
        resolve: (result) => {
          this.acquiredWorker = result as unknown as ConnectionWorker
          resolve(this.acquiredWorker)
        },
        reject
      })

      this.sendToMain({ requestId, type: 'acquire', threadId: this.threadId })
    })
  }

  // 释放专用数据库连接（归还到连接池）
  releaseWorker(_worker: ConnectionWorker): void {
    if (!this.acquiredWorker) {
      return  // 没有专用连接，无需释放
    }

    const requestId = `release_${Date.now()}`
    this.sendToMain({ requestId, type: 'release', threadId: this.threadId })
    this.acquiredWorker = null
    this.workerIndex = null
  }

  // 执行数据库操作（通过专用连接）
  async run(statement: string, params?: unknown[]): Promise<unknown> {
    return this.sendRequest({ type: 'run', statement, params, threadId: this.threadId })
  }

  async get(statement: string, params?: unknown[]): Promise<unknown> {
    return this.sendRequest({ type: 'get', statement, params, threadId: this.threadId })
  }

  async all(statement: string, params?: unknown[]): Promise<unknown[]> {
    return this.sendRequest({ type: 'all', statement, params, threadId: this.threadId })
  }

  async exec(statement: string): Promise<boolean> {
    return this.sendRequest({ type: 'exec', statement, threadId: this.threadId })
  }

  private sendRequest(request: Omit<DbRequest, 'requestId'>): Promise<unknown> {
    const requestId = `db_${Date.now()}_${Math.random()}`
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject })
      this.sendToMain({ ...request, requestId })
    })
  }

  private sendToMain(message: DbRequest): void {
    process.parentPort?.postMessage(message)
  }
}
```

**使用示例**：

```typescript
// ===== Worker 线程入口文件 (如 taskWorkerEntry.ts) =====
// Worker 线程启动时自动初始化代理
import { DedicatedDbProxy } from './DedicatedDbProxy.ts'

// 创建代理实例，自动存储到模块级变量
new DedicatedDbProxy(workerData.threadId)


// ===== Database.ts 中调用 =====
// 无需传递 threadId，自动获取当前线程的代理
const proxy = DedicatedDbProxy.getInstance()
if (proxy) {
  // 使用代理执行操作
  const result = await proxy.run('SELECT * FROM task')
}
```

#### 5. DbProxyRegistry 设计

**核心职责**：在主线程中管理所有子线程的专用数据库连接，按线程ID索引

```typescript
// src/main/core/DbProxyRegistry.ts

interface ProxyInfo {
  threadId: number
  worker: ConnectionWorker
  createdAt: number
}

/**
 * 数据库代理注册表
 *
 * 核心功能：
 * 1. 按 threadId 管理每个 Worker 线程的专用数据库连接
 * 2. 处理 acquire 请求：为请求的线程分配新的专用连接
 * 3. 处理 release 请求：归还指定线程的连接到连接池
 * 4. 处理数据库操作：使用对应线程的连接执行操作
 *
 * 关键：threadId -> ConnectionWorker 是 1:1 映射
 */

export class DbProxyRegistry {
  private static proxies: Map<number, ProxyInfo> = new Map()
  private static initialized: boolean = false
  private static messageHandler: ((message: DbMessage) => void) | null = null

  static initialize(): void {
    if (this.initialized) return

    // 监听来自子线程的消息
    process.parentPort?.on('message', async (message: DbMessage) => {
      await this.handleMessage(message)
    })

    this.initialized = true
    log.debug('DbProxyRegistry', '数据库代理注册表已初始化')
  }

  private static async handleMessage(message: DbMessage): Promise<void> {
    const { requestId, type, threadId } = message

    try {
      switch (type) {
        case 'create-dedicated-proxy': {
          // 创建专用数据库代理
          const worker = await this.createDedicatedConnection()
          this.proxies.set(threadId, {
            threadId,
            worker,
            createdAt: Date.now()
          })

          process.parentPort?.postMessage({
            requestId,
            success: true,
            workerIndex: worker.getIndex()
          })
          break
        }

        case 'acquire': {
          // 获取专用连接（如果已存在则直接返回）
          const proxyInfo = this.proxies.get(threadId)
          if (proxyInfo) {
            process.parentPort?.postMessage({
              requestId,
              success: true,
              workerIndex: proxyInfo.worker.getIndex()
            })
          } else {
            // 首次获取，创建新连接
            const worker = await this.createDedicatedConnection()
            this.proxies.set(threadId, {
              threadId,
              worker,
              createdAt: Date.now()
            })

            process.parentPort?.postMessage({
              requestId,
              success: true,
              workerIndex: worker.getIndex()
            })
          }
          break
        }

        case 'release': {
          // 释放专用连接（归还到连接池）
          const proxyInfo = this.proxies.get(threadId)
          if (proxyInfo) {
            getConnectionPool().release(proxyInfo.worker.getIndex())
            this.proxies.delete(threadId)
          }

          process.parentPort?.postMessage({
            requestId,
            success: true
          })
          break
        }

        case 'run':
        case 'get':
        case 'all':
        case 'exec': {
          // 执行数据库操作
          const proxyInfo = this.proxies.get(threadId)
          if (!proxyInfo) {
            throw new Error(`线程 ${threadId} 没有专用数据库连接`)
          }

          const result = await this.executeDbOperation(proxyInfo.worker, message)
          process.parentPort?.postMessage({
            requestId,
            success: true,
            result
          })
          break
        }
      }
    } catch (error) {
      process.parentPort?.postMessage({
        requestId,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  private static async createDedicatedConnection(): Promise<ConnectionWorker> {
    const pool = getConnectionPool()
    // 专用连接使用较高优先级
    const worker = await pool.acquire(RequestWeight.HIGH)
    return worker
  }

  private static async executeDbOperation(
    worker: ConnectionWorker,
    message: DbMessage
  ): Promise<unknown> {
    switch (message.type) {
      case 'run':
        return worker.run(message.statement!, message.params)
      case 'get':
        return worker.get(message.statement!, message.params)
      case 'all':
        return worker.all(message.statement!, message.params)
      case 'exec':
        return worker.exec(message.statement!)
      default:
        throw new Error(`未知操作类型: ${message.type}`)
    }
  }

  // 获取当前活跃的代理数量
  static getActiveProxyCount(): number {
    return this.proxies.size
  }

  // 清理所有代理（应用关闭时）
  static async cleanup(): Promise<void> {
    for (const [_, proxyInfo] of this.proxies) {
      getConnectionPool().release(proxyInfo.worker.getIndex())
    }
    this.proxies.clear()
  }
}
```

---

## 实施步骤

### 阶段一：基础设施（1.5天）

1. **创建 DedicatedDbProxy 类**
   - 文件：`src/main/core/classes/DedicatedDbProxy.ts`
   - 实现：子线程端的专用数据库代理，维护长连接

2. **创建 DbProxyRegistry**
   - 文件：`src/main/core/DbProxyRegistry.ts`
   - 实现：主线程端的代理注册表，管理专用连接的生命周期

### 阶段二：Database.ts 改造（0.5天）

1. **添加线程判断逻辑**
   - 使用 `workerData.threadType` 判断是否在主线程
   - 添加 `isInMainThread()` 方法

2. **修改数据库操作入口**
   - 主线程：直接使用 ConnectionPool（现有逻辑）
   - 非主线程：使用 DedicatedDbProxy 获取专用连接

### 阶段三：集成测试（1天）

1. **在主进程初始化中启动 DbProxyRegistry**
2. **测试从 Worker 线程执行数据库操作**
3. **验证专用连接的复用**
4. **验证连接释放和归还**

---

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|------|---------|------|
| 新增 | `src/main/core/classes/DedicatedDbProxy.ts` | 子线程专用数据库代理（长连接） |
| 新增 | `src/main/core/DbProxyRegistry.ts` | 主线程端代理注册表 |
| 修改 | `src/main/database/Database.ts` | 增加线程感知逻辑 |
| 修改 | `src/main/index.ts` 或初始化文件 | 启动时初始化 DbProxyRegistry |

---

## 关键设计说明

### 为什么采用专用连接模式？

1. **性能优化**：避免每次数据库操作都进行进程间通信和连接池获取/释放
2. **1:1 映射**：每个 TaskWorker 拥有独立的数据库连接，任务执行期间独占
3. **简化事务处理**：同一连接内的事务操作更可靠

### 连接生命周期

```
Worker 线程启动
    │
    ▼
new DedicatedDbProxy(threadId) 构造函数
    │
    │ 自动存储到模块级变量 dbProxyInstance
    ▼
Database.run() 被调用
    │
    │ 检测到非主线程
    ▼
DedicatedDbProxy.getInstance() 获取代理
    │
    │ 首次调用：请求主线程分配专用连接
    ▼
主线程: DbProxyRegistry 从连接池获取专用连接
    │
    │ 代理持有连接（长期占用）
    ▼
TaskWorker 执行任务（调用 Database.run/get/all）
    │
    ├─ Database.run() → 代理发送请求 → 主线程使用同一连接执行
    ├─ Database.get() → 代理发送请求 → 主线程使用同一连接执行
    └─ Database.all() → 代理发送请求 → 主线程使用同一连接执行
    │
    ▼
TaskWorker 完成/停止
    │
    ▼
代理.releaseWorker() 请求释放连接
    │
    ▼
主线程: DbProxyRegistry 归还连接到连接池
```

---

## 风险与注意事项

1. **连接泄漏**：必须确保 TaskWorker 停止时正确释放专用连接
2. **线程安全**：DedicatedDbProxy 需要正确处理并发请求
3. **超时处理**：需要为代理请求设置超时，避免线程阻塞
4. **连接池容量**：需要根据 maxParallelImport 合理配置连接池大小

---

## 与任务队列重构计划的衔接

完成本计划后：

1. **TaskWorker 可直接调用 Database.run() 等方法**
2. **每个 TaskWorker 拥有独立的数据库连接**
3. **任务完成后自动释放连接**
4. **无需额外处理数据库操作的线程安全问题**
