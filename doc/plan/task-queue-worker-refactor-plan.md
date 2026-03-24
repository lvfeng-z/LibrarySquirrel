# 任务队列重构计划：多工作线程化

## 背景与目标

### 当前实现

当前任务队列采用 **Node.js Stream 管道**流式处理模式：

```
TaskQueueEntrance → WorkInfoSaveStream → ResourceSaveStream → TaskPersistStream
```

- 并发数由 `maxParallelImport` 控制（默认3），通过 `async.queue` 实现
- `TaskRunInstance` 封装任务运行实例
- 任务之间通过 Stream 管道传递，耦合度较高

### 重构目标

1. **真正的多工作线程**：每个任务由独立的工作线程执行
2. **任务分配机制**：空闲线程优先分配，无空闲时进入等待队列（FIFO）
3. **细粒度控制**：每个工作线程支持独立的开始、暂停、停止操作
4. **任务绑定线程**：任务在完成/暂停/停止/异常前，始终由当前工作线程处理

### 前置条件

本计划依赖 **非主线程数据库操作实现计划**，需要先完成以下改造：

- `Database.ts` 支持线程感知，自动选择数据库访问路径
- 创建 `DedicatedDbProxy` 和 `DbProxyRegistry`，允许 Worker 线程通过专用连接执行数据库操作

**关键点**：每个 TaskWorker 在执行任务期间独占一个数据库连接，任务完成后释放回连接池

---

## 技术方案

### 一、整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         主线程                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │   TaskQueue     │  │ TaskWorkerPool  │  │  Database    │  │
│  │  (任务调度)      │──│  (固定线程池)    │──│  (数据库)    │  │
│  └─────────────────┘  └─────────────────┘  └──────────────┘  │
│         │                     │                   │             │
└────────-|---------------------|-------------------|─────────────┘
          │                     │                   │
    ┌─────▼─────┐         ┌─────▼─────┐              │
    │ 任务入口  │         │Worker0    │              │
    │ pushTask  │         │Worker1    │              │
    └───────────┘         │Worker2    │              │
                          └───────────┘
```

### 二、核心组件

#### 1. WorkerStatusEnum（工作线程状态枚举）

```typescript
// src/main/constant/WorkerStatusEnum.ts
export enum WorkerStatus {
  IDLE = 0,      // 空闲
  RUNNING = 1,   // 运行中
  PAUSED = 2,    // 已暂停
  STOPPED = 3    // 已停止
}
```

#### 2. TaskWorker（工作线程）

**职责**：在 Worker 线程中执行单个任务

```typescript
// src/main/core/classes/TaskWorker.ts
export class TaskWorker {
  private readonly workerId: number
  private status: WorkerStatus = WorkerStatus.IDLE
  private taskId: number | null = null
  private taskRunInstance: TaskRunInstance | null = null

  // 启动任务
  async start(taskRunInstance: TaskRunInstance): Promise<void>

  // 暂停任务
  async pause(): Promise<boolean>

  // 恢复任务
  async resume(): Promise<void>

  // 停止任务
  async stop(): Promise<void>

  // 释放专用数据库连接（任务结束时调用）
  releaseDatabaseConnection(): void
}
```

**设计要点**：
- 在 Worker 线程中运行，使用 `workerData` 获取配置
- 直接调用 `Database.run()` 等方法（依赖前置计划）
- 每个 TaskWorker 拥有专属的数据库连接（通过 DedicatedDbProxy）
- 任务完成/停止时必须释放数据库连接回连接池
- 通过消息机制与主线程通信（进度推送、状态变更通知）

#### 3. TaskWorkerPool（工作线程池）

```typescript
// src/main/core/classes/TaskWorkerPool.ts
export class TaskWorkerPool {
  private maxWorkers: number
  private workers: Map<number, TaskWorker>      // workerId -> TaskWorker
  private idleWorkers: Set<number>              // 空闲工作线程集合
  private waitingQueue: TaskRunInstance[]       // FIFO 等待队列
  private taskToWorkerMap: Map<number, number>  // taskId -> workerId 映射

  // 初始化工作线程池
  async initialize(): Promise<void>

  // 提交任务（自动分配或排队）
  submitTask(task: TaskRunInstance): void

  // 释放工作线程（同时释放数据库连接）
  releaseWorker(workerId: number): void

  // 暂停指定任务
  pauseTask(taskId: number): Promise<boolean>

  // 停止指定任务
  stopTask(taskId: number): Promise<void>

  // 恢复指定任务
  resumeTask(taskId: number): Promise<void>

  // 动态调整最大工作线程数
  updateMaxWorkers(count: number): void
}
```

**设计要点**：
- 每个 TaskWorker 对应一个专用数据库连接（由 DedicatedDbProxy 管理）
- 释放工作线程时，同时触发数据库连接的释放
- `taskToWorkerMap` 用于快速定位任务所在的工作线程

---

### 三、任务执行流程

#### 1. 任务提交流程

```
TaskService.pushBatch(tasks)
    ↓
TaskQueue.pushBatch(tasks)
    ↓
TaskWorkerPool.submitTask(task)
    ↓
