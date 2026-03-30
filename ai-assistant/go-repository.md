# Go 主进程重构规范

## 1. 核心目标

- **消除循环依赖**：通过依赖倒置原则，确保业务模块之间、业务与数据库之间解耦。
- **逻辑解耦**：明确区分"业务逻辑"（Service）与"数据存取逻辑"（Repository）。
- **可测试性**：通过接口抽象，使得 Service 层可以轻松地通过 Mock 进行单元测试。
- **渐进式迁移**：从 `src/main-old/` 的 Node.js 代码逐步迁移到 Go，保持功能一致。

---

## 2. 项目目录结构

```
my-ipc-service/
├── cmd/
│   └── server/
│       └── main.go              # 程序入口：组装依赖并启动服务
├── internal/
│   ├── config/                  # [基础设施] 程序配置 (viper/env)
│   ├── database/                # [基础设施] 数据库连接、迁移、事务管理
│   │
│   # --- 业务领域模块 ---
│   ├── site/                    # 站点
│   │   ├── model.go            # 领域实体
│   │   ├── repository.go       # 数据存取接口
│   │   ├── repository_impl.go  # 数据库实现
│   │   └── service.go          # 业务逻辑
│   ├── author/                  # 作者
│   ├── localTag/                # 本地标签
│   ├── localAuthor/             # 本地作者
│   ├── work/                    # 作品
│   ├── workSet/                 # 作品集
│   ├── relations/               # 作品关联 (tag/author/workSet)
│   │   ├── interfaces.go        # 关联操作接口
│   │   ├── tag/                # work-tag 关系
│   │   ├── author/              # work-author 关系
│   │   └── workSet/            # work-workSet 关系
│   │
│   # --- 基础设施/功能模块 ---
│   ├── plugin/                  # 插件系统
│   ├── task/                    # 后台任务/调度
│   ├── search/                  # 搜索逻辑
│   ├── settings/                # 业务设置
│   ├── secureStorage/           # 密钥/安全存储
│   ├── appLauncher/             # 外部应用启动
│   ├── autoExplainPath/         # 自动解释路径
│   ├── slot/                    # Slot 同步
│   ├── siteBrowser/             # 站点浏览器
│   ├── pluginTaskUrlListener/   # 插件任务 URL 监听
│   │
│   # --- 公共基础设施 ---
│   ├── error/                   # 自定义错误类型
│   └── util/                   # 纯工具函数 (无状态)
├── pkg/
│   └── model/                   # 全局共享 DTO (PageRequest, APIResponse 等)
└── go.mod
```

---

## 3. 模块命名与循环依赖风险

### ⚠️ relations 模块特别说明

`relations` 模块负责处理作品与其他实体的关联关系（tag、author、workSet）。

**为什么不会循环依赖**：
- `WorkService` 依赖 `relations`（调用 link/unlink 等方法）
- 但 `relations` 内部三个子包（tag、author、workSet）之间**没有相互调用**
- 因此 `relations` 是叶子节点，不会形成 A→B→A 循环

**结构建议**：
```
internal/relations/
├── interfaces.go     # 定义 RelationOperator 接口
├── tag/             # work-tag 关系实现
├── author/          # work-author 关系实现
└── workSet/         # work-workSet 关系实现
```

### 🔴 禁止的模块依赖

以下依赖方向是**禁止**的，会产生循环依赖：

| 模块 A | 禁止依赖 | 原因 |
|--------|----------|------|
| `author` | `work` | work 已经依赖 author |
| `localTag` | `work` | work 已经依赖 localTag |
| `relations` | 其他业务模块 | relations 是叶子节点 |

---

## 4. database 包的范围

**职责范围**（必须）：
- 数据库连接初始化
- 连接池管理
- 迁移脚本执行
- 事务上下文管理

**禁止行为**：
- ❌ 业务层直接 import `internal/database` 写 SQL
- ❌ 在 `database` 包内实现业务逻辑

**正确做法**：
```
业务模块 (如 author)
  ↓ 依赖接口
author/repository.go (接口定义)
  ↓ 实现
author/repository_impl.go (import database, 实现 SQL)
```

---

## 5. model 的边界划分

### pkg/model - 全局共享 DTO

存放跨模块共享的数据传输对象：
- API 响应格式 (`APIResponse<T>`)
- 全局分页结构 (`PageRequest`, `PageResponse`)
- 全局枚举常量

**原则**：这些是不涉及业务逻辑的纯数据结构。

### internal/{module}/model - 领域实体

存放本模块独有的实体定义及其业务方法：
```go
// internal/author/model.go
package author

type Author struct {
    ID   int64
    Name string
}

// IsValid 业务方法 - 与领域相关但不需要外部依赖
func (a *Author) IsValid() bool {
    return a.Name != ""
}
```

**原则**：实体及其业务方法必须在同一模块内，不得跨模块引用其他实体的业务方法。

---

## 6. config vs settings 的区分

| 目录 | 职责 | 内容示例 |
|------|------|----------|
| `internal/config` | 程序级配置 | 数据库连接、服务器端口、插件根目录路径、日志级别 |
| `internal/settings` | 业务设置 | 用户偏好、主题、默认下载路径、资源库根目录 |

**加载优先级**：
1. 环境变量 (最高)
2. 命令行参数
3. 配置文件 (config.yaml)
4. 默认值 (最低)

