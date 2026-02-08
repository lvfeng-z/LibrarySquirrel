# LibrarySquirrel 架构速查

## 核心业务概念（一句话总结）

| 概念 | 定义 | 关键服务 |
|------|------|----------|
| **站点** | 远程作品源（如pixiv、bilibili） | `SiteService.ts` |
| **作品** | 资源与信息的集合（核心数据实体） | `WorkService.ts` |
| **任务** | 作品创建执行流程 | `TaskService.ts` |
| **站点作者** | 来自站点的原始作者 | `SiteAuthorService.ts` |
| **本地作者** | 本地创建，用于统一跨站点作者身份 | `LocalAuthorService.ts` |
| **站点标签** | 来自站点的原始标签 | `SiteTagService.ts` |
| **本地标签** | 本地创建，用于统一跨站点标签 | `LocalTagService.ts` |
| **插件** | 扩展对不同站点的支持 | `PluginService.ts` |

## 关键业务逻辑

### 双架构统一检索模式
- **本地作者** ↔ **站点作者**：关联后，搜索本地作者可检索所有关联站点的作品
- **本地标签** ↔ **站点标签**：关联后，搜索本地标签可检索所有关联站点的作品

### 作品下载流程
```
URL输入 → 任务创建 → 插件执行 → 获取作品信息 → 保存作品
                                    ↓
                              创建站点作者/标签
```

### 统一检索优势
- **一次检索，全站结果**：通过本地实体关联实现跨站点统一检索
- **语义统一**：不同站点的相似标签/作者可统一管理

## 技术架构速查

### 前端架构 (Renderer)
- **框架**：Vue 3 + Composition API + Element Plus
- **状态管理**：Pinia stores (`Use*Store.ts`)
- **组件模式**：`<script setup lang="ts">` + Props后缀
- **路径别名**：`@renderer/*` → `src/renderer/src/*`

### 后端架构 (Main Process)
- **IPC模式**：`ipcRenderer.invoke('service-method', args)`
- **API注册**：`MainProcessApi.ts` 集中注册所有服务方法
- **数据库**：better-sqlite3 + DAO模式 + SAVEPOINT事务
- **自定义协议**：`resource://` 处理本地文件访问

### 核心目录
```
src/main/
├── service/     # 业务服务层
├── model/       # 数据模型
├── dao/         # 数据访问层
├── plugin/      # 插件系统
├── core/        # 核心组件（MainProcessApi, taskQueue）
└── resources/   # 配置文件

src/renderer/src/
├── components/  # Vue组件
├── store/       # Pinia状态管理
└── apis/        # IPC API包装器
```

## 开发模式

### 添加新服务
1. 在 `src/main/service/` 创建Service类
2. 在 `MainProcessApi.ts` 注册IPC处理器
3. 在 `preload/index.ts` 添加API包装器
4. 在前端通过 `window.api.serviceNameMethodName()` 调用

### 数据库事务
```typescript
await db.transaction(async (tx) => {
  await tx.run('INSERT ...');
  await tx.run('UPDATE ...');
}, 'operation-name');
```

### 响应格式
- 成功：`ApiUtil.response(data)`
- 错误：`ApiUtil.error(message)`

## 插件系统要点
- 插件存储在 `plugin/package/` 目录
- 每个插件是独立包（作者、名称、版本）
- 插件通过 `PluginFactory.ts` 实例化
- 任务执行由 `TaskHandler.ts` 处理

## 典型开发场景

### 场景1：添加新功能
1. 确定需要哪些Service
2. 创建或修改数据库表（`createDataTables.yml`）
3. 实现业务逻辑（Service层）
4. 注册IPC方法
5. 创建前端组件

### 场景2：修复业务逻辑
1. 定位相关Service类
2. 检查数据库操作（DAO层）
3. 验证IPC调用链
4. 测试前后端集成

### 场景3：扩展插件功能
1. 修改插件接口定义
2. 更新插件实现
3. 调整任务处理逻辑
4. 确保向后兼容

## 快速调试
- **前端调试**：检查 `window.api` 调用和Pinia状态
- **后端调试**：查看 `LogUtil` 输出
- **数据库调试**：检查SQL执行和事务
- **IPC调试**：验证方法名匹配（`service-method` ↔ `serviceMethod`）