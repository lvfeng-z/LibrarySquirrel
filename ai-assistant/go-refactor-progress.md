# Go 主进程重构进度记录

## 概述

本项目将 Electron 主进程从 Node.js 重构为 Go 语言，以提高性能并保持代码一致性。

**当前分支**: `go-refactor`
**工作目录**: `E:\code\lvfeng\LibrarySquirrel\src\main-go`

---

## 一、已完成项

### 1.1 基础设施层

| 功能 | 文件 | 状态 |
|------|------|------|
| 统一配置管理 | `config.yaml` | ✅ 完成 |
| 配置加载 | `internal/config/config.go` | ✅ 完成 |
| 数据库连接 (GORM) | `internal/database/db.go` | ✅ 完成 |
| GORM AutoMigrate | `internal/migration/migrate.go` | ✅ 完成 |
| BaseRepository[T] 接口 | `internal/database/base_repository.go` | ✅ 完成 |
| BaseRepository[T] 实现 | `internal/database/base_repository_impl.go` | ✅ 完成 |
| Transaction 封装 | `internal/database/transaction.go` | ✅ 完成 |

### 1.2 共享模型层 (pkg/model)

| 功能 | 文件 | 状态 |
|------|------|------|
| API 响应封装 | `pkg/model/api_response.go` | ✅ 完成 |
| 分页请求/响应 | `pkg/model/base.go` | ✅ 完成 |
| Example 查询构建器 | `pkg/model/example.go` | ✅ 完成 |

### 1.3 业务模块

| 模块 | Model | Repository | Service | Handler | HTTP Routes |
|------|-------|------------|---------|---------|-------------|
| localTag | ✅ | ✅ | ✅ | ✅ | ✅ |

### 1.4 GORM 模型 (18个)

| 模型 | 外键 | 索引 | 状态 |
|------|------|------|------|
| Work | ✅ | ✅ | ✅ |
| Resource | ✅ | ✅ | ✅ |
| LocalTag | ✅ | ✅ | ✅ |
| SiteTag | ✅ | ✅ | ✅ |
| LocalAuthor | ✅ | ✅ | ✅ |
| SiteAuthor | ✅ | ✅ | ✅ |
| Task | ✅ | ✅ | ✅ |
| Plugin | ✅ | ✅ | ✅ |
| AutoExplainPath | ✅ | ✅ | ✅ |
| Site | ✅ | ✅ | ✅ |
| WorkSet | ✅ | ✅ | ✅ |
| WorkSetResourceRelate | ✅ | ✅ | ✅ |
| WorkAuthorRelate | ✅ | ✅ | ✅ |
| WorkTagRelate | ✅ | ✅ | ✅ |
| TaskNodeRelate | ✅ | ✅ | ✅ |
| SlotBinding | ✅ | ✅ | ✅ |
| SiteBrowser | ✅ | ✅ | ✅ |
| PluginTaskUrlListener | ✅ | ✅ | ✅ |

### 1.5 分页参数对齐

- **已完成**: `Paging` 参数已从 `PageRequest` 和 `Page` 中移除
- **Query 转换**: 添加 `PageRequest.ToExample()` 方法，支持将前端查询条件转换为 `Example`

---

## 二、分页参数设计

### 当前结构

```go
// PageRequest - 分页请求（与渲染进程 IPage 保持一致）
type PageRequest struct {
    PageNumber int                   `json:"pageNumber"`
    PageSize   int                   `json:"pageSize"`
    Query      map[string]interface{} `json:"query,omitempty"`
}

// Page - 分页响应
type Page[T any] struct {
    PageNumber   int     `json:"pageNumber"`
    PageSize     int     `json:"pageSize"`
    PageCount    int     `json:"pageCount"`
    DataCount    int64   `json:"dataCount"`
    CurrentCount int     `json:"currentCount"`
    Query        interface{} `json:"query,omitempty"`
    Data         []*T    `json:"data"`
}
```

### Query 操作符支持

