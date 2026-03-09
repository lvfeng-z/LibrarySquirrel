# 插件系统开发指南

本文档描述 LibrarySquirrel 插件系统的架构和开发方法。

## 目录结构

### 主程序端

```
src/main/plugin/
├── PluginManager.ts        # 插件管理器 - 负责插件的加载、激活、停用
├── PluginTaskResParam.ts   # 任务处理参数
├── types/
│   ├── ActivationTypes.ts    # 激活配置类型
│   ├── ContributionTypes.ts  # 贡献点类型定义
│   ├── PluginContext.ts      # 插件上下文接口
│   ├── PluginInstance.ts      # 插件实例类型
│   └── PluginManifest.ts     # 插件清单类型
```

### 插件目录

插件位于 `D:\workspace\LibrarySquirrel-plugin\` 目录下，每个插件是独立的 npm 包。

```
LibrarySquirrel-plugin/
└── pixiv/                    # 示例：Pixiv 插件
    ├── src/
    │   ├── index.mjs         # 插件入口文件
    │   ├── plugin.json       # 插件清单配置
    │   ├── pixivTaskHandler.mjs      # 任务处理器
    │   ├── pixivSiteBrowser.mjs      # 站点浏览器
    │   ├── pixivTokenManager.mjs     # 令牌管理器
    │   └── lsLib/            # LibrarySquirrel 工具库
    └── dist/                 # 构建输出
```

## 核心概念

### 1. 插件清单 (plugin.json)

每个插件必须包含 `plugin.json` 配置文件：

```json
{
  "id": "com.lvfeng.pixivSuite.001594e7-dea2-5774-854f-7ac9950e04a0",
  "name": "pixivSuite",
  "version": "1.0.0",
  "author": "lvfeng",
  "description": "Library Squirrel的pixiv套件",
  "contributes": ["taskHandler", "siteBrowser"],
  "activation": {
    "type": "startup"
  },
  "entryFile": "index.mjs"
}
```

**字段说明：**
- `id`: 插件唯一标识，格式为 `<开发者反向域名>.<插件名>.<UUID>`
- `name`: 插件名称
- `version`: 插件版本
- `author`: 作者
- `description`: 描述
- `contributes`: 贡献点列表，声明插件提供的功能
- `activation`: 激活配置
  - `type`: 加载时机 (`startup` | `lazy` | `manual`)
  - `dependencies`: 可选的依赖贡献点
- `entryFile`: 入口文件名

### 2. 激活类型 (ActivationType)

```typescript
enum ActivationType {
  STARTUP = 'startup',  // 主程序启动时加载
  LAZY = 'lazy',        // 按需加载 - 首次使用时加载
  MANUAL = 'manual'    // 手动加载 - 需要显式调用激活
}
```

### 3. 贡献点 (Contribution)

插件通过贡献点向主程序提供功能。当前支持的贡献点类型：

```typescript
// 在 src/main/plugin/types/ContributionTypes.ts 中定义
type ContributionKey = 'taskHandler' | 'siteBrowser'
```

**TaskHandler 贡献点**: 处理任务创建、下载、暂停、恢复、停止等操作。

**SiteBrowser 贡献点**: 提供站点浏览器功能。

### 4. 插件上下文 (PluginContext)

插件通过 `context.app` 对象访问主程序提供的 API：

```typescript
interface PluginContext {
  app: {
    // 窗口管理
    getMainWindow: () => Electron.BrowserWindow
    createWindow: (options: Electron.BrowserWindowConstructorOptions) => Electron.BrowserWindow
    getBrowserWindow: (width?: number, height?: number) => Electron.BrowserWindow

    // 路径解释
    explainPath: (dir: string) => Promise<MeaningOfPath[]>

    // 插件数据存储
    getPluginData: () => Promise<string | undefined>
    setPluginData: (data: string) => Promise<number>

    // 加密存储
    storeEncryptedValue: (plainValue: string, description?: string) => Promise<string>
    getDecryptedValue: (storageKey: string) => Promise<string | undefined>
    removeEncryptedValue: (storageKey: string) => Promise<number>

    // 任务 URL 监听
    registerUrlListener: (listenerPatterns: string[]) => void
    unregisterUrlListener: () => void

    // 站点管理
    addSite: (site: Site[]) => Promise<number>

    // 站点浏览器管理
    registerSiteBrowser: (siteBrowser: SiteBrowserDTO) => void
    unregisterSiteBrowser: (contributionId: string) => void

    // 日志
    logger: {
      info: (message: string, ...args: unknown[]) => void
      debug: (message: string, ...args: unknown[]) => void
      warn: (message: string, ...args: unknown[]) => void
      error: (message: string, ...args: unknown[]) => void
    }
  }
  pluginData: unknown
}
```

## 插件开发示例

### 基本结构

```javascript
// index.mjs
import MyTaskHandler from './MyTaskHandler.mjs'
import myManifest from './plugin.json' with { type: 'json' }

export default async function myPluginFactory(pluginContext) {
    return new MyPlugin(myManifest, pluginContext)
}

class MyPlugin {
    manifest
    context

    constructor(manifest, pluginContext) {
        this.manifest = manifest
        this.context = pluginContext
    }

    async activate() {
        // 注册 URL 监听
        this.context.app.registerUrlListener([
            /^https:\/\/example\.com\/work\/\d+/i
        ])

        // 注册站点浏览器
        this.context.app.registerSiteBrowser({
            pluginPublicId: this.manifest.publicId,
            name: 'MySite',
            imagePath: '/plugins/mysite/icon.png'
        })

        this.context.app.logger.info('插件已激活')
    }

