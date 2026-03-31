# Go 主进程重构计划

## 核心目标

构建**高内聚、低耦合**的模块化系统。

| 核心手段 | 实现方式 |
|---------|---------|
| 消除重复代码 | 泛型抽象：`BaseRepository[T]` 一次编写，全项目复用实现基础CRUD |
| 模块间解耦 | 通过接口通信：调用方定义接口，实现方注入 |
| 业务模块独立性 | 每个模块独立演进，不影响其他模块 |
| 可测试性 | 模块依赖接口，可轻松 Mock |

**核心原则**：所有模块间调用都通过接口进行。

**接口设计模式**（适用于所有模块）：

```
定义接口  →  调用方定义所需接口（如 WorkService 定义 TagFinder 接口）
    ↓
实现接口  →  被调用方实现接口（如 LocalTagService 实现 TagFinder）
    ↓
注入      →  组装层（cmd/server/main.go）把实现注入给调用方
```

**禁止**：模块之间直接调用（`author` 包直接 import `work` 包）

---

## 渲染进程通信架构

### 方案：Electron + 内嵌 Web 服务器

**核心思路**：将 Electron 作为"Chromium 启动器"，Go 进程通过内嵌 HTTP 服务器处理所有业务逻辑。

```
┌─────────────────────────────────────────────────────────────┐
│  Electron 进程（仅负责窗口和生命周期）                      │
│  - 创建 BrowserWindow                                       │
│  - 管理应用生命周期                                         │
│  - 提供前端资源                                              │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTP (:34567)
┌─────────────────────────────────────────────────────────────┐
│  Go HTTP 服务器（替代原 Node.js 主进程）                    │
│  - 处理所有业务逻辑                                          │
│  - 提供 API 接口                                            │
│  - Go 进程与 Electron 进程解耦                             │
└─────────────────────────────────────────────────────────────┘
```

### 通信对比

| 原方案（Node.js） | 新方案（Go HTTP） |
|------------------|------------------|
| `ipcRenderer.invoke('xxx')` | `fetch('http://localhost:34567/api/xxx')` |
| preload 桥接 | 无需 preload |
| Electron IPC | HTTP REST API |

### Electron 启动流程

```go
// cmd/server/main.go
func main() {
    // 1. 启动 Go HTTP 服务器
    go http.ListenAndServe("127.0.0.1:34567", nil)

    // 2. Electron 加载 Go 提供的页面
    // BrowserWindow.loadURL("http://localhost:34567")
}
```

### 前端改动

渲染进程需要将 `window.api.xxx()` 调用改为 `fetch()` 请求：

```typescript
// 原来
await window.api.workQueryPage(args)

// 改为
const response = await fetch('http://localhost:34567/api/work/queryPage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args)
})
const result = await response.json()
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

### 2.1 模块间解耦原则

**核心原则**：模块之间通过接口通信，不直接依赖。

```
调用方模块A ──→ 接口（定义在A或公共层）
                  ↑
实现方模块B ──────┘（实现A所需的接口）
                    ↑
              组装层注入
```

**解决方案**：

| 原 Node.js | Go 迁移 |
|-----------|---------|
| WorkService 直接调用 ReWorkTagService | WorkService 定义 `TagRelator` 接口，ReWorkTagService 实现，组装时注入 |
| WorkService 直接调用 ReWorkAuthorService | 同上模式 |
| SearchService 直接调用 WorkService | SearchService 定义 `WorkFinder` 接口，WorkService 实现，组装时注入 |
| TaskService 直接调用 PluginService | TaskService 定义 `PluginExecutor` 接口，PluginService 实现，组装时注入 |

**接口定义位置**：
- 在调用方模块内部定义（如 `internal/work/interfaces.go`）
- 或在 `pkg/model` 中定义跨模块共享的接口

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
│  ├── siteBrowser └── pluginTaskUrlListener               │
└────────────────────────────────────────────────────────────┘
```

### 2.3 单模块迁移模板

以 `author` 模块为例：