| 前缀 | 操作符 | 示例 |
|------|--------|------|
| 无 | `=` | `{"name": "test"}` |
| `!` | `!=` | `{"status!": 0}` |
| `>` | `>` | `{"age>": 18}` |
| `>=` | `>=` | `{"age>=": 18}` |
| `<` | `<` | `{"age<": 65}` |
| `<=` | `<=` | `{"age<=": 65}` |
| `~` | `LIKE` | `{"name~": "%test%"}` |

### 使用示例

```
GET /api/localTag/page?pageNumber=1&pageSize=10&query={"name":"test","status!":0}
```

---

## 三、配置统一

### config.yaml 结构

```yaml
server:
  port: 8080

database:
  driver: sqlite3
  dsn: E:/code/lvfeng/LibrarySquirrel/database/database.db

log:
  level: info
  file: logs/app.log

app:
  workDir: E:/code/lvfeng/LibrarySquirrel

sites:
  - name: nhentai
    url: https://nhentai.net

plugins:
  path: plugins
```

---

## 四、待完成模块

### 4.1 待开发模块

| 优先级 | 模块 | 说明 |
|--------|------|------|
| 高 | work | 作品管理 |
| 高 | localAuthor | 本地作者 |
| 中 | siteTag | 站点标签 |
| 中 | siteAuthor | 站点作者 |
| 中 | site | 站点管理 |
| 中 | task | 任务管理 |
| 中 | plugin | 插件管理 |
| 低 | workSet | 作品集 |
| 低 | search | 搜索服务 |
| 低 | autoExplainPath | 自动解释路径 |
| 低 | settings | 设置管理 |

### 4.2 待完成功能

| 功能 | 状态    | 说明 |
|------|-------|------|
| HTTP Server 路由注册 | 进行中   | 当前 localTag 示范 |
| Electron IPC 集成 | 已验证可行 | 与渲染进程通信 |
| 插件系统迁移 | 待开始   | 从旧主进程迁移 |
| 任务调度系统 | 待开始   | Task 模块 |

---

## 五、技术决策记录

### 5.1 数据库选型

- **驱动**: `gorm.io/driver/sqlite`
- **CGO**: 使用 TDM-GCC-64 解决编译问题
- **迁移**: GORM AutoMigrate 自动维护表结构

### 5.2 模块解耦策略

采用**包内聚合**模式：
```
internal/{module}/
├── model.go           # 领域实体
├── repository.go      # Repository 接口（嵌入 BaseRepository）
├── repository_impl.go # 数据库实现
└── service.go         # 业务逻辑
```

### 5.3 依赖注入

通过构造函数注入 Repository 接口，实现松耦合。

---

## 六、问题与解决方案

| 问题 | 解决方案 |
|------|----------|
| CGO gcc 找不到 | 安装 TDM-GCC-64 |
| 导入循环依赖 | 将 migrate.go 移至独立 migration 包 |
| 类型推断失败 | 使用显式类型参数 `database.NewBaseRepository[LocalTag](db)` |
| 数据库路径问题 | 使用绝对路径 `E:/code/lvfeng/LibrarySquirrel/database/database.db` |

---

## 七、最近提交

| 提交 | 描述 |
|------|------|
| 61992ec2 | refactor(主进程): electron启动时将go主进程作为子进程启动 |
| 10dc89ea | refactor(主进程): 补充数据表结构体的索引外键等 |
| ad073582 | refactor(主进程): 开发环境启动时使用node启动子进程的方式启动go主进程，使用gorm的Auto Migration功能自动迁移数据表 |
| 5894eb5f | test(主进程): 验证可行性 |
| 2fb5cc4e | refactor(主进程): 旧主进程改回原本的路径 |

---

## 八、下一步计划

1. **扩展 localTag Handler**：完善 CRUD 和查询接口
2. **添加 localAuthor 模块**：完整的 Repository/Service/Handler
3. **实现 work 模块**：核心业务模块
4. **集成 Electron IPC**：创建 preload 桥接
5. **测试验证**：确保与渲染进程正常通信
