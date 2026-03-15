---
name: code-writer
description: 代码工程师，根据开发计划按照项目代码规则编写高质量代码。适用于已有清晰的需求计划，需要实现功能代码时。
---

# Code Writer Skill

## 技能概述

| 属性 | 值 |
|------|-----|
| 名称 | code-writer |
| 描述 | 代码工程师，根据开发计划按照项目代码规则编写高质量代码 |
| 版本 | 1.0.0 |
| 适用场景 | 已有清晰的需求计划，需要实现功能代码时 |

## 核心指令

### 1. 理解需求

- 阅读需求计划文档的完整内容
- 不清楚的地方及时询问需求分析师
- 确认开发范围和验收标准

### 2. 探索现有代码

必须先阅读以下规范文档：

- `ai-assistant/code-rules.md` - 完整代码编写规范
- `ai-assistant/architecture-quick-reference.md` - 核心架构要点

参考以下目录结构：

```
src/main/
├── base/          # 基类 (BaseDao, BaseService, BasePlugin)
├── constant/      # 常量与枚举
├── core/          # 核心服务 (MainProcessApi, Initialize)
├── dao/           # 数据访问对象
├── database/      # 数据库初始化
├── error/         # 错误处理
├── plugin/        # 插件系统
├── resources/    # YAML 配置文件
├── service/       # 业务逻辑服务
└── util/          # 工具类

src/renderer/src/
├── apis/          # IPC API 封装
├── components/    # Vue 组件
├── composables/    # Vue 组合式函数
├── constants/     # 常量定义
├── directives/    # Vue 指令
├── model/         # 前端模型
├── plugins/       # Vue 插件
├── router/        # Vue Router 路由
├── store/         # Pinia 状态管理
├── styles/        # 样式文件
├── utils/         # 工具函数
├── views/         # 页面视图
└── test/          # 测试文件

src/shared/
├── model/         # 共用实体/DTO/接口
│   ├── base/      # 基类
│   ├── constant/  # 枚举和常量
│   ├── domain/    # 领域模型
│   ├── dto/       # 数据传输对象
│   ├── entity/    # 实体类
│   ├── interface/ # 接口定义
│   ├── queryDTO/  # 查询DTO
│   └── util/      # 工具类型
└── util/          # 共用工具函数
```

### 3. 实现代码

按照计划文档的开发步骤，依次实现：

**后端实现顺序**:
1. Model/Entity (如需要)
2. DAO (如需要)
3. Service
4. IPC 注册

**前端实现顺序**:
1. API 封装 (如需要)
2. 组件实现
3. 状态管理 (如需要)

### 4. 代码自检

实现完成后，自检以下内容：

- [ ] 是否遵循文件命名规范
- [ ] 是否使用了正确的路径别名
- [ ] 是否使用了语义化空值判断函数
- [ ] 是否避免了 any 类型
- [ ] Vue 组件是否使用 `<script setup>`
- [ ] 注释是否只描述目的和约束
- [ ] 方法名是否与 props 不同名

### 5. 运行质量检查

```bash
# 类型检查
yarn typecheck

# 代码格式化
yarn format

# ESLint 检查
yarn lint
```

## 关键代码规范速查

### 文件命名

| 类型 | 规则 | 示例 |
|------|------|------|
| 类文件 | PascalCase + `.ts` | `WorkService.ts` |
| Vue组件 | PascalCase + `.vue` | `WorkCard.vue` |
| 工具函数 | camelCase + `.ts` | `logUtil.ts` |

### TypeScript 规范

```typescript
// 必须使用路径别名
import { WorkService } from '@renderer/apis/workService'
import { notNullish } from '@shared/util/CommonUtil.ts'

// 禁止使用 any 类型
const data: any = ...  // ✗ 禁止

// 必须定义明确类型
const data: WorkDTO = ...  // ✓ 正确
```

### 空值判断规范

```typescript
// 必须使用语义化判断函数（注意：使用 camelCase 命名）
import { notNullish, isNullish, arrayNotEmpty, arrayIsEmpty } from '@shared/util/CommonUtil.ts'
import { isBlank, isNotBlank } from '@shared/util/StringUtil.ts'

// 正确
if (notNullish(user)) { ... }
if (arrayNotEmpty(items)) { ... }
if (isNotBlank(name)) { ... }

// 错误
if (!value) { ... }
```

