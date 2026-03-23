# 数据库操作迁移到 Worker Threads 开发计划

## 需求概述

将数据库操作从主线程迁移到独立的 Node.js Worker Threads，解决大量数据库操作导致的 UI 卡顿问题。

## 需求详情

### 背景说明

当前架构中，所有数据库操作（包括 better-sqlite3 的同步执行）都在主线程运行，导致：
- 大规模数据查询/写入时 UI 线程被阻塞
- 用户交互响应延迟
- 应用整体流畅度下降

### 迁移目标

| 目标 | 说明 |
|------|------|
| 隔离数据库操作 | 所有 DB 操作在独立 Worker 线程执行 |
| 保持事务支持 | 现有事务机制（@Transactional / transactional）必须可用 |
| 最小化业务改动 | 仅允许涉及 Database 类的代码改动 |
| API 兼容 | 保持现有 Database 静态方法签名 |

### 技术约束

1. 使用 **Node.js Worker Threads**（不是 Web Worker 或 Child Process）
2. 必须支持 **事务操作**（当前使用 TransactionContext + SAVEPOINT）
3. 业务层代码改动仅限于涉及 Database 类的部分
4. 所有数据库操作都必须在 Worker 线程中执行

---

## 技术方案

### 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      主线程 (Main Process)                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Service     │  │ DAO         │  │ TransactionContext  │ │
│  │ (业务逻辑)   │  │ (数据访问)   │  │ (保留但简化)         │ │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
│         │                │                     │             │
│         └────────────────┼─────────────────────┘             │
│                          ▼                                   │
│              ┌───────────────────────┐                       │
│              │   Database (代理类)    │                       │
│              │   (静态方法不变)       │                       │
│              └───────────┬───────────┘                       │
│                          │ IPC                                │
└──────────────────────────┼───────────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────────┐
│                          ▼                                   │
│              ┌───────────────────────┐                       │
│              │   Database Worker      │  ◄── 独立线程        │
│              │   (Worker Threads)     │                       │
│              └───────────┬───────────┘                       │
│                          ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    Database                             │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐  │ │
│  │  │ Connection  │  │ Transaction │  │  better-sqlite3│  │ │
│  │  │ Pool        │  │ Manager     │  │  (同步执行)     │  │ │
│  │  └─────────────┘  └─────────────┘  └────────────────┘  │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### 核心组件

#### 1. DatabaseWorker (新增)

**文件**: `src/main/worker/DatabaseWorker.ts`

职责：
- 在 Worker 线程中初始化数据库连接
- 处理来自主线程的数据库操作请求
- 管理事务状态（每个 Worker 实例独立）

#### 2. DatabaseProxy (新增)

**文件**: `src/main/database/DatabaseProxy.ts`

职责：
- 替换原 Database 类的静态方法实现
- 将请求转发到 Worker 线程
- 处理响应和错误

#### 3. TransactionManager (新增)

**文件**: `src/main/worker/TransactionManager.ts`

职责：
- 在 Worker 线程中管理事务状态
- 支持嵌套事务（SAVEPOINT）
- 处理事务提交/回滚

#### 4. IPC 通信协议 (新增)

**文件**: `src/main/worker/DatabaseIpcProtocol.ts`

请求格式：
```typescript
interface DatabaseRequest {
  id: string              // 请求唯一标识
  method: 'run' | 'get' | 'all' | 'exec' | 'prepare'
  statement: string       // SQL 语句
  params?: unknown[]      // 参数
  isReadOnly: boolean     // 是否只读
}

interface DatabaseResponse {
  id: string              // 请求ID
  success: boolean        // 是否成功
  data?: unknown          // 返回数据
  error?: string          // 错误信息
}
```

### 事务处理方案

**问题**: AsyncLocalStorage 无法跨 Worker 线程传递

**解决方案**:

1. **Worker 内嵌事务管理**: 每个 DatabaseWorker 实例维护自己的事务栈
2. **主线程透明转发**: TransactionContext 保留，但简化为主动转发事务请求到 Worker
3. **事务ID追踪**: 使用唯一事务ID关联主线程和 Worker 线程的事务状态

```typescript
// 主线程 TransactionContext (简化版)
class TransactionContext {
  private static transactionId: string | null = null

  static async runInTransaction<R>(caller: string, operation: string, fn: () => Promise<R>): Promise<R> {
    const txId = generateTransactionId() // 生成事务ID

    // 通知 Worker 开始事务
    await DatabaseProxy.beginTransaction(txId)

    try {
      const result = await fn()
      // 通知 Worker 提交事务
      await DatabaseProxy.commitTransaction(txId)
      return result
    } catch (error) {
      // 通知 Worker 回滚事务
      await DatabaseProxy.rollbackTransaction(txId)
      throw error
    }
  }
}
```

### 涉及模块

| 模块 | 变更类型 | 说明 |
|------|---------|------|
| `src/main/database/Database.ts` | 修改 | 改为代理类，转发请求到 Worker |
| `src/main/database/TransactionContext.ts` | 修改 | 简化逻辑，转发事务请求 |
| `src/main/database/Transactional.ts` | 保留 | 无需改动 |
| `src/main/worker/` | 新增 | Worker 相关代码 |
| `src/main/core/connectionPool.ts` | 保留 | 不再用于业务层 DB 操作（仅初始化用） |