---

## 7. Repository 模式实施

### 7.1 包内聚合结构

采用 **"包内聚合"** 方式，将接口定义、实现和领域模型放在同一个业务包内：

```
internal/author/
├── model.go             # [领域实体] 纯数据结构
├── repository.go        # [接口定义] Repository 接口 (Port)
├── repository_impl.go   # [接口实现] 具体的数据库操作 (Adapter)
└── service.go          # [业务逻辑] 核心业务规则
```

### 7.2 领域实体 (model.go)

**职责**：定义数据结构和验证方法。

**规范**：
- 不包含业务逻辑（如"计算折扣"）
- 仅包含基础的数据验证方法（如 `Validate()`）
- 严禁引用其他业务模块的实体

```go
package author

// Author 领域实体
type Author struct {
    ID   int64  `json:"id"`
    Name string `json:"name"`
}

// IsValid 验证作者是否有效
func (a *Author) IsValid() bool {
    return a.Name != ""
}
```

### 7.3 接口定义 (repository.go)

**职责**：定义数据存取的契约。

**规范**：
- 接口定义在调用方（Service 所在的包）
- 方法签名必须使用 `context.Context`
- 返回领域实体或 DTO，严禁返回 `*gorm.DB` 或 `sql.Rows`

```go
package author

import "context"

// Repository 定义了 Author 模块的数据存取契约
type Repository interface {
    FindByID(ctx context.Context, id int64) (*Author, error)
    Create(ctx context.Context, a *Author) error
    Update(ctx context.Context, a *Author) error
    Delete(ctx context.Context, id int64) error
    List(ctx context.Context, limit, offset int) ([]*Author, error)
}
```

### 7.4 业务逻辑 (service.go)

**职责**：处理业务流程、事务控制。

**规范**：
- 依赖注入：通过构造函数注入 Repository 接口
- 面向接口编程：不知道底层是 SQLite 还是其他数据库

```go
package author

type Service struct {
    repo Repository
}

func NewService(repo Repository) *Service {
    return &Service{repo: repo}
}

func (s *Service) Register(ctx context.Context, name string) (*Author, error) {
    if name == "" {
        return nil, ErrNameEmpty
    }
    author := &Author{Name: name}
    if err := s.repo.Create(ctx, author); err != nil {
        return nil, err
    }
    return author, nil
}
```

### 7.5 数据库实现 (repository_impl.go)

**职责**：将接口调用转换为具体的 SQL 操作。

**规范**：
- 这是唯一允许 import `internal/database` 的地方
- 实现结构体通常命名为 `repositoryImpl`
- 必须实现 Repository 接口

```go
package author

import (
    "context"
    "my-ipc-service/internal/database"
)

type repositoryImpl struct {
    db *database.DB
}

func NewRepository(db *database.DB) Repository {
    return &repositoryImpl{db: db}
}

func (r *repositoryImpl) FindByID(ctx context.Context, id int64) (*Author, error) {
    var author Author
    err := r.db.WithContext(ctx).First(&author, id).Error
    if err != nil {
        return nil, err
    }
    return &author, nil
}
```

---

## 8. 跨模块依赖解决方案

**问题**：如果 AuthorService 需要调用 WorkService，直接引用会导致循环依赖。

**解决方案**：依赖倒置 + 接口隔离

1. 在 author 包内定义它需要的接口 `WorkProvider`
2. 在 main.go 中将 WorkService 注入给 AuthorService

```go
// internal/author/service.go

// WorkProvider 定义了 Author 模块需要的 Work 能力
type WorkProvider interface {
    GetWorksByAuthorID(ctx context.Context, authorID int64) ([]WorkSummary, error)
}

type Service struct {
    repo         Repository
    workProvider WorkProvider
}

func NewService(repo Repository, wp WorkProvider) *Service {
    return &Service{repo: repo, workProvider: wp}
}
```

---

## 9. 组装与依赖注入 (cmd/server/main.go)

所有具体的依赖关系必须在 main.go 中组装。这是唯一发生"具体类型耦合"的地方。

```go
func main() {
    // 1. 初始化配置
    cfg := config.Load()

    // 2. 初始化数据库
    db := database.Init(cfg.Database)

    // 3. 初始化 Repository (实现层)
    authorRepo := author.NewRepository(db)
    workRepo := work.NewRepository(db)

    // 4. 初始化 Service (业务层)
    workService := work.NewService(workRepo)
    // 注意：将 workService 注入给 authorService 以满足 WorkProvider 接口
    authorService := author.NewService(authorRepo, workService)

    // 5. 注册 IPC handlers...

    // 6. 启动服务...
}
```

---

## 10. 检查清单

在提交代码前，请检查：

- [ ] 目录结构：是否遵循 model, repository, service 分离？
- [ ] 依赖方向：Service 是否只引用了 Repository 接口？
- [ ] 数据库隔离：Service 层是否完全没有 import `internal/database`？
- [ ] 循环依赖：是否存在 A→B→A 的依赖？（如有，请改为接口）
- [ ] 上下文：所有 Repository 方法是否都接收了 `context.Context`？
- [ ] config/settings：是否正确区分了程序配置和业务设置？
- [ ] util 包：是否是无状态的纯函数？
