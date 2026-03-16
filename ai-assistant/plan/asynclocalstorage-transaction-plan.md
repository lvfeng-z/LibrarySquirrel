# AsyncLocalStorage 事务实现方案

## 一、方案概述

将事务管理从「实例级别绑定」改为「全局上下文存储」，通过 AsyncLocalStorage 实现透明的事务传播，使用装饰器简化事务调用。

### 核心目标

- 事务上下文自动传播，无需显式传递 DatabaseClient 实例
- 使用装饰器/高阶函数简化事务调用
- 保持与现有实现的完全等价（SAVEPOINT 嵌套、排他锁、连接池复用）

---

## 二、架构设计

```
┌─────────────────────────────────────────────────────────────────┐
│                        调用层 (Service)                         │
│   @Transactional('保存作品')                                      │
│   async saveWork(work: Work): Promise<number> {                 │
│     await workDao.save(work)  // 无需传 db，自动获取事务连接     │
│   }                                                              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      事务拦截层                                  │
│  ┌─────────────────┐    ┌────────────────────────────────────┐ │
│  │ Transactional  │    │     TransactionContext               │ │
│  │ 装饰器/HoF      │    │  (AsyncLocalStorage 上下文管理)      │ │
│  └────────┬────────┘    └────────────────┬───────────────────┘ │
│           │                               │                     │
│           │ 开启事务                       │ 存储连接+savepoint  │
│           ▼                               ▼                     │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              TransactionManager (事务管理器)                 ││
│  │  - beginTransaction()                                        ││
│  │  - commit() / rollback()                                      ││
│  │  - createSavepoint() / releaseSavepoint()                   ││
│  │  - rollbackToSavepoint()                                     ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      连接池层 (ConnectionPool)                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    现有实现保持不变                           ││
│  │  - acquire(readOnly, weight) → Connection                   ││
│  │  - release(connection)                                       ││
│  │  - acquireLock / releaseLock (排他锁)                        ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## 三、关键组件实现

### 1. 事务上下文 (TransactionContext.ts)

```typescript
import { AsyncLocalStorage } from 'async_hooks'

interface TransactionState {
  /** 从连接池借用的写连接 */
  connection: Connection
  /** 是否为事务最外层 */
  isOutermost: boolean
  /** 保存点计数器 */
  savepointCounter: number
  /** 当前持有排他锁 */
  holdingLock: boolean
  /** 操作描述 */
  operation: string
  /** 调用者标识 */
  caller: string
}

/**
 * 事务上下文管理器
 * 使用 AsyncLocalStorage 实现跨异步边界的上下文传递
 */
class TransactionContext {
  private static asyncLocalStorage = new AsyncLocalStorage<TransactionState>()

  /**
   * 获取当前事务上下文
   */
  static getCurrentTransaction(): TransactionState | undefined {
    return this.asyncLocalStorage.getStore()
  }

  /**
   * 检查是否在事务中
   */
  static inTransaction(): boolean {
    return this.asyncLocalStorage.getStore() !== undefined
  }

  /**
   * 获取当前连接（事务中返回绑定连接，非事务返回 undefined）
   */
  static getConnection(): Connection | undefined {
    return this.asyncLocalStorage.getStore()?.connection
  }

  /**
   * 同步获取连接（DAO 层调用）
   * @throws Error 如果不在事务中且需要事务连接
   */
  static getConnectionOrThrow(): Connection {
    const conn = this.getConnection()
    if (!conn) {
      throw new Error('Not in transaction context')
    }
    return conn
  }

  /**
   * 执行事务
   */
  static async runInTransaction<R>(caller: string, operation: string, fn: () => Promise<R>): Promise<R> {
    const store = this.asyncLocalStorage.getStore()

    // 嵌套事务：已有上下文，直接执行
    if (store) {
      // 创建保存点
      const savepointName = `sp${store.savepointCounter++}`
      const conn = store.connection

      try {
        conn.connection.exec(`SAVEPOINT ${savepointName}`)
        const result = await fn()
        conn.connection.exec(`RELEASE ${savepointName}`)
        store.savepointCounter--
        return result
      } catch (error) {
        conn.connection.exec(`ROLLBACK TO SAVEPOINT ${savepointName}`)
        store.savepointCounter--
        throw error
      }
    }

    // 最外层事务：创建新上下文
    const pool = getConnectionPool()
    const connection = await pool.acquire(false, RequestWeight.HIGH)

    // 注册 REGEXP 函数（保持现有行为）
    connection.connection.function('REGEXP', (pattern, string) => {
      const regex = new RegExp(pattern as string)
      return regex.test(string as string) ? 1 : 0
    })

    // 获取排他锁
    await pool.acquireLock(caller, operation)

    const newState: TransactionState = {
      connection,
      isOutermost: true,
      savepointCounter: 0,
      holdingLock: true,
      operation,
      caller
    }

    try {
      connection.connection.exec('BEGIN')

      const result = await this.asyncLocalStorage.run(newState, fn)

      connection.connection.exec('COMMIT')
      return result
    } catch (error) {
      connection.connection.exec('ROLLBACK')
      throw error
    } finally {
      pool.releaseLock(caller)
      pool.release(connection)
    }
  }
}