### IPC 通信模式

```typescript
// 主进程注册 (MainProcessApi.ts)
Electron.ipcMain.handle('workService-getById', async (_event, args) => {
  const service = new WorkService()
  try {
    return ApiUtil.response(await service.getById(args))
  } catch (error) {
    return returnError(error)
  }
})

// 预加载桥接 (preload/index.ts)
workServiceGetById: (args) => Electron.ipcRenderer.invoke('workService-getById', args)

// 渲染进程调用
const response = await window.api.workServiceGetById(workId)
```

### 数据库操作

```typescript
// 事务处理（使用 SAVEPOINT）
await db.transaction(async (tx) => {
  await tx.run('INSERT INTO ...')
  await tx.run('UPDATE ...')
}, '操作描述')

// 布尔类型转换
import { BOOL } from '@shared/model/constant/BOOL.ts'
item.isCover = isCoverValue === BOOL.TRUE
```

## 命名规范

### 禁止方法名与 prop 同名

```typescript
// props 中定义了 fetchWorkPage
const props = defineProps<{
  fetchWorkPage: (page: Page) => Promise<Page>
}>()

// 方法使用 doFetchWorkPage 而不是 fetchWorkPage
async function doFetchWorkPage(page: Page) { ... }
```

### 常用前缀

| 前缀 | 用途 | 示例 |
|------|------|------|
| `handleXxx` | 处理事件或回调 | `handleSubmit` |
| `doXxx` | 执行操作 | `doFetch` |
| `buildXxx` | 构建或组装数据 | `buildConditions` |
| `loadXxx` | 加载数据 | `loadData` |
| `checkXxx` | 检查或验证 | `checkPermission` |

### 注释规范

```typescript
/**
 * 批量关联作品到作品集
 * @param workIds 作品id列表
 * @param workSetId 作品集id
 * @throws {string} 当作品已存在于作品集中时抛出错误信息
 */
```

**禁止使用变更描述词汇**：`改为`、`重构`、`修改为`、`优化` 等

## TypeScript 类型安全规范

### 空值判断

```typescript
// 注意：使用 camelCase 命名
import { notNullish, isNullish, arrayNotEmpty, arrayIsEmpty } from '@shared/util/CommonUtil.ts'
import { isBlank, isNotBlank } from '@shared/util/StringUtil.ts'

// 正确
if (notNullish(user)) { ... }
if (arrayNotEmpty(items)) { ... }
if (isNotBlank(name)) { ... }

// 错误
if (!value) { ... }
if (items.length) { ... }
```

### 禁止使用 any

```typescript
// 禁止
const data: any = ...

// 必须
const data: WorkDTO = ...
```

### DTO 扁平化原则

```typescript
// 禁止嵌套实体
class UserResponseDTO {
  user: User  // ✗ 禁止
}

// 正确：扁平化
class UserResponseDTO {
  id: number
  username: string
  email: string
}
```

## 示例：IPC 通信模式

```typescript
// MainProcessApi.ts
Electron.ipcMain.handle('workService-getById', async (_event, args) => {
  const service = new WorkService()
  try {
    return ApiUtil.response(await service.getById(args))
  } catch (error) {
    return returnError(error)
  }
})

// preload/index.ts
workServiceGetById: (args) => Electron.ipcRenderer.invoke('workService-getById', args)

// 渲染进程调用
const response = await window.api.workServiceGetById(workId)
if (ApiUtil.check(response)) {
  const work = ApiUtil.data(response)
  // 处理成功
} else {
  const error = ApiUtil.error(response)
  // 处理错误
}
```

## 与其他 Skill 的协作

1. 从 **workflow-coordinator** 接收开发计划
2. 遇到需求不清晰时，询问 **requirements-analyst**
3. 需要参考文档时，查阅 ai-assistant 目录
4. 完成代码后，提交给 **test-engineer** 进行测试

## 参考文档

- [代码工程师原agent文档](../agents/code-writer.md)
- [完整代码规则](../code-rules.md)
- [需求分析师](../requirements-analyst-skill/SKILL.md)
- [测试工程师](../test-engineer-skill/SKILL.md)
