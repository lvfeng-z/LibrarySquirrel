# 搜索作品接口文档

## 接口概述

| 属性 | 值 |
|------|-----|
| IPC 通道 | `search-queryWorkPage` |
| 服务类 | `SearchService` |
| 服务方法 | `queryWorkPage(page: Page<SearchCondition[], WorkFullDTO>)` |

## 调用方式

### 渲染进程 (Renderer)

```typescript
// 前端调用
window.api.searchQueryWorkPage(page: Page<SearchCondition[], WorkFullDTO>): Promise<ApiResponse>

// 返回数据结构
interface ApiResponse<T> {
  success: boolean
  msg: string
  data: T
}
```

### 主进程 (Main Process)

```typescript
// MainProcessApi.ts
Electron.ipcMain.handle('search-queryWorkPage', async (_event, args) => {
  const queryService = new SearchService()
  return ApiUtil.response(await queryService.queryWorkPage(args))
})
```

## 请求参数

### Page 对象结构

```typescript
interface Page<Query, Result> {
  paging: boolean          // 是否分页，默认 true
  pageNumber: number       // 当前页码，从 1 开始
  pageSize: number        // 分页大小，默认 10
  pageCount: number       // 总页数
  dataCount: number       // 数据总量
  currentCount: number    // 本页数据量
  query: Query            // 查询条件
  data?: Result[]         // 返回数据（请求时通常为 undefined）
}
```

### SearchCondition 查询条件数组

```typescript
interface SearchCondition {
  type: SearchType         // 查询类型
  value: unknown           // 查询值
  operator?: CrudOperator  // 操作符，默认 EQUAL
}

enum SearchType {
  LOCAL_TAG = 1,      // 本地标签
  SITE_TAG = 2,       // 站点标签
  LOCAL_AUTHOR = 3,    // 本地作者
  SITE_AUTHOR = 4,     // 站点作者
  WORKS_SITE_NAME = 5, // 站点作品名称
  WORKS_NICKNAME = 6,  // 作品别称
}

enum CrudOperator {
  EQUAL = '=',           // 等于
  NOT_EQUAL = '!=',     // 不等于
  LIKE = 'LIKE',         // 模糊匹配
  GREATER_THAN = '>',   // 大于
  LESS_THAN = '<',      // 小于
  // ...其他操作符
}
```

### 查询条件映射规则

| SearchType | operator | 映射字段 | 说明 |
|------------|----------|----------|------|
| LOCAL_TAG | EQUAL | `includeLocalTagIds` | 包含本地标签 |
| LOCAL_TAG | NOT_EQUAL | `excludeLocalTagIds` | 排除本地标签 |
| SITE_TAG | EQUAL | `includeSiteTagIds` | 包含站点标签 |
| SITE_TAG | NOT_EQUAL | `excludeSiteTagIds` | 排除站点标签 |
| LOCAL_AUTHOR | EQUAL | `includeLocalAuthorIds` | 包含本地作者 |
| LOCAL_AUTHOR | NOT_EQUAL | `excludeLocalAuthorIds` | 排除本地作者 |
| SITE_AUTHOR | EQUAL | `includeSiteAuthorIds` | 包含站点作者 |
| SITE_AUTHOR | NOT_EQUAL | `excludeSiteAuthorIds` | 排除站点作者 |
| WORKS_SITE_NAME | EQUAL/LIKE | `siteWorkName` | 作品名称模糊搜索 |

## 返回结果

### Page<WorkQueryDTO, WorkFullDTO> 结构

```typescript
interface Page<WorkQueryDTO, WorkFullDTO> {
  paging: boolean
  pageNumber: number       // 当前页码
  pageSize: number         // 分页大小
  pageCount: number        // 总页数
  dataCount: number        // 数据总量
  currentCount: number     // 本页数据量
  query?: WorkQueryDTO     // 查询条件
  data?: WorkFullDTO[]     // 作品列表
}
```

### WorkFullDTO 完整作品信息

```typescript
class WorkFullDTO extends Work {
  resource?: Resource              // 资源信息
  inactiveResource?: Resource[]    // 不活跃资源
  site?: Site                      // 所属站点
  localAuthors?: RankedLocalAuthor[]   // 本地作者列表
  localTags?: LocalTag[]           // 本地标签列表
  siteAuthors?: RankedSiteAuthor[]     // 站点作者列表
  siteTags?: SiteTagFullDTO[]     // 站点标签列表
  workSets?: WorkSet[]            // 所属作品集
}
```

### Work 基础字段

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 作品ID |
| filePath | string | 文件存储路径 |
| fileName | string | 文件名称 |
| siteId | number | 站点ID |
| siteWorkId | string | 站点作品ID |
| siteWorkName | string | 站点作品名称 |
| nickName | string | 作品别称 |
| siteUploadTime | number | 站点上传时间(毫秒时间戳) |
| lastView | number | 最后查看时间 |
| importMethod | number | 导入方式(0:本地导入, 1:站点下载) |
| taskId | number | 任务ID |
| resourceComplete | boolean | 资源是否保存完成 |

## 调用示例

### 渲染进程调用

```typescript
import Page from '@renderer/model/util/Page.ts'
import { SearchCondition } from '@renderer/model/util/SearchCondition.ts'
import { CrudOperator } from '@renderer/constants/CrudOperator.ts'
import { SearchType } from '@renderer/model/util/SearchCondition.ts'

const page = new Page()
page.pageNumber = 1
page.pageSize = 16
page.query = [
  // 包含标签ID为1的作品
  new SearchCondition({
    type: SearchType.LOCAL_TAG,
    value: 1,
    operator: CrudOperator.EQUAL
  }),
  // 排除标签ID为2的作品
  new SearchCondition({
    type: SearchType.LOCAL_TAG,
    value: 2,
    operator: CrudOperator.NOT_EQUAL
  }),
  // 模糊搜索作品名称包含 "test"
  new SearchCondition({
    type: SearchType.WORKS_SITE_NAME,
    value: '%test%',
    operator: CrudOperator.LIKE
  })
]

const response = await window.api.searchQueryWorkPage(page)
if (response.success) {
  const resultPage = response.data
  console.log('作品列表:', resultPage.data)
  console.log('总页数:', resultPage.pageCount)
  console.log('数据总量:', resultPage.dataCount)
}
```

### 后端处理流程

```
SearchService.queryWorkPage()
  ↓
1. 将 SearchCondition[] 转换为 WorkCommonQueryDTO
   - 解析每种 SearchType 的查询条件
   - 分别填充 include/exclude 字段
   - 处理 LIKE 操作符
  ↓
2. 调用 WorkService.synthesisQueryPage() 执行查询
  ↓
3. 更新使用过的标签/作者的 lastUse 时间
  ↓
4. 返回查询结果
```

## 注意事项

1. **分页**: 首次查询 `pageNumber=1`，加载更多时 `pageNumber++`
2. **空查询**: `query` 为空数组或 `undefined` 时返回所有作品
3. **操作符限制**:
   - 标签/作者类型仅支持 `EQUAL` 和 `NOT_EQUAL`
   - 作品名称支持 `EQUAL` 和 `LIKE`
4. **组合查询**: 多个条件之间为 AND 关系
5. **更新时间戳**: 查询条件中的标签/作者会被更新最后使用时间