```
internal/author/
├── model.go              # 领域实体 (实现 GetID)
├── repository.go         # Repository 接口
├── repository_impl.go    # 数据库实现（嵌入 BaseRepository[T]）
├── service.go           # 业务逻辑
└── interfaces.go        # 本模块需要的外部接口定义
```

**示例：Search 调用 Work 的处理方式**

原 Node.js：
```typescript
// SearchService.ts
import WorkService from './WorkService.ts'

class SearchService {
    searchWorks(conditions) {
        const workService = new WorkService()
        return workService.queryWorksByConditions(conditions)
    }
}
```

Go 迁移（通过接口解耦）：
```go
// internal/search/interfaces.go
package search

// WorkFinder 定义 Search 模块需要的 Work 查询能力
type WorkFinder interface {
    FindByConditions(ctx context.Context, cond *Example) ([]*Work, error)
}

// internal/search/service.go
package search

type Service struct {
    workFinder WorkFinder  // 依赖接口，不直接依赖 Work 模块
}

func NewService(finder WorkFinder) *Service {
    return &Service{workFinder: finder}
}

func (s *Service) Search(ctx context.Context, cond *Example) ([]*Work, error) {
    // 通过接口调用，不关心 Work 模块的具体实现
    return s.workFinder.FindByConditions(ctx, cond)
}
```

```go
// internal/work/repository_impl.go
package work

// 实现 Search 模块定义的 WorkFinder 接口
func (s *Service) FindByConditions(ctx context.Context, cond *Example) ([]*Work, error) {
    return s.repo.List(ctx, cond)
}
```

```go
// cmd/server/main.go - 组装层
workService := work.NewService(workRepo)
searchService := search.NewService(workService)  // 注入：WorkService 实现 WorkFinder 接口
```

### 2.4 模块迁移详情

#### site 模块

| 源文件 | 目标 |
|--------|------|
| `src/main-old/model/entity/Site.ts` | `internal/site/model.go` |
| `src/main-old/dao/SiteDao.ts` | `internal/site/repository_impl.go` |
| `src/main-old/service/SiteService.ts` | `internal/site/service.go` |

#### author 模块

| 源文件 | 目标 |
|--------|------|
| `src/main-old/model/entity/SiteAuthor.ts` | `internal/author/model.go` |
| `src/main-old/dao/SiteAuthorDao.ts` | `internal/author/repository_impl.go` |
| `src/main-old/service/SiteAuthorService.ts` | `internal/author/service.go` |

**依赖**：需通过接口获取 localAuthor 的绑定信息

#### localTag 模块

| 源文件 | 目标 |
|--------|------|
| `src/main-old/model/entity/LocalTag.ts` | `internal/localTag/model.go` |
| `src/main-old/dao/LocalTagDao.ts` | `internal/localTag/repository_impl.go` |
| `src/main-old/service/LocalTagService.ts` | `internal/localTag/service.go` |

#### localAuthor 模块

| 源文件 | 目标 |
|--------|------|
| `src/main-old/model/entity/LocalAuthor.ts` | `internal/localAuthor/model.go` |
| `src/main-old/dao/LocalAuthorDao.ts` | `internal/localAuthor/repository_impl.go` |
| `src/main-old/service/LocalAuthorService.ts` | `internal/localAuthor/service.go` |

#### siteTag 模块

| 源文件 | 目标 |
|--------|------|
| `src/main-old/model/entity/SiteTag.ts` | `internal/siteTag/model.go` |
| `src/main-old/dao/SiteTagDao.ts` | `internal/siteTag/repository_impl.go` |
| `src/main-old/service/SiteTagService.ts` | `internal/siteTag/service.go` |

#### work 模块

| 源文件 | 目标 |
|--------|------|
| `src/main-old/model/entity/Work.ts` | `internal/work/model.go` |
| `src/main-old/dao/WorkDao.ts` | `internal/work/repository_impl.go` |
| `src/main-old/service/WorkService.ts` | `internal/work/service.go` |
| `src/main-old/service/ReWorkTagService.ts` | → **合并到** `internal/work/service.go` |
| `src/main-old/service/ReWorkAuthorService.ts` | → **合并到** `internal/work/service.go` |
| `src/main-old/service/ReWorkWorkSetService.ts` | → **合并到** `internal/work/service.go` |

