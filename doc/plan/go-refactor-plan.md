# Go 主进程重构计划

## 核心目标

构建**高内聚、低耦合**的模块化系统。

| 核心手段 | 实现方式 |
|---------|---------|
| 消除重复代码 | 泛型抽象：`BaseRepository[T]` 一次编写，全项目复用 |
| 解决循环依赖 | 依赖倒置：接口定义在调用方，实现方隐式满足 |
| 业务模块独立性 | 每个模块独立演进，不影响其他模块 |
| 可测试性 | Service 层依赖接口，可轻松 Mock |

**依赖方向**（严格遵循）：

```
Service → Repository Interface ← Repository Implementation
                              ↑
                       internal/database
```

---

## 架构分层

```
┌─────────────────────────────────────────────────────────────┐
│  共享层 (pkg/model)                                         │
│  ├── 纯数据结构：API Response、Page、Example                 │
│  └── 约束接口：BaseEntity（GetID）                          │
│  ⚠️ 严禁包含任何业务逻辑或数据库依赖                         │
└─────────────────────────────────────────────────────────────┘
                              ↑
┌─────────────────────────────────────────────────────────────┐
│  基础设施层 (internal/database)                              │
│  ├── BaseRepository[T] 泛型基础仓储                         │
│  ├── Transaction 事务封装                                   │
│  └── Example 查询条件构建器                                  │
└─────────────────────────────────────────────────────────────┘
                              ↑
┌─────────────────────────────────────────────────────────────┐
│  业务层 (internal/{module})                                 │
│  ├── model.go        领域实体                               │
│  ├── repository.go   Repository 接口（嵌入 BaseRepository）  │
│  ├── repository_impl.go  数据库实现                         │
│  └── service.go     业务逻辑（依赖注入）                     │
└─────────────────────────────────────────────────────────────┘
                              ↑
┌─────────────────────────────────────────────────────────────┐
│  组装层 (cmd/server/main.go)                                │
│  └── 依赖注入：new Service(repo, externalDeps)              │
└─────────────────────────────────────────────────────────────┘
```

---

## 阶段一：基础设施层

### 1.1 项目骨架

```
my-ipc-service/
├── cmd/server/main.go
├── internal/
│   ├── config/
│   ├── database/
│   ├── error/
│   └── util/
└── pkg/model/
```

**任务**：

| # | 任务 | 产出 |
|---|------|------|
| 1 | 初始化 Go module | `go.mod` |
| 2 | 创建 `cmd/server/main.go` 入口 | 程序骨架 |
| 3 | 实现 `internal/config` 配置加载 | `config.go` |
| 4 | 实现 `pkg/model` 全局 DTO | `page.go`, `api_response.go`, `example.go` |
| 5 | 实现 `internal/error` 错误定义 | 基础错误类型 |

### 1.2 数据库基础设施

**说明**：使用 Go 原生的 `database/sql` 包自带连接池 + GORM 提供通用接口。

**任务**：

| # | 任务 | 产出 |
|---|------|------|
| 1 | 实现 `internal/database` 数据库连接 | `db.go` |
| 2 | 实现泛型基础仓储 `BaseRepository[T]` | `base_repository.go` |
| 3 | 实现事务支持 | `transaction.go` |
| 4 | 迁移表结构定义 | YAML → Go struct |

**依赖方向约束**：

```
internal/database
    ├── 可导入: pkg/model (约束接口)
    └── 严禁导入: 任何业务模块
```

**泛型基础仓储接口**：

```go
// ========== pkg/model ==========

// BaseEntity 所有领域实体必须实现
type BaseEntity interface {
    GetID() int64
}

// Example 查询条件构建器
type Example struct {
    Where   []Condition
    Or      []Condition
    OrderBy []OrderField
    Limit   int
    Offset  int
}

type Condition struct {
    Field string
    Op    string  // =, !=, >, <, >=, <=, LIKE, IN, IS_NULL, IS_NOT_NULL
    Value interface{}
}

type OrderField struct {
    Field string
    Asc   bool
}

// ========== internal/database ==========

// BaseRepository[T] 泛型基础仓储
// 实现方: internal/database/base_repository_impl.go
type BaseRepository[T BaseEntity] interface {
    Save(ctx context.Context, entity *T) error
    SaveBatch(ctx context.Context, entities []*T) error
    Delete(ctx context.Context, id int64) error
    DeleteBatch(ctx context.Context, ids []int64) error
    Update(ctx context.Context, entity *T) error
    UpdateBatch(ctx context.Context, entities []*T) error
    GetById(ctx context.Context, id int64) (*T, error)
    Get(ctx context.Context, example *Example) (*T, error)
    List(ctx context.Context, example *Example) ([]*T, error)
}
```