---

## 开发步骤

### Phase 1: 基础设施

#### 1.1 创建 Worker 入口文件

**任务**:
- 创建 `src/main/worker/DatabaseWorker.ts`
- 初始化 better-sqlite3 连接
- 搭建消息处理循环

**验收**:
- Worker 可独立运行
- 可接收并响应简单的数据库查询

#### 1.2 实现 IPC 通信层

**任务**:
- 创建 `src/main/worker/DatabaseIpcProtocol.ts`
- 实现请求/响应处理
- 添加超时处理和错误包装

**验收**:
- 主线程可发送请求到 Worker
- 可接收并解析响应

#### 1.3 创建 DatabaseProxy

**任务**:
- 创建 `src/main/database/DatabaseProxy.ts`
- 实现 Database 的静态方法代理
- 保持方法签名与原 Database 一致

**验收**:
- DatabaseProxy 方法签名与原 Database 相同
- 可转发请求到 Worker 并返回结果

### Phase 2: 事务支持

#### 2.1 实现 Worker 内事务管理

**任务**:
- 创建 `src/main/worker/TransactionManager.ts`
- 实现事务栈管理
- 支持 SAVEPOINT 嵌套事务

**验收**:
- Worker 可正确处理 BEGIN/COMMIT/ROLLBACK
- 嵌套事务使用 SAVEPOINT 正确工作

#### 2.2 修改 TransactionContext

**任务**:
- 修改 `src/main/database/TransactionContext.ts`
- 将事务请求转发到 Worker
- 保持事务边界语义

**验收**:
- @Transactional 装饰器仍能正常工作
- 嵌套事务正确处理

### Phase 3: 集成与优化

#### 3.1 替换 Database 引用

**任务**:
- 将 `src/main/database/Database.ts` 的实现替换为代理
- 确保所有 DAO 层的调用不变

**验收**:
- 现有 DAO 代码无需修改
- 所有 CRUD 操作正常工作

#### 3.2 连接池优化

**任务**:
- 考虑在 Worker 中实现连接池
- 或使用单连接 + Worker 实例池

**验收**:
- 高并发场景性能可接受
- 无连接泄漏

#### 3.3 错误处理完善

**任务**:
- 完善各类数据库错误的传递
- 主线程正确接收 Worker 抛出的异常

**验收**:
- 错误信息完整保留
- 业务层可正确处理异常

### Phase 4: 测试与验证

#### 4.1 单元测试

**任务**:
- 测试 DatabaseProxy 各方法
- 测试事务提交/回滚
- 测试嵌套事务

**验收**:
- 所有测试用例通过

#### 4.2 集成测试

**任务**:
- 使用现有 Service 进行集成测试
- 验证 @Transactional 装饰器

**验收**:
- 现有业务功能正常

#### 4.3 性能验证

**任务**:
- 对比迁移前后的 UI 响应时间
- 验证 DB 操作不再阻塞主线程

**验收**:
- UI 卡顿问题解决
- 性能无明显退化

---

## 验收标准

### 功能验收

| 验收项 | 标准 |
|--------|------|
| 基本 CRUD | 所有 DAO 的增删改查操作正常 |
| 事务提交 | @Transactional 装饰器可正常提交事务 |
| 事务回滚 | 异常时事务正确回滚 |
| 嵌套事务 | 多层事务嵌套使用 SAVEPOINT 正确工作 |
| 错误传播 | 数据库错误正确传递到业务层 |

### 性能验收

| 验收项 | 标准 |
|--------|------|
| UI 响应 | 大量 DB 操作时 UI 保持响应 |
| 查询性能 | 单次查询延迟 < 100ms（同原主线程） |
| 事务性能 | 事务开销可接受 |

### 代码验收

| 验收项 | 标准 |
|--------|------|
| 类型检查 | `yarn typecheck` 通过 |
| ESLint | `yarn lint` 无错误 |
| 格式化 | `yarn format` 无需调整 |
| 构建 | `yarn build` 成功 |

---

## 预计工作量

| 阶段 | 工作内容 | 预估复杂度 |
|------|---------|-----------|
| Phase 1 | 基础设施（Worker + IPC + Proxy） | 高 |
| Phase 2 | 事务支持 | 高 |
| Phase 3 | 集成与优化 | 中 |
| Phase 4 | 测试与验证 | 中 |

**总预估**: 这是一个中等偏高的技术重构项目，涉及架构层面的变更，建议分阶段实施，每个阶段完成后进行验证。

---

## 潜在风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| Worker 通信延迟 | 性能下降 | 考虑批量操作、优化序列化 |
| 事务状态同步 | 事务一致性 | 使用事务ID严格关联 |
| 嵌套事务复杂性 | 功能 bug | 充分测试各种嵌套场景 |
| 错误处理丢失 | 调试困难 | 完善错误包装和日志 |