#### workSet 模块

| 源文件 | 目标 |
|--------|------|
| `src/main-old/model/entity/WorkSet.ts` | `internal/workSet/model.go` |
| `src/main-old/dao/WorkSetDao.ts` | `internal/workSet/repository_impl.go` |
| `src/main-old/service/WorkSetService.ts` | `internal/workSet/service.go` |

#### search 模块

| 源文件 | 目标 |
|--------|------|
| `src/main-old/service/SearchService.ts` | `internal/search/service.go` |

**接口**：Search 定义 `WorkFinder` 接口，Work 实现

#### plugin 模块

| 源文件 | 目标 |
|--------|------|
| `src/main-old/model/entity/Plugin.ts` | `internal/plugin/model.go` |
| `src/main-old/dao/PluginDao.ts` | `internal/plugin/repository_impl.go` |
| `src/main-old/service/PluginService.ts` | `internal/plugin/service.go` |
| `src/main-old/plugin/PluginManager.ts` | `internal/plugin/manager.go` |

**接口**：Task 定义 `PluginExecutor` 接口，Plugin 实现

#### task 模块

| 源文件 | 目标 |
|--------|------|
| `src/main-old/model/entity/Task.ts` | `internal/task/model.go` |
| `src/main-old/dao/TaskDao.ts` | `internal/task/repository_impl.go` |
| `src/main-old/service/TaskService.ts` | `internal/task/service.go` |
| `src/main-old/core/taskQueue.ts` | `internal/task/queue.go` |

**接口**：Task 定义 `PluginExecutor` 接口

#### settings 模块

| 源文件 | 目标 |
|--------|------|
| `src/main-old/service/SettingsService.ts` | `internal/settings/service.go` |

#### secureStorage 模块

| 源文件 | 目标 |
|--------|------|
| `src/main-old/service/SecureStorageService.ts` | `internal/secureStorage/service.go` |

#### appLauncher 模块

| 源文件 | 目标 |
|--------|------|
| `src/main-old/service/AppLauncherService.ts` | `internal/appLauncher/service.go` |

#### slot 模块

| 源文件 | 目标 |
|--------|------|
| `src/main-old/core/SlotSyncService.ts` | `internal/slot/service.go` |

#### siteBrowser 模块

| 源文件 | 目标 |
|--------|------|
| `src/main-old/core/siteBrowserManager.ts` | `internal/siteBrowser/manager.go` |

#### pluginTaskUrlListener 模块

| 源文件 | 目标 |
|--------|------|
| `src/main-old/core/pluginTaskUrlListener.ts` | `internal/pluginTaskUrlListener/manager.go` |

---

## 阶段三：集成与验证

### 3.1 HTTP API 适配

**目标**：Go HTTP 服务提供与原 IPC 方法一一对应的 API 接口

| # | 任务 | 说明 |
|---|------|------|
| 1 | 实现 HTTP Handler 注册中心 | `cmd/server/handlers.go` |
| 2 | 保持 API 方法名/参数/返回值一致 | `/api/{service}/{method}` 路径 |
| 3 | 实现事件推送机制 | Server-Sent Events (SSE) |
| 4 | 前端适配层 | 将 `fetch()` 封装回 `window.api` 接口 |

### 3.2 功能验证

| # | 验证项 | 方法 |
|---|--------|------|
| 1 | 所有 HTTP API 可调用 | `curl` 或前端 `fetch()` 测试 |
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
- [ ] **模块间通过接口通信**：不直接 import 对方模块
- [ ] 接口由调用方定义，实现方实现
- [ ] Service 层通过构造函数注入依赖

### 代码质量

- [ ] Service 层不直接 import `internal/database`
- [ ] 所有 Repository 方法接收 `context.Context`
- [ ] `config` 和 `settings` 职责区分清晰
- [ ] util 包为无状态纯函数

### 功能完整性

- [ ] 所有 HTTP API 已迁移
- [ ] 数据库表结构完整迁移
- [ ] 事务处理正确

---

## 风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| 模块间直接依赖 | 循环依赖/编译失败 | 严格遵循"接口解耦"原则 |
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