┌─ 有空闲Worker? ─┐
│                 │
├─ YES ──────────▶ 分配给空闲Worker执行
│                 │
└─ NO ──────────▶ 加入 waitingQueue (FIFO)
```

#### 2. 任务状态转换

```
                    ┌─────────┐
                    │  IDLE  │◀──────────────────────┐
                    └────┬────┘                       │
                         │ submitTask                  │ releaseWorker
                         ▼                             │
                  ┌─────────────┐                      │
       ┌──────────│   RUNNING   │                      │
       │          └──────┬──────┘                      │
       │                 │ task completed             │
       │                 │ task error                 │
       │                 ▼                            │
       │          ┌─────────────┐                      │
       │          │   PAUSED    │                      │
       │          └──────┬──────┘                      │
       │ pauseTask      │ resumeTask                  │
       │ stopTask       ▼                             │
       │          ┌─────────────┐                      │
       └─────────▶│  STOPPED    │─────────────────────┘
                  └─────────────┘
```

---

## 实施步骤

### 阶段一：工作线程基础设施（2天）

1. **创建 WorkerStatusEnum**
   - 文件：`src/main/constant/WorkerStatusEnum.ts`
   - 内容：定义工作线程状态枚举

2. **创建 TaskWorker 类**
   - 文件：`src/main/core/classes/TaskWorker.ts`
   - 内容：工作线程实现，支持 start/pause/resume/stop
   - 注意：依赖前置计划完成后的 Database.ts

3. **创建 TaskWorkerPool 类**
   - 文件：`src/main/core/classes/TaskWorkerPool.ts`
   - 内容：工作线程池管理，任务分配，等待队列

### 阶段二：TaskQueue 重构（2天）

1. **移除 Stream 管道**
   - 删除 `TaskQueueEntrance`、`WorkInfoSaveStream`、`ResourceSaveStream`、`TaskPersistStream`
   - 保留 `TaskRunInstance` 和相关类

2. **集成 TaskWorkerPool**
   - 替换现有的 `async.queue` 并发控制
   - 实现任务提交流程

3. **更新任务进度推送**
   - 从 taskMap 改为从各 TaskWorker 获取状态
   - 保持现有的 500ms 推送间隔

### 阶段三：控制接口适配（1天）

1. **实现任务控制方法**
   - `pauseTask(taskId)`: 找到任务所在工作线程，调用 pause
   - `stopTask(taskId)`: 找到任务所在工作线程，调用 stop
   - `resumeTask(taskId)`: 重新分配到空闲线程或等待队列

2. **更新 TaskService**
   - 适配新的任务控制接口

### 阶段四：测试与优化（1天）

1. **功能测试**
   - 多任务并行执行
   - 任务暂停/恢复
   - 任务停止
   - 等待队列 FIFO 顺序

2. **性能测试**
   - 评估工作线程开销
   - 评估数据库操作延迟

3. **动态调整测试**
   - 动态修改 maxParallelImport
   - 工作线程数量调整

---

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|------|---------|------|
| 新增 | `src/main/constant/WorkerStatusEnum.ts` | 工作线程状态枚举 |
| 新增 | `src/main/core/classes/TaskWorker.ts` | 工作线程类（含数据库连接释放） |
| 新增 | `src/main/core/classes/TaskWorkerPool.ts` | 工作线程池类 |
| 修改 | `src/main/core/classes/TaskQueue.ts` | 移除 Stream，集成 TaskWorkerPool |
| 修改 | `src/main/core/taskQueue.ts` | 导出 TaskWorkerPool 单例 |
| 修改 | `src/main/service/TaskService.ts` | 适配新的任务控制接口 |

**注意**：以下文件由前置计划创建，本计划依赖：
- `src/main/core/classes/DedicatedDbProxy.ts` - 子线程专用数据库代理
- `src/main/core/DbProxyRegistry.ts` - 主线程端代理注册表

---

## 关键设计决策

### 1. 是否使用 Worker Threads？

**决策**：使用 Worker Threads

**理由**：
- 任务执行涉及大量数据库操作、文件 IO、插件调用，使用主线程会有阻塞风险
- Worker Threads 提供更好的隔离性
- 前置计划已解决 Worker 线程的数据库访问问题

### 2. 等待队列策略？

**决策**：FIFO（先进先出）

**理由**：符合用户预期，先进入的任务先执行

### 3. 如何处理任务超时？

**决策**：保持现有机制，由插件控制

**理由**：现有的超时处理逻辑由各插件实现，重构不应改变这一行为

### 4. 固定线程池大小？

**决策**：固定大小 = `maxParallelImport`

**理由**：
- 与现有配置保持一致
- 避免资源竞争
- 简化资源管理

---

## 风险与注意事项

1. **线程开销**：每个工作线程都有一定的内存和 CPU 开销，需评估合理的工作线程数量
2. **消息通信延迟**：Worker 线程与主线程之间的消息通信有延迟，需评估对任务执行的影响
3. **错误处理**：Worker 线程中的错误需要正确传播到主线程
4. **资源清理**：任务完成后需要确保资源（文件句柄、数据库连接等）正确释放
5. **状态一致性**：任务状态需要在主线程和工作线程之间保持一致