export { TransactionContext, TransactionState }
```

### 2. 事务装饰器 (Transactional.ts)

```typescript
import { TransactionContext } from './TransactionContext'

interface TransactionDecoratorOptions {
  /** 操作描述 */
  operation: string
  /** 调用者标识（默认使用类名） */
  caller?: string
}

/**
 * 事务装饰器
 * 使用示例：
 *
 * class WorkService extends BaseService {
 *   @Transactional({ operation: '保存作品' })
 *   async saveWork(work: Work): Promise<number> {
 *     // 自动在事务中执行
 *     return await this.dao.save(work)
 *   }
 * }
 */
function Transactional(options: string | TransactionDecoratorOptions) {
  const config = typeof options === 'string' ? { operation: options } : options

  return function <T extends (...args: any[]) => Promise<any>>(target: T, context: ClassMethodDecoratorContext) {
    const originalMethod = target

    return async function (this: any, ...args: Parameters<T>): Promise<ReturnType<T>> {
      const caller = config.caller || target.prototype.constructor.name

      return TransactionContext.runInTransaction(caller, config.operation, () => originalMethod.apply(this, args))
    } as T
  }
}

/**
 * 高阶函数方式（兼容现有代码风格）
 *
 * 使用示例：
 *
 * class WorkService extends BaseService {
 *   async saveWork(work: Work): Promise<number> {
 *     return transactional('保存作品', async () => {
 *       return await this.dao.save(work)
 *     })
 *   }
 * }
 */
async function transactional<R>(operation: string, fn: () => Promise<R>, caller?: string): Promise<R> {
  return TransactionContext.runInTransaction(caller || 'anonymous', operation, fn)
}

export { Transactional, transactional, TransactionDecoratorOptions }
```

### 3. DAO 层改造 (DatabaseAccess.ts)

创建新的数据库访问入口，替代直接使用 DatabaseClient：

```typescript
import { TransactionContext } from './TransactionContext'
import { getConnectionPool } from './ConnectionPool'
import { RequestWeight } from './ConnectionPool'

/**
 * 数据库访问入口
 * DAO 层通过此类获取数据库连接
 *
 * 使用示例：
 *
 * class WorkDao extends BaseDao {
 *   async save(entity: Work): Promise<number> {
 *     // 自动检测是否在事务中
 *     return Database.run(
 *       'INSERT INTO work (...) VALUES (...)',
 *       params
 *     )
 *   }
 * }
 */
class Database {
  /**
   * 执行写操作 (INSERT/UPDATE/DELETE)
   */
  static async run<BindParameters extends unknown[], Result = unknown>(
    statement: string,
    ...params: BindParameters
  ): Promise<Database.RunResult> {
    const conn = this.acquireConnection(false)
    try {
      return conn.connection.prepare(statement).run(...params)
    } finally {
      // 非事务中，执行完立即释放连接
      if (!TransactionContext.inTransaction()) {
        getConnectionPool().release(conn)
      }
    }
  }

  /**
   * 执行读操作 - 单条
   */
  static async get<BindParameters extends unknown[], Result = unknown>(
    statement: string,
    ...params: BindParameters
  ): Promise<Result | undefined> {
    const conn = this.acquireConnection(true)
    try {
      return conn.connection.prepare(statement).get(...params) as Result | undefined
    } finally {
      if (!TransactionContext.inTransaction()) {
        getConnectionPool().release(conn)
      }
    }
  }

  /**
   * 执行读操作 - 列表
   */
  static async all<BindParameters extends unknown[], Result = unknown>(
    statement: string,
    ...params: BindParameters
  ): Promise<Result[]> {
    const conn = this.acquireConnection(true)
    try {
      return conn.connection.prepare(statement).all(...params) as Result[]
    } finally {
      if (!TransactionContext.inTransaction()) {
        getConnectionPool().release(conn)
      }
    }
  }

  /**
   * 获取连接
   * - 事务中：返回绑定到上下文的连接
   * - 非事务：从连接池借用
   * @private
   */
  private static acquireConnection(readOnly: boolean): Connection {
    // 事务中：使用上下文绑定的连接
    if (TransactionContext.inTransaction()) {
      const ctxConn = TransactionContext.getConnection()
      if (ctxConn) return ctxConn
    }

    // 非事务：从连接池借用
    // 注意：readOnly 在事务中会被忽略，强制使用写连接
    const pool = getConnectionPool()
    const conn =
      readOnly && !TransactionContext.inTransaction() ? pool.acquire(true, RequestWeight.LOW) : pool.acquire(false, RequestWeight.LOW)

    // 注册 REGEXP 函数
    conn.then((c) => {
      c.connection.function('REGEXP', (pattern, string) => {
        const regex = new RegExp(pattern as string)
        return regex.test(string as string) ? 1 : 0
      })
    })

    return conn as any // 简化处理，实际需处理 Promise<Connection>
  }
}

