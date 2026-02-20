# LibrarySquirrel 代码规则与约定

## 概述

本文档记录 LibrarySquirrel 项目的代码编写规则、命名约定、文件组织和开发规范。遵循这些规则有助于保持代码一致性、可维护性和团队协作效率。

## 文件命名规范

### 目录结构约定
- **src/main/** - 主进程代码 (Node.js/Electron)
  - `base/` - 基类 (BaseDao, BaseService, BasePlugin)
  - `constant/` - 常量与枚举
  - `core/` - 核心服务 (MainProcessApi, Initialize)
  - `dao/` - 数据访问对象
  - `database/` - 数据库初始化
  - `model/` - 领域模型和实体
  - `plugin/` - 插件系统
  - `service/` - 业务逻辑服务
  - `resources/` - YAML 配置文件
  - `util/` - 工具类
- **src/preload/** - 预加载脚本 (IPC 桥接)
- **src/renderer/** - 渲染进程代码 (Vue 3)
  - `src/apis/` - IPC API 封装
  - `src/components/` - Vue 组件
  - `src/store/` - Pinia 状态管理
  - `src/utils/` - 渲染进程工具类

### 文件命名规则
| 文件类型 | 命名规则 | 示例 |
|----------|----------|------|
| **类文件** | PascalCase + `.ts` | `WorkService.ts`, `BaseDao.ts` |
| **Vue 组件** | PascalCase + `.vue` | `WorkCard.vue`, `WorkSetDialog.vue` |
| **TypeScript 类型/接口** | PascalCase + `.ts` | `WorkDTO.ts`, `TaskStatus.ts` |
| **工具函数** | camelCase + `.ts` | `logUtil.ts`, `apiUtil.ts` |
| **常量文件** | camelCase + `.ts` | `errorCode.ts`, `httpStatus.ts` |
| **配置文件** | kebab-case + `.yml`/`.json` | `createDataTables.yml`, `tsconfig.web.json` |

## 代码风格规范

### 注释规范

#### 基本原则
- **只描述目的和约束**: 注释应说明函数/方法的目的、用途和使用约束，而不是描述实现方式
- **禁止变更描述**: 注释中禁止使用"改为"、"修改为"、"重构"、"优化"等描述变更的词汇

#### 错误示例
```typescript
// 改为调用外部注入的方法  ← 禁止：描述变更
// 重构这个方法实现  ← 禁止：描述变更
// 修改为异步函数  ← 禁止：描述变更
// 优化性能问题  ← 禁止：描述变更
```

#### 正确示例
```typescript
/**
 * 批量关联作品到作品集
 * @param workIds 作品id列表
 * @param workSetId 作品集id
 * @throws {string} 当作品已存在于作品集中时抛出错误信息
 */

/**
 * 查询标签选择列表
 * @param page 分页参数
 * @param input 搜索关键字
 * @returns 包含选择项的分页数据
 */

/**
 * 作品查询函数 - 接收分页参数，返回作品分页结果
 * @param page 包含查询条件的分页对象
 * @returns 作品分页结果
 */
```

### 命名规范

#### 禁止方法名与 prop 同名
- **原则**：组件内部方法名不得与 props 中定义的属性名相同
- **原因**：避免变量遮蔽和潜在的代码混淆问题
- **解决方案**：使用动词前缀区分方法与属性

#### 方法命名模式
使用明确的前缀来区分方法与 props 属性：

| 前缀 | 用途 | 示例 |
|------|------|------|
| `handleXxx` | 处理事件或回调 | `handleSubmit`, `handleChange` |
| `doXxx` | 执行操作 | `doFetch`, `doSearch` |
| `buildXxx` | 构建或组装数据 | `buildConditions`, `buildQuery` |
| `loadXxx` | 加载数据 | `loadData`, `loadItems` |
| `checkXxx` | 检查或验证 | `checkPermission`, `validateInput` |

#### 正确示例
```typescript
// props 中定义了 fetchWorkPage
const props = defineProps<{
  fetchWorkPage: (page: Page) => Promise<Page>
}>()

