# LibrarySquirrel 开发示例场景

## 场景1：添加新站点支持（以Twitter为例）

### 业务需求

用户希望从Twitter下载作品到本地资源库。

### 开发步骤

#### 1. 创建Twitter插件

```typescript
// plugin/package/twitter-plugin/index.ts
export default class TwitterPlugin extends BasePlugin {
  async processUrl(url: string): Promise<PluginWorkResponseDTO> {
    // 解析Twitter URL
    // 调用Twitter API获取作品信息
    // 提取作者、标签、作品内容
    // 返回PluginWorkResponseDTO
  }
}
```

#### 2. 添加站点记录

```yaml
# 在数据库配置中添加（如果需要新字段）
# 或通过现有SiteService添加
```

#### 3. 安装和注册插件

- 将插件包放入`plugin/package/twitter-plugin/`
- 系统通过`PluginLoader.ts`自动加载
- 插件工厂`PluginFactory.ts`可创建实例

#### 4. 测试流程

```
用户输入Twitter作品URL → 任务创建 → Twitter插件执行 → 保存作品
```

## 场景2：添加作品收藏功能

### 业务需求

用户希望收藏喜欢的作品，方便快速访问。

### 开发步骤

#### 1. 数据库扩展

```yaml
# src/main/resources/database/createDataTables.yml
- name: favorite
  sql: |
    create table if not exists favorite (
      id integer primary key autoincrement,
      work_id integer references work(id),
      user_note text,
      create_time integer,
      update_time integer
    )
```

#### 2. 创建数据模型

```typescript
// src/main/model/entity/Favorite.ts
export default class Favorite {
  id: number
  workId: number
  userNote: string
  createTime: number
  updateTime: number
}

// src/main/model/dto/FavoriteDTO.ts
export default class FavoriteDTO {
  workId: number
  userNote?: string
}
```

#### 3. 创建DAO层

```typescript
// src/main/dao/FavoriteDao.ts
export class FavoriteDao extends BaseDao<Favorite> {
  constructor(db?: DatabaseClient) {
    super('favorite', Favorite, db)
  }

  async findByWorkId(workId: number): Promise<Favorite | null> {
    // 实现查询逻辑
  }
}
```

#### 4. 创建Service层

```typescript
// src/main/service/FavoriteService.ts
export default class FavoriteService extends BaseService<FavoriteQueryDTO, Favorite, FavoriteDao> {
  constructor(db?: DatabaseClient) {
    super(FavoriteDao, db)
  }

  async toggleFavorite(workId: number, userId: number): Promise<boolean> {
    // 添加/取消收藏逻辑
  }
}
```

#### 5. 注册IPC方法

```typescript
// src/main/core/MainProcessApi.ts
Electron.ipcMain.handle('favorite-toggle', async (_event, args) => {
  const service = new FavoriteService()
  try {
    return ApiUtil.response(await service.toggleFavorite(args.workId, args.userId))
  } catch (error) {
    return returnError(error)
  }
})

Electron.ipcMain.handle('favorite-listByUser', async (_event, args) => {
  // ...类似注册
})
```

#### 6. 添加预加载API

```typescript
// src/preload/index.ts
const api = {
  // ...现有API
  favoriteToggle: (args) => Electron.ipcRenderer.invoke('favorite-toggle', args),
  favoriteListByUser: (args) => Electron.ipcRenderer.invoke('favorite-listByUser', args)
}
```

#### 7. 创建前端组件

```vue
<!-- src/renderer/src/components/common/FavoriteButton.vue -->
<template>
  <el-button @click="toggleFavorite" :type="isFavorited ? 'primary' : 'default'">
    {{ isFavorited ? '已收藏' : '收藏' }}
  </el-button>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useFavoriteStore } from '@renderer/store/UseFavoriteStore.ts'

const props = defineProps<{
  workId: number
}>()

const favoriteStore = useFavoriteStore()
const isFavorited = computed(() => favoriteStore.isFavorited(props.workId))

async function toggleFavorite() {
  await favoriteStore.toggleFavorite(props.workId)
}
</script>
```

#### 8. 创建Pinia Store

```typescript
// src/renderer/src/store/UseFavoriteStore.ts
export const useFavoriteStore = defineStore('favorite', {
  state: () => ({
    favorites: new Map<number, Favorite>()
  }),

  actions: {
    async toggleFavorite(workId: number) {
      const response = await window.api.favoriteToggle({ workId })
      if (ApiUtil.check(response)) {
        // 更新本地状态
      }
    },

    async loadUserFavorites(userId: number) {
      const response = await window.api.favoriteListByUser({ userId })
      if (ApiUtil.check(response)) {
        // 加载收藏列表
      }
    }
  },

  getters: {
    isFavorited: (state) => (workId: number) => {
      return state.favorites.has(workId)
    }
  }
})
```

## 场景3：修复作品下载时的作者关联问题

### 问题描述

下载作品时，站点作者未能正确关联到本地作者。

### 调试步骤

#### 1. 定位问题代码

```bash
# 搜索相关文件
grep -r "关联作者" src/main/ # 查找业务逻辑
grep -r "re_work_author" src/main/ # 查找关联表操作
```

#### 2. 检查WorkService

```typescript
// src/main/service/WorkService.ts
public async saveFromPlugin(pluginWorkResponseDTO: PluginWorkResponseDTO, taskId: number) {
  // 检查作者关联逻辑
  const siteAuthors = pluginWorkResponseDTO.authors
  // 关联逻辑应该在这里
}
```