**验收标准**：
- [ ] `go build ./...` 编译通过
- [ ] 基础 CRUD 通过泛型实现，业务模块无需重复手写
- [ ] `Get` 和 `List` 支持 Example 动态查询

---

## 阶段二：业务模块迁移

### 2.1 模块独立性原则

**核心原则**：模块之间**不产生依赖**，每个模块只依赖通用 CRUD Repository。

```
模块A ──┐
        ├──→ Repository Interface ←─── Repository Implementation
模块B ──┘                      ↑
                           database
```

**解决方案**：

| 原 Node.js 中的依赖 | Go 迁移解决方案 |
|-------------------|---------------|
| WorkService → ReWorkTagService | 将 link/unlink 逻辑**提取到 Work 模块内部**，直接操作 re_work_tag 表 |
| WorkService → ReWorkAuthorService | 将 link/unlink 逻辑提取到 Work 模块内部 |
| WorkService → ReWorkWorkSetService | 将 link/unlink 逻辑提取到 Work 模块内部 |
| SearchService → WorkService | Search 模块**不依赖 Work 模块**，而是各自依赖相同的 Example 查询条件 |
| TaskService → PluginService | Task 模块**不依赖 Plugin 模块**，而是在 cmd/server 组装时注入插件执行器 |

**关键理解**：
- 原代码中 Service 调用其他 Service，是因为有"业务操作需要跨越模块边界"
- Go 迁移时，应该把这种**跨模块操作下沉到单一模块内部**
- 模块间不需要通信，只需要数据库层面的关联

### 2.2 模块迁移顺序

由于模块之间无依赖，**可以任意顺序迁移**。建议按复杂度从简到繁：

```
┌────────────────────────────────────────────────────────────┐
│  阶段一已建立                                             │
│  ├── pkg/model        ← 共享层（无依赖）                   │
│  ├── config           ← 无依赖                            │
│  ├── error            ← 无依赖                            │
│  └── database         ← 基础设施                          │
└────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────┐
│  阶段二：业务模块（可并行迁移，无模块间依赖）               │
│                                                            │
│  可按任意顺序迁移：                                         │
│  ├── localTag     ├── site                               │
│  ├── localAuthor  ├── author                             │
│  ├── siteTag      ├── siteAuthor                          │
│  ├── relations   ├── work                                │
│  ├── workSet     ├── search                              │
│  ├── plugin      ├── task                                │
│  ├── settings    ├── secureStorage                        │
│  ├── appLauncher ├── slot                               │
│  ├── siteBrowser ├── pluginTaskUrlListener               │
│  └── autoExplainPath                                     │
└────────────────────────────────────────────────────────────┘
```

### 2.3 单模块迁移模板

以 `author` 模块为例：

```
internal/author/
├── model.go              # 领域实体 (实现 GetID)
├── repository.go         # Repository 接口
├── repository_impl.go    # 数据库实现（嵌入 BaseRepository[T]）
└── service.go           # 业务逻辑
```

**示例：迁移 ReWorkTag 的处理方式**

原 Node.js：
```typescript
// WorkService.ts
import { ReWorkTagService } from './ReWorkTagService.ts'

class WorkService {
    linkTag(workId: number, tagIds: number[]) {
        const reWorkTagService = new ReWorkTagService()
        return reWorkTagService.link(workId, tagIds)
    }
}
```

Go 迁移（提取到 Work 模块内部）：
```go
// internal/work/service.go
package work

type Service struct {
    repo Repository
}

func (s *Service) LinkTag(ctx context.Context, workId int64, tagIds []int64) error {
    // 直接在 Work 模块内部处理 link 逻辑
    // 不依赖 relations 模块
    for _, tagId := range tagIds {
        relation := &WorkTagRelation{
            WorkId: workId,
            TagId:  tagId,
        }
        if err := s.repo.SaveRelation(ctx, relation); err != nil {
            return err
        }
    }
    return nil
}
```

### 2.4 模块迁移详情

#### localTag 模块