// 方法使用 doFetchWorkPage 而不是 fetchWorkPage
async function doFetchWorkPage(page: Page) {
  // 实现
}
```

#### 错误示例
```typescript
// 方法名与 prop 同名 - 禁止
async function fetchWorkPage(page: Page) {
  // 这会导致变量遮蔽
}
```

#### Vue 组件特有规则
- Props 中的函数属性通常使用名词命名（如 `fetchWorkPage`）
- 组件内部方法应使用动词前缀（如 `doFetchWorkPage`）
- 事件处理统一使用 `handle` 前缀（如 `handleClick`）

### TypeScript 规范
- **模块解析**: 主进程使用 `node16`，渲染进程使用 `bundler`
- **路径别名**: 渲染进程使用 `@renderer/*` 指向 `src/renderer/src/*`
- **类型定义**: 优先使用 `interface` 定义对象结构，`type` 用于联合类型或工具类型
- **空值处理**: 使用可选链 `?.` 和空值合并 `??` 运算符
- **严格模式**: 启用 TypeScript 严格模式 (`strict: true`)

### Vue 组件规范
- **语法**: 使用 `<script setup lang="ts">` 组合式 API
- **Props 定义**: Props 接口使用 `Props` 后缀
  ```typescript
  interface WorkCardProps {
    work: WorkDTO
    showActions?: boolean
  }
  ```
- **Emits 定义**: 使用 `defineEmits` 和 TypeScript 字面量类型
- **组件导入**: 使用 `@renderer/components/...` 路径别名导入组件
- **样式选择器**: 尽可能使用类选择器 (`.class-name`) 设置样式，避免使用元素选择器 (`div`, `span`) 和 ID 选择器 (`#id`)，仅在必要时使用style属性，以提高样式复用性和可维护性

### 命名约定
| 元素类型 | 命名规则 | 示例 |
|----------|----------|------|
| **类名** | PascalCase | `WorkService`, `BaseDao` |
| **接口/类型** | PascalCase | `WorkDTO`, `TaskStatus` |
| **变量/函数** | camelCase | `workList`, `getWorkById` |
| **常量** | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `DEFAULT_PAGE_SIZE` |
| **私有成员** | 前缀 `_` (可选) | `_internalCache`, `_privateMethod()` |
| **布尔变量** | 使用 `is`, `has`, `can` 前缀 | `isLoading`, `hasError`, `canEdit` |

## 开发约定

### IPC 通信模式
- **方法命名**: `serviceName-methodName` (kebab-case)
- **主进程注册** (`MainProcessApi.ts`):
  ```typescript
  Electron.ipcMain.handle('workService-getById', async (_event, args) => {
    const service = new WorkService()
    try {
      return ApiUtil.response(await service.getById(args))
    } catch (error) {
      return returnError(error)
    }
  })
  ```
- **预加载桥接** (`preload/index.ts`):
  ```typescript
  workServiceGetById: (args) => Electron.ipcRenderer.invoke('workService-getById', args)
  ```
- **渲染进程调用**:
  ```typescript
  const response = await window.api.workServiceGetById(workId)
  ```

### 响应处理
- **统一响应格式**: 使用 `ApiUtil.response(data)` / `ApiUtil.error(message)`
- **错误包装**: 所有错误通过 `returnError(error)` 包装
- **前端处理**:
  ```typescript
  const response = await window.api.someMethod(args)
  if (ApiUtil.check(response)) {
    const data = ApiUtil.data(response)
    // 处理成功数据
  } else {
    const error = ApiUtil.error(response)
    // 处理错误
  }
  ```

### 数据库操作
- **事务处理**: 使用 `db.transaction()` 支持嵌套 SAVEPOINT
  ```typescript
  await db.transaction(async (tx) => {
    await tx.run('INSERT INTO ...')
    await tx.run('UPDATE ...')
  }, '操作描述')
  ```
- **DAO 模式**: 所有数据库操作通过 DAO 层进行
- **SQL 文件**: 表结构定义在 YAML 配置文件中 (`src/main/resources/database/`)

### 插件开发规范
- **目录位置**: `src/main/plugin/package/`
- **插件结构**: 每个插件是独立包，包含 `package.json`
- **基类**: 实现 `BasePlugin` 接口，至少包含 `pluginId: number`
- **插件工厂**: 通过 `PluginFactory.create()` 创建插件实例

## 代码质量工具

### ESLint 配置
- **基础配置**: `@electron-toolkit/eslint-config`
- **Vue 规则**: `vue/require-default-prop` 已禁用
- **自动修复**: `yarn lint` 运行 ESLint 并自动修复问题

### Prettier 格式化
- **格式化命令**: `yarn format`
- **集成**: 与 ESLint 配合，确保代码风格统一

### 类型检查
- **全项目检查**: `yarn typecheck`
- **主进程**: `yarn typecheck:node`
- **渲染进程**: `yarn typecheck:web`

## 日期与时间处理
- **统一格式**: 所有日期时间字段使用 Unix 时间戳（毫秒）
- **数据库存储**: 使用 `INTEGER` 类型存储时间戳
- **显示转换**: 在前端进行本地化时间格式转换

## 资源文件管理
- **本地文件协议**: 使用自定义 `resource://` 协议访问本地文件
- **图像处理**: 支持通过 sharp 进行图像尺寸调整
- **文件路径**: 使用绝对路径，避免相对路径歧义

## Git 提交规范
- **提交信息**: 使用中文描述，格式为 `类型(范围): 描述`
  - `feat(渲染进程): 添加作品卡片组件`
  - `fix(主进程): 修复数据库连接泄漏`
  - `docs(README): 更新项目说明`
- **类型前缀**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## 新增功能开发流程

### 1. 添加新 Service
1. 在 `src/main/service/` 创建 Service 类
2. 在 `MainProcessApi.ts` 注册 IPC 处理器
3. 在 `preload/index.ts` 添加 API 包装
4. 前端通过 `window.api` 调用

### 2. 添加新 Vue 组件
1. 在 `src/renderer/src/components/` 创建 `.vue` 文件
2. 使用 `<script setup lang="ts">` 语法
3. 定义 Props 接口（使用 `Props` 后缀）
4. 通过路径别名导入其他组件

### 3. 添加数据库表
1. 在 `src/main/resources/database/createDataTables.yml` 定义表结构
2. 创建对应的 Model 类（`src/main/model/`）
3. 创建 DAO 类（`src/main/dao/`）
4. 在 Service 层调用 DAO 方法

## 常见注意事项
1. **避免直接使用 SQLite API**: 始终通过 DAO 层访问数据库
2. **错误处理**: 所有异步操作都需要 try-catch 并返回统一错误格式
3. **类型安全**: 充分利用 TypeScript 类型系统，避免使用 `any`
4. **组件通信**: 优先使用 Props/Emits，复杂状态使用 Pinia Store
5. **性能优化**: 大型列表使用虚拟滚动，图片使用懒加载

## 文档维护
当代码规则发生变化时，需要同步更新以下文档：
1. 本文档（`code-rules.md`）
2. `CLAUDE.md` 中的 Key Conventions 部分
3. 相关开发示例（`development-scenarios.md`）

---

**最后更新**: 2026-02-20
**维护者**: AI Assistant