#### 3. 检查ReWorkAuthorService

```typescript
// src/main/service/ReWorkAuthorService.ts
public async associateAuthors(workId: number, siteAuthorIds: number[], localAuthorIds: number[]) {
  // 检查关联创建逻辑
}
```

#### 4. 验证数据流

```
插件返回作者信息 → WorkService处理 → ReWorkAuthorService创建关联
```

#### 5. 添加日志

```typescript
LogUtil.info('WorkService', '开始处理作者关联', {
  workId,
  siteAuthors: siteAuthors.length,
  localAuthors: localAuthorIds.length
})
```

#### 6. 修复方案

如果发现是本地作者查询逻辑问题：

```typescript
// 修复前
const localAuthor = await localAuthorService.findByName(authorName)

// 修复后：添加模糊匹配或创建新本地作者
let localAuthor = await localAuthorService.findByName(authorName)
if (!localAuthor) {
  localAuthor = await localAuthorService.create({ name: authorName })
}
```

## 场景4：优化作品检索性能

### 业务需求

作品列表页面加载缓慢，需要优化查询性能。

### 优化步骤

#### 1. 分析现有查询

```typescript
// WorkService.queryPage() 检查查询逻辑
```

#### 2. 添加数据库索引

```yaml
# 在createDataTables.yml中添加索引
- name: idx_work_create_time
  sql: create index idx_work_create_time on work(create_time)

- name: idx_re_work_author_work_id
  sql: create index idx_re_work_author_work_id on re_work_author(work_id)
```

#### 3. 优化JOIN查询

```typescript
// 优化前：多次查询
const works = await workDao.queryPage(queryDTO)
for (const work of works) {
  work.authors = await authorService.findByWorkId(work.id)
}

// 优化后：单次查询使用JOIN
const worksWithAuthors = await workDao.queryPageWithAuthors(queryDTO)
```

#### 4. 实现分页缓存

```typescript
// 在Service层添加缓存逻辑
const cacheKey = `works:${JSON.stringify(queryDTO)}`
if (cache.has(cacheKey)) {
  return cache.get(cacheKey)
}

const result = await dao.queryPage(queryDTO)
cache.set(cacheKey, result, 60 * 1000) // 缓存1分钟
return result
```

#### 5. 前端虚拟滚动

```vue
<!-- 使用Element Plus的虚拟滚动 -->
<el-table-virtual :data="works" virtual-scroll>
  <!-- 列定义 -->
</el-table-virtual>
```

## 场景5：扩展插件接口

### 业务需求

插件需要支持更多类型的作品信息提取。

### 扩展步骤

#### 1. 更新插件接口

```typescript
// src/main/plugin/BasePlugin.ts
export interface BasePlugin {
  pluginId: number

  // 现有方法
  processUrl(url: string): Promise<PluginWorkResponseDTO>

  // 新增方法
  extractMetadata(filePath: string): Promise<PluginWorkResponseDTO>
  validateUrl(url: string): Promise<boolean>
}
```

#### 2. 更新DTO

```typescript
// src/main/model/dto/PluginWorkResponseDTO.ts
export default class PluginWorkResponseDTO {
  // 现有字段
  title: string
  authors: SiteAuthorDTO[]
  tags: SiteTagDTO[]

  // 新增字段
  metadata?: Record<string, any> // 扩展元数据
  sourceQuality?: string // 源质量信息
  recommendedTags?: string[] // 推荐标签
}
```

#### 3. 更新插件实现

```typescript
// 现有插件需要实现新方法
class ExistingPlugin extends BasePlugin {
  async extractMetadata(filePath: string): Promise<PluginWorkResponseDTO> {
    // 实现元数据提取
  }

  async validateUrl(url: string): Promise<boolean> {
    // 实现URL验证
  }
}
```

#### 4. 更新任务处理器

```typescript
// src/main/plugin/TaskHandler.ts
async handleTask(task: Task, plugin: BasePlugin) {
  // 原有URL处理逻辑
  if (task.type === 'url') {
    return await plugin.processUrl(task.url)
  }

  // 新增文件处理逻辑
  if (task.type === 'file') {
    return await plugin.extractMetadata(task.filePath)
  }
}
```

#### 5. 确保向后兼容

```typescript
// 添加默认实现
abstract class BasePlugin {
  async extractMetadata(filePath: string): Promise<PluginWorkResponseDTO> {
    throw new Error('未实现extractMetadata方法')
  }

  async validateUrl(url: string): Promise<boolean> {
    return true // 默认通过验证
  }
}
```

## 常见开发模式总结

### 模式1：添加新实体

1. 数据库表定义（YAML）
2. 创建Entity、DTO、QueryDTO
3. 创建DAO（继承BaseDao）
4. 创建Service（继承BaseService）
5. 注册IPC方法（MainProcessApi）
6. 添加预加载API
7. 创建前端Store和组件

### 模式2：扩展现有功能

1. 分析现有数据流
2. 确定扩展点（Service、DTO、数据库）
3. 确保向后兼容
4. 更新相关组件

### 模式3：性能优化

1. 定位性能瓶颈（查询、渲染、IPC）
2. 数据库索引优化
3. 查询逻辑重构
4. 缓存策略实现
5. 前端渲染优化

### 模式4：插件开发

1. 定义插件接口
2. 实现站点特定逻辑
3. 测试插件集成
4. 文档和示例
