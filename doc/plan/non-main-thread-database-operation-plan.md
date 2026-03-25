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

1. **对子线程无感**：子线程只需调用 `Database.run()` 等方法，无需知道自己在子线程，`Database.ts` 自动处理线程判断和路由
2. **通用设计**：不专为 TaskWorker 设计，任何 Worker 线程都能使用同一套数据库访问方式
3. **按需获取连接**：每次数据库操作时从连接池获取连接，操作完成后立即释放（而非长期占用）
4. **显式释放**：连接在单次数据库操作完成后即归还到连接池（而非等待任务结束）

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
1. 子线程调用 Database.run() → Database.ts 自动检测到非主线程
2. 请求转发到主线程 → 主线程从连接池获取连接 → 执行数据库操作
3. 操作完成 → 立即归还连接到连接池 → 返回结果到子线程
4. 子线程无感知，与在主线程调用 Database.run() 方式完全相同
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

1. **子线程无感知调用 Database**：TaskWorker 只需调用 `Database.run()`，无需关心线程判断
2. **通用设计**：任何 Worker 线程都能使用同一套数据库访问方式，不限于 TaskWorker
3. **按需连接**：每次数据库操作时获取连接，完成后立即释放，无需管理连接生命周期

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

  // 获取数据库连接 Worker（每次操作时获取）
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
      // 非主线程：通过代理获取连接（按需获取）
      const proxy = this.getDbProxy()
      if (!proxy) {
        throw new Error('DbProxy 未初始化')
      }
      return proxy.acquireWorker()
    }
  }

  // 释放数据库连接 Worker（每次操作后释放）
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
      // 非主线程：通过代理释放连接（每次操作后立即释放）
      const proxy = this.getDbProxy()
      if (proxy) {
        proxy.releaseWorker(worker)
      }
    }
  }

  // 执行数据库操作（每次操作自动获取和释放连接）
  static async run(statement: string, params?: unknown[]): Promise<unknown> {
    const worker = await this.acquireWorker()
    try {
      const result = await worker.run(statement, params)
      return result
    } finally {
      this.releaseWorker(worker)  // 操作完成后立即释放
    }
  }
}
```

**关键改进**：
- 子线程调用 `Database.run()` 时自动获取连接
- 操作完成后在 `finally` 中立即释放连接
- 子线程无需管理连接生命周期，与主线程调用方式完全相同

#### 4. DbProxy 设计（关键组件）

**核心职责**：在每个 Worker 线程中作为数据库操作的代理，负责将请求转发到主线程

**重要**：
- DbProxy 在**每个 Worker 线程中是单例**（通过 `getInstance()` 获取）
- 不同 Worker 线程拥有不同的 DbProxy 实例
- 每次数据库操作时获取连接，完成后立即释放（不长期持有）
- Worker 线程启动时自动初始化，Database.ts 无需传递 threadId

```typescript
// src/main/core/classes/DbProxy.ts

interface DbRequest {
  requestId: string
  threadId: number  // 线程ID，用于主线程区分来源
  type: 'run' | 'get' | 'all' | 'exec'
  statement?: string
  params?: unknown[]
}

interface DbResponse {
  requestId: string
  success: boolean
  result?: unknown
  error?: string
}

// 模块级变量：存储当前线程的代理实例
let dbProxyInstance: DbProxy | null = null

/**
 * 数据库代理
 *
 * 使用方式：
 * 1. Worker 线程启动时：new DbProxy() 自动初始化
 * 2. Database.ts 调用：DbProxy.getInstance() 获取当前线程的代理
 *
 * 特点：每次请求时获取连接，完成后立即释放，不长期占用
 */
export class DbProxy {
  private readonly threadId: number  // 当前线程ID
  private pendingRequests: Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void }> = new Map()

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
  static getInstance(): DbProxy | null {
    return dbProxyInstance
  }

  // 获取线程ID
  getThreadId(): number {
    return this.threadId
  }

  // 执行数据库操作（每次操作自动获取和释放连接）
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
import { DbProxy } from './DbProxy.ts'

