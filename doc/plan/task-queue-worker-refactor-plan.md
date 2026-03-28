!# 任务队列重构计划：多工作线程化

## 总体重构思路（核心原则）

**必须严格遵守以下原则，避免重构偏离：**

1. **任务执行逻辑整体迁移到子线程**
   - 子线程直接调用 `TaskService.startTask()`、`TaskService.pauseTask()`、`TaskService.resumeTask()`、`TaskService.stopTask()` 等方法
   - 数据库操作通过 `DbProxyRegistry` 机制在子线程中无感执行
   - **不应该**将数据库操作从子线程剥离到主线程

2. **主线程只负责任务调度、进度和状态监控**
   - 任务分配、等待队列管理
   - 进度数据收集和推送
   - 任务状态变更通知到渲染进程
   - **不参与**任务执行的业务逻辑

3. **子线程数据库操作无感化**
   - 通过 `DbProxyRegistry` 实现，Service 层代码不需要修改
   - 子线程调用 `TaskService.startTask()` 时，内部数据库操作通过消息机制在子线程中执行

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              主线程 TaskQueue                                 │
│  职责：任务调度、进度收集、状态监控、推送通知到渲染进程                          │
│  - 不执行任务执行的业务逻辑                                                   │
│  - 不操作数据库（业务逻辑）                                                   │
└──────────────────────────────────────────────────────────────────────────────┘
          │                              │                              │
          │  submitTask(task)             │  进度消息 (progress)          │ 状态变更消息
          ▼                              ▼                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         子线程 taskWorkerEntry                               │
│  职责：执行任务（调用 TaskService.startTask 等）                               │
│  - 通过 DbProxyRegistry 进行数据库操作（无感）                                │
│  - 处理流保存（流无法跨线程传递）                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

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

[non-main-thread-database-operation-plan.md](non-main-thread-database-operation-plan.md)
---

## 技术方案

### 一、整体架构

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              主线程 TaskQueue                                 │
│  - 任务调度（submitTask、waitingQueue）                                        │
│  - 进度收集（接收 progress 消息）                                             │
│  - 状态监控（taskMap、parentMap）                                             │
│  - 通知推送（→ 渲染进程）                                                    │
└──────────────────────────────────────────────────────────────────────────────┘
          │                              │                              │
          │ submitTask                   │ progress/statusChange         │
          ▼                              ▼                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          子线程 TaskWorkerEntry                               │
│  - 调用 TaskService.startTask() 执行任务                                      │
│  - 数据库操作通过 DbProxyRegistry 在本线程执行（无感）                         │
│  - 流保存（Stream 只能在同一线程消费）                                        │
│  - 发送进度/状态消息到主线程                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          │ 消息机制（parentPort.postMessage）
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         主线程 DbProxyRegistry                               │
│  - 接收子线程的数据库操作请求                                                 │
│  - 在主线程 ConnectionPool 中执行                                            │
│  - 返回结果到子线程                                                          │
└─────────────────────────────────────────────────────────────────────────────┘
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

**职责**：在 Worker 线程中执行单个任务，调用 TaskService 方法

```typescript
// src/main/core/classes/TaskWorker.ts
export class TaskWorker {
  private readonly workerId: number
  private status: WorkerStatus = WorkerStatus.IDLE
  private taskId: number | null = null
  private taskRunInstance: TaskRunInstance | null = null

  // 启动任务 - 在子线程中调用 TaskService.startTask()
  async start(taskRunInstance: TaskRunInstance): Promise<void>

  // 暂停任务 - 在子线程中调用 TaskService.pauseTask()
  async pause(): Promise<boolean>

  // 恢复任务 - 在子线程中调用 TaskService.resumeTask()
  async resume(): Promise<void>

  // 停止任务 - 在子线程中调用 TaskService.stopTask()
  async stop(): Promise<void>

  // 释放专用数据库连接（任务结束时调用）
  releaseDatabaseConnection(): void
}
```

**设计要点**：
- 在 Worker 线程中运行，使用 `workerData` 获取配置
- **直接调用 TaskService.startTask()、TaskService.pauseTask() 等方法**
- **数据库操作通过 DbProxyRegistry 在子线程中无感执行，Service 层代码不需要修改**
- 任务完成/停止时必须释放数据库连接回连接池
- 通过消息机制与主线程通信（进度推送、状态变更通知）
- **流保存（Stream pipe）仍然在子线程中执行，因为 Stream 无法跨线程传递**

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

  // 释放工作线程
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