| 源文件 | 目标 |
|--------|------|
| `src/main-old/model/entity/LocalTag.ts` | `internal/localTag/model.go` |
| `src/main-old/dao/LocalTagDao.ts` | `internal/localTag/repository_impl.go` |
| `src/main-old/service/LocalTagService.ts` | `internal/localTag/service.go` |

#### work 模块

| 源文件 | 目标 |
|--------|------|
| `src/main-old/model/entity/Work.ts` | `internal/work/model.go` |
| `src/main-old/dao/WorkDao.ts` | `internal/work/repository_impl.go` |
| `src/main-old/service/WorkService.ts` | `internal/work/service.go` |
| `src/main-old/service/ReWorkTagService.ts` | → **合并到** `internal/work/service.go` |
| `src/main-old/service/ReWorkAuthorService.ts` | → **合并到** `internal/work/service.go` |
| `src/main-old/service/ReWorkWorkSetService.ts` | → **合并到** `internal/work/service.go` |

**关键变更**：link/unlink 逻辑从独立的 Service 合并到 Work 模块内部

#### relations 模块

**设计方案**：**不单独创建 relations 模块**

原因：
- link/unlink 逻辑已提取到各业务模块内部
- 关联表（如 re_work_tag）的操作变成业务模块的内部实现
- 不再需要独立的 relations 模块

#### search 模块

| 源文件 | 目标 |
|--------|------|
| `src/main-old/service/SearchService.ts` | `internal/search/service.go` |

**关键变更**：Search 不依赖 Work/Author 等模块，而是接收查询参数，各自查询后聚合结果

---

## 阶段三：集成与验证

### 3.1 IPC 通信桥接

**目标**：保持 API 契约与原 `MainProcessApi.ts` 一致

| # | 任务 | 说明 |
|---|------|------|
| 1 | 实现 IPC Handler 注册中心 | `cmd/server/ipc.go` |
| 2 | 保持方法名/参数/返回值一致 | `service-method` 命名 |
| 3 | 实现事件推送机制 | `ipcMain.send` / `ipcMain.on` |

### 3.2 功能验证

| # | 验证项 | 方法 |
|---|--------|------|
| 1 | 所有 IPC 方法注册 | 调用 `window.api.*` 测试 |
| 2 | 数据库 CRUD 正确 | 手动测试增删改查 |
| 3 | 任务队列正常工作 | 创建任务并执行 |
| 4 | 插件系统正常加载 | 安装并运行插件 |

---

## 阶段四：上线准备

### 4.1 性能优化

- [ ] 连接池参数调优（`SetMaxOpenConns`, `SetMaxIdleConns`）
- [ ] 批量操作优化
- [ ] 缓存策略（如需要）

### 4.2 错误处理完善

- [ ] 统一错误码定义
- [ ] 日志规范化
- [ ] 异常恢复机制

---

## 迁移检查清单

### 架构约束

- [ ] `pkg/model` 不含任何业务逻辑或数据库依赖（中立区）
- [ ] `internal/database` 不含任何业务模块引用
- [ ] **模块之间无依赖**：每个模块只依赖 Repository
- [ ] Service 层通过构造函数注入 Repository
- [ ] **跨模块操作下沉到单一模块内部**（如 link/unlink 逻辑合并到 Work 模块）

### 代码质量

- [ ] Service 层不直接 import `internal/database`
- [ ] 所有 Repository 方法接收 `context.Context`
- [ ] `config` 和 `settings` 职责区分清晰
- [ ] util 包为无状态纯函数

### 功能完整性

- [ ] 所有 IPC 方法已迁移
- [ ] 数据库表结构完整迁移
- [ ] 事务处理正确

---

## 风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| 模块间隐式依赖 | 编译失败/循环依赖 | 严格遵循"模块无依赖"原则，跨模块操作下沉 |
| 功能差异 | 用户体验不一致 | 每模块迁移后进行功能验证 |
| 泛型约束不足 | 类型安全隐患 | BaseEntity 接口约束必须实现 GetID() |
| 迁移周期长 | 技术债务积累 | 分模块快速迭代，每模块 1-2 天 |

---

## 时间估算

| 阶段 | 工期 |
|------|------|
| 阶段一：基础设施层 | 3-5 天 |
| 阶段二：业务模块（每个模块） | 1-2 天 |
| 阶段三：集成验证 | 2-3 天 |
| 阶段四：上线准备 | 1-2 天 |
| **总计** | **约 20-30 天** |

---

**最后更新**：2026-03-30