// 创建代理实例，自动存储到模块级变量
new DbProxy(workerData.threadId)


// ===== Worker 线程中使用 Database =====
// 与主线程调用方式完全相同，无需感知线程差异
import { Database } from '../../database/Database.ts'

const result = await Database.run('SELECT * FROM task WHERE id = ?', [taskId])
```

#### 5. DbProxyRegistry 设计

**核心职责**：在主线程中接收子线程的数据库操作请求，每次请求时从连接池获取连接，执行完成后立即释放

```typescript
// src/main/core/DbProxyRegistry.ts

/**
 * 数据库代理注册表
 *
 * 核心功能：
 * 1. 接收子线程的数据库操作请求
 * 2. 每次请求时从连接池获取连接
 * 3. 执行数据库操作
 * 4. 操作完成后立即归还连接到连接池（不长期占用）
 *
 * 关键：每次操作都是独立的获取/执行/释放流程
 */

export class DbProxyRegistry {
  private static initialized: boolean = false

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
        case 'run':
        case 'get':
        case 'all':
        case 'exec': {
          // 每次操作：获取连接 → 执行 → 释放
          const worker = await this.acquireConnection()
          try {
            const result = await this.executeDbOperation(worker, message)
            process.parentPort?.postMessage({
              requestId,
              success: true,
              result
            })
          } finally {
            // 操作完成后立即释放连接
            this.releaseConnection(worker)
          }
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

  private static async acquireConnection(): Promise<ConnectionWorker> {
    const pool = getConnectionPool()
    const worker = await pool.acquire(RequestWeight.HIGH)
    return worker
  }

  private static releaseConnection(worker: ConnectionWorker): void {
    const pool = getConnectionPool()
    pool.release(worker.getIndex())
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

  // 清理所有资源（应用关闭时）
  static async cleanup(): Promise<void> {
    // 无需清理，因为每次操作后立即释放
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
| 新增 | `src/main/core/classes/DbProxy.ts` | 子线程数据库代理（每次操作获取/释放连接） |
| 新增 | `src/main/core/DbProxyRegistry.ts` | 主线程端代理注册表 |
| 修改 | `src/main/database/Database.ts` | 增加线程感知逻辑 |
| 修改 | `src/main/index.ts` 或初始化文件 | 启动时初始化 DbProxyRegistry |

---

## 关键设计说明

### 为什么采用按需获取连接模式？

1. **通用性**：不限于 TaskWorker，任何 Worker 线程都能使用
2. **子线程无感**：子线程只需调用 `Database.run()`，无需知道自己在子线程
3. **资源高效**：每次操作后立即释放连接，连接池利用率更高
4. **简化管理**：无需在子线程中管理连接的长期持有和释放

### 连接生命周期

```
Worker 线程启动
    │
    ▼
new DbProxy(threadId) 构造函数
    │
    │ 自动存储到模块级变量 dbProxyInstance
    ▼
Database.run() 被调用
    │
    │ 检测到非主线程
    ▼
DbProxy.sendRequest() 发送请求到主线程
    │
    ▼
主线程: DbProxyRegistry 从连接池获取连接
    │
    ▼
执行数据库操作
    │
    ▼
归还连接到连接池（每次操作后立即释放）
    │
    ▼
返回结果到子线程
    │
    ▼
（每次 Database.run() 调用都重复上述流程）
```

---

## 风险与注意事项

1. **性能开销**：每次操作都需要进程间通信，但连接复用可缓解
2. **事务处理**：单次操作内的事务没问题，跨多次操作的事务需要特殊处理
3. **连接池容量**：需要合理配置连接池大小，支持并发操作

---

## 与任务队列重构计划的衔接

完成本计划后：

1. **Worker 线程无感知调用 Database**：TaskWorker 只需调用 `Database.run()`，无需关心线程判断
2. **通用设计**：任何 Worker 线程都能使用同一套数据库访问方式
3. **按需连接**：每次数据库操作时获取连接，完成后立即释放
4. **简化 TaskWorker 实现**：无需管理连接生命周期