**重要**：暂停（PAUSED）时 Worker 线程会释放回线程池，任务状态由主线程管理。

```
主线程状态管理（TaskWorkerPool）：
                    ┌─────────┐
                    │  IDLE  │◀──────────────────────┐
                    └────┬────┘                       │
                         │ submitTask                  │ releaseWorker (任务完成/停止)
                         ▼                             │
                 ┌─────────────┐                      │
      ┌──────────│   RUNNING   │                      │
      │          └──────┬──────┘                      │
      │                 │ pauseTask()                 │ task completed
      │                 │ task error                  │ task stop()
      │                 ▼                            │
      │          ┌─────────────┐                      │
      │          │   PAUSED    │─────────────────────┤
      │          └─────────────┘                      │
      │                 ▲                            │
      │                 │ resumeTask()                │
      │                 │ (分配新Worker)              │
      │                 │                            │
      │ pauseTask()     │                            │
      │ stopTask()       │                            │
      ▼                  │                            │
┌─────────────┐          │                            │
│  STOPPED    │──────────┴────────────────────────────┘
└─────────────┘

Worker 线程状态：
  - IDLE：空闲，可接受新任务
  - RUNNING：正在执行任务
  - PAUSED：任务已暂停（Worker 已释放回线程池）
  - STOPPED：任务已停止（Worker 已释放回线程池）
```

**关键设计**：
- PAUSED/STOPPED 状态的任务不占用 Worker 线程
- 恢复（resume）时，任务会被重新分配到一个空闲的 Worker
- 暂停时需要保存任务上下文（taskData），以便恢复时使用

---

## 实施步骤

### 阶段一：工作线程基础设施（2天）

1. **创建 WorkerStatusEnum**
   - 文件：`src/main/constant/WorkerStatusEnum.ts`
   - 内容：定义工作线程状态枚举

2. **创建 TaskWorkerPool 类**
   - 文件：`src/main/core/classes/TaskWorkerPool.ts`
   - 内容：工作线程池管理，任务分配，等待队列

3. **创建 TaskWorker 类**
   - 文件：`src/main/core/classes/TaskWorker.ts`
   - 内容：工作线程实现，支持 start/pause/resume/stop

### 阶段二：TaskWorkerEntry 子线程入口（2天）

1. **创建 taskWorkerEntry.ts 子线程入口**
   - 文件：`src/main/core/classes/taskWorkerEntry.ts`
   - 职责：
     - 调用 `TaskService.startTask()` 执行任务（通过 DbProxyRegistry）
     - 处理流保存（Stream 限制）
     - 发送进度/状态消息到主线程

2. **确保 DbProxyRegistry 可用**
   - 验证 `DbProxyRegistry` 能正确处理子线程的数据库操作请求
   - 确保 TaskService 方法在子线程中能正常执行

### 阶段三：TaskQueue 重构（2天）

1. **重构任务提交逻辑**
   - 使用 TaskWorkerPool 替代 `async.queue`
   - 实现任务提交流程

2. **更新进度收集**
   - 从 TaskWorker 接收 progress 消息
   - 保持现有的 500ms 推送间隔

3. **更新状态管理**
   - 从 taskMap 管理和推送状态
   - 处理 worker 的 complete/error/paused 消息

### 阶段四：控制接口适配（1天）

1. **实现任务控制方法**
   - `pauseTask(taskId)`: 找到任务所在工作线程，调用 pause
   - `stopTask(taskId)`: 找到任务所在工作线程，调用 stop
   - `resumeTask(taskId)`: 重新分配到空闲线程或等待队列

2. **确保 TaskService 方法兼容**
   - 验证 TaskService.startTask/pauseTask/resumeTask/stopTask 在子线程中正常运行

### 阶段五：测试与优化（1天）

1. **功能测试**
   - 多任务并行执行
   - 任务暂停/恢复
   - 任务停止
   - 等待队列 FIFO 顺序

2. **性能测试**
   - 评估工作线程开销
   - 评估 DbProxyRegistry 数据库操作延迟

3. **动态调整测试**
   - 动态修改 maxParallelImport
   - 工作线程数量调整