    async deactivate() {
        // 移除监听器
        this.context.app.unregisterUrlListener()

        // 取消注册站点浏览器
        this.context.app.unregisterSiteBrowser(this.manifest.publicId)

        this.context.app.logger.info('插件已停用')
    }

    getContribution(key) {
        if (key === 'taskHandler') {
            return new MyTaskHandler(this.context)
        }
        return undefined
    }
}
```

### 注册站点浏览器

```javascript
// 在 activate() 中
this.context.app.registerSiteBrowser({
    pluginPublicId: this.manifest.publicId,  // 插件公开ID
    name: '站点名称',                         // 显示名称
    imagePath: '/plugins/xxx/icon.png'      // 图标路径
})
```

### 注册 URL 监听

```javascript
// 在 activate() 中
this.context.app.registerUrlListener([
    /^https:\/\/www\.pixiv\.net\/artworks\/(\d+)/i,
    /^https:\/\/pixiv\.me\/(\w+)/i
])
```

### 站点浏览器 DTO

```typescript
// 主程序端类型定义
interface SiteBrowser {
    pluginPublicId: string  // 插件公开ID
    name: string            // 名称
    imagePath: string       // 图片路径
    pluginId?: number      // 插件ID（主程序自动填充）
}
```

## 主程序端管理

### 插件管理器

位置：`src/main/core/PluginManager.ts`

```typescript
class PluginManager {
    // 加载插件
    async load(pluginId: number): Promise<PluginInstance>

    // 激活插件
    async activate(pluginId: number): Promise<void>

    // 停用插件
    async deactivate(pluginId: number): Promise<void>

    // 获取贡献点
    async getContribution<K extends ContributionKey>(pluginId: number, key: K): Promise<ContributionMap[K]>
}
```

### 站点浏览器管理器

位置：`src/main/core/classes/SiteBrowserManager.ts`

```typescript
class SiteBrowserManager {
    register(siteBrowser: SiteBrowserDTO): void
    unregister(contributionId: string): void
    list(): SiteBrowserDTO[]
    getById(id: string): SiteBrowserDTO | undefined
    getByPluginId(pluginId: number): SiteBrowserDTO | undefined
    queryPage(page: Page<object, SiteBrowserDTO>): Page<object, SiteBrowserDTO>
    clear(): void
}
```

单例访问：`src/main/core/siteBrowserManager.ts`

```typescript
import { createSiteBrowserManager, getSiteBrowserManager } from './core/siteBrowserManager.ts'

// 初始化（在主程序启动时）
createSiteBrowserManager()

// 使用
const manager = getSiteBrowserManager()
const list = manager.list()
```

### 内存分页工具

位置：`src/main/util/PageUtil.ts`

```typescript
class PageUtil {
    // 对数组进行分页
    static paginate<T>(data: T[], pageNumber: number, pageSize: number): T[]

    // 对数组进行分页并返回Page对象
    static paginateWithPage<T, Q>(data: T[], page: Page<Q, T>): Page<Q, T>
}
```

## IPC 通信

### 添加新的插件相关 IPC

1. **在 MainProcessApi.ts 中注册处理器**：

```typescript
Electron.ipcMain.handle(
    'siteBrowser-queryPage',
    createHandler('siteBrowser-queryPage', (page: Page<object, SiteBrowserDTO>) => {
        const manager = getSiteBrowserManager()
        return manager.queryPage(page)
    })
)
```

2. **在 preload/index.ts 中添加 API**：

```typescript
siteBrowserQueryPage: (args) => Electron.ipcRenderer.invoke('siteBrowser-queryPage', args),
```

3. **在 preload/index.d.ts 中添加类型**：

```typescript
siteBrowserQueryPage: function
```

4. **在前端组件中调用**：

```typescript
const response = await window.api.siteBrowserQueryPage(page)
if (ApiUtil.check(response)) {
    const data = ApiUtil.data(response)
    // 处理数据
}
```

## 扩展插件 API

### 在 PluginContext.ts 中添加新接口

```typescript
import SomeDTO from '@shared/model/dto/SomeDTO.ts'

export interface PluginContext {
    app: {
        // 新增接口
        newFeature: (param: SomeDTO) => Promise<void>
    }
}
```

### 在 PluginManager.ts 中实现

```typescript
import { getSomeManager } from '../core/someManager.ts'

return {
    app: {
        // ... 其他接口
        newFeature: async (param: SomeDTO) => {
            const manager = getSomeManager()
            return manager.doSomething(param)
        }
    }
}
```

### 在插件端同步更新

在插件的 `lsLib/plugin/AppApi.mjs` 中添加 JSDoc 类型定义：

```javascript
/**
 * @typedef {Object} AppApi
 * @property {function(SomeDTO): Promise<void>} newFeature - 新功能描述
 */
```

## 目录位置速查

| 任务 | 文件位置 |
|-----|--------|
| 插件管理器 | `src/main/plugin/PluginManager.ts` |
| 插件上下文 | `src/main/plugin/types/PluginContext.ts` |
| 贡献点类型 | `src/main/plugin/types/ContributionTypes.ts` |
| 站点浏览器管理器 | `src/main/core/classes/SiteBrowserManager.ts` |
| 插件 IPC 注册 | `src/main/core/MainProcessApi.ts` |
| Preload API | `src/preload/index.ts` |
| Preload 类型 | `src/preload/index.d.ts` |
| 插件示例 | `LibrarySquirrel-plugin/pixiv/src/index.mjs` |
| 插件 API 类型 | `LibrarySquirrel-plugin/pixiv/src/lsLib/plugin/AppApi.mjs` |