export { Database }
```

### 4. 现有 DatabaseClient 兼容层

保留现有 DatabaseClient 供迁移期间使用：

```typescript
/**
 * 兼容层：改造现有 DatabaseClient
 * 使其支持从 TransactionContext 获取连接
 */
export default class DatabaseClient {
  // ... 保留现有属性 ...

  private async acquire(readOnly: boolean): Promise<Connection> {
    // 优先从事务上下文获取
    const ctxConn = TransactionContext.getConnection()
    if (ctxConn) {
      return ctxConn
    }

    // 无事务上下文，使用原有逻辑
    return this.originalAcquire(readOnly)
  }

  // 保留原有实现为 originalAcquire
  private async originalAcquire(readOnly: boolean): Promise<Connection> {
    // ... 原有代码 ...
  }
}
```

---

## 四、调用方式对比

| 场景               | 当前实现                                           | 新方案                                                                                  |
| ------------------ | -------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Service 层事务** | `this.db.transaction(async () => { ... }, '操作')` | `@Transactional({ operation: '操作' })` 或 `transactional('操作', async () => { ... })` |
| **DAO 层查询**     | `const db = this.acquire(); db.run('SELECT...')`   | `Database.run('SELECT...')` (自动检测事务)                                              |
| **嵌套事务**       | 自动使用 SAVEPOINT                                 | 自动使用 SAVEPOINT                                                                      |
| **连接释放**       | 显式 `db.release()`                                | 自动管理                                                                                |

---

## 五、等价性保证

| 现有特性             | 新方案实现                                       |
| -------------------- | ------------------------------------------------ |
| SAVEPOINT 嵌套事务   | `TransactionContext.runInTransaction()` 内部处理 |
| 排他锁 (acquireLock) | 事务入口处统一加锁，finally 释放                 |
| 连接池复用           | 继续使用现有 ConnectionPool                      |
| REGEXP 函数注册      | 在获取连接时统一注册                             |
| 读/写连接分离        | `acquireConnection(readOnly)` 参数保留           |
| 事务内读写同一连接   | 通过 `TransactionContext.getConnection()` 保证   |

---

## 六、迁移路径建议

### 阶段一：基础设施

- 创建 `TransactionContext.ts` - 事务上下文管理
- 创建 `Transactional.ts` - 装饰器和高阶函数

### 阶段二：入口改造

- 创建 `Database.ts` - 新的数据库访问入口
- 改造 `DatabaseClient` 支持从上下文获取连接

### 阶段三：Service 层迁移

- 逐步将 Service 层从 `this.db.transaction()` 迁移到 `@Transactional()`

### 阶段四：DAO 层迁移

- 改造 BaseDao/BaseService，添加 Database 入口作为可选依赖

### 阶段五：清理

- 移除旧代码，完全切换到新架构

---

## 七、当前实现 vs 新方案对比

| 维度             | 当前实现                                                                        | 新方案                                       |
| ---------------- | ------------------------------------------------------------------------------- | -------------------------------------------- |
| **连接管理**     | 实例级别绑定 (`readingConnection`/`writingConnection` 属于 DatabaseClient 实例) | 全局上下文绑定 (通过 AsyncLocalStorage 存储) |
| **事务传播**     | 显式传递 DatabaseClient 实例 (`fn(this)`)                                       | 自动通过 AsyncLocalStorage 上下文传播        |
| **事务状态**     | 存储在 DatabaseClient 实例内部 (`inTransaction`, `savepointCounter`)            | 存储在 AsyncLocalStorage 中                  |
| **嵌套事务**     | 显式使用 SQL `SAVEPOINT` 实现                                                   | 可通过嵌套的 AsyncLocalStorage 实现          |
| **锁机制**       | 排他锁 (`acquireLock`/`releaseLock`)                                            | 事务入口统一管理                             |
| **耦合性**       | 事务与 DatabaseClient 紧耦合                                                    | 通过装饰器解耦                               |
| **调用方式**     | 需要显式传参 `fn(this)`                                                         | 无需传参，自动获取                           |
| **连接生命周期** | 每个 DatabaseClient 实例持有一个读写连接                                        | 临时借用连接，用完归还                       |

---

## 八、风险与注意事项

1. **AsyncLocalStorage 兼容性**：Node.js 12+ 支持，需确认目标环境
2. **性能开销**：每次事务操作都有额外的上下文查找，但开销极小
3. **调试复杂性**：事务边界不如显式调用清晰，建议添加日志
4. **错误传播**：嵌套事务中错误需正确传播，避免资源泄漏