---

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|------|---------|------|
| 新增 | `src/main/constant/WorkerStatusEnum.ts` | 工作线程状态枚举 |
| 新增 | `src/main/core/classes/TaskWorker.ts` | 主线程端工作线程管理类 |
| 新增 | `src/main/core/classes/TaskWorkerPool.ts` | 工作线程池类 |
| 新增 | `src/main/core/classes/taskWorkerEntry.ts` | **子线程入口，调用 TaskService 方法执行任务** |
| 修改 | `src/main/core/classes/TaskQueue.ts` | 移除 Stream，集成 TaskWorkerPool，负责调度和进度收集 |
| 修改 | `src/main/core/taskQueue.ts` | 导出 TaskWorkerPool 单例 |

**TaskService 方法不需要修改**，它们通过 DbProxyRegistry 在子线程中无感执行：
- `TaskService.startTask()` - 在子线程中调用
- `TaskService.pauseTask()` - 在子线程中调用
- `TaskService.resumeTask()` - 在子线程中调用
- `TaskService.stopTask()` - 在子线程中调用

**注意**：以下文件由前置计划创建，本计划依赖：
- `src/main/core/classes/DedicatedDbProxy.ts` - 子线程专用数据库代理
- `src/main/core/DbProxyRegistry.ts` - 主线程端代理注册表
- `src/main/core/classes/ConnectionWorker.ts` - 数据库操作 Worker

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

### 5. 任务执行逻辑 vs 流保存

**决策**：任务执行逻辑整体在子线程，流保存在子线程

**背景**：
- Node.js Readable Stream 无法通过 `postMessage` 序列化传递给其他线程
- Worker 线程调用 `plugin.start()` 获取的流必须在 Worker 线程中消费
- TaskService.startTask() 等方法需要数据库操作，需要通过 DbProxyRegistry 在子线程执行

**关键区别**：

| 部分 | 旧架构 | 新架构 |
|------|--------|--------|
| 任务执行逻辑（调用 plugin.start()、数据库操作） | 主线程 Stream 管道 | **子线程 TaskService.startTask()** |
| 流保存（pipe to file） | 主线程 ResourceService | **子线程 TaskWorkerEntry** |

**流程**：
```
1. 主线程 → Worker：发送任务开始消息
2. Worker：调用 TaskService.startTask(task, workId, resourceWriter)
   - TaskService.startTask() 内部通过 DbProxyRegistry 执行数据库操作
   - plugin.start() 在子线程中执行，获取资源流
3. Worker：将流通过 pipe() 保存到文件
4. Worker：发送进度消息（bytesWritten）到主线程
5. Worker：发送完成/错误消息到主线程
```

**理由**：
- 保持任务执行逻辑不变（仍然调用 TaskService.startTask() 等）
- 只迁移了流保存到子线程（因为 Stream 限制）
- 子线程数据库操作通过 DbProxyRegistry 无感执行
- 主线程只负责任务调度和进度收集

### 6. 资源保存路径（resourcePath）的确定时机？

**决策**：由 TaskService.startTask() 在子线程中确定

**时机**：在 `TaskService.startTask()` 执行过程中调用 `plugin.start()` 之后

**依据**：
- `plugin.start()` 返回的 `PluginWorkResponseDTO` 包含：
  - `work` - 作品信息（含作者名）
  - `resource.filenameExtension` - 文件扩展名
  - `resource.suggestedName` - 建议的文件名
- `ResourceService.createSaveInfoFromPlugin()` 负责拼接 resourcePath

**理由**：
- resourcePath 确定逻辑本就在 ResourceService 中
- TaskService.startTask() 在子线程执行时自动在子线程中确定路径
- 保持现有代码逻辑不变

---

## 风险与注意事项

1. **避免将数据库操作从子线程剥离到主线程**
   - 这是最容易犯的错误
   - **正确做法**：TaskService.startTask() 等方法在子线程中执行，数据库操作通过 DbProxyRegistry 无感执行
   - **错误做法**：把 TaskService 方法留在主线程，只把流保存移到子线程
   - 如果发现需要大规模修改 TaskService，说明方向错了

2. **线程开销**：每个工作线程都有一定的内存和 CPU 开销，需评估合理的工作线程数量

3. **消息通信延迟**：Worker 线程与主线程之间的消息通信有延迟，需评估对任务执行的影响

4. **错误处理**：Worker 线程中的错误需要正确传播到主线程

5. **资源清理**：任务完成后需要确保资源（文件句柄、数据库连接等）正确释放

6. **状态一致性**：任务状态需要在主线程和工作线程之间保持一致

7. **暂停时 Worker 释放**：暂停的任务必须释放 Worker 回线程池，任务上下文由主线程保存
