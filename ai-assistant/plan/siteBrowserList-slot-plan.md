# 站点浏览器列表插槽开发计划

## 需求概述

将插件注册站点浏览器时修改 UI 的功能分离出来，作为一个与 menu 同级的 UI 类型 `siteBrowserList`。该插槽类型允许插件在站点浏览器列表页面中注册自己的入口卡片。

## 需求详情

### 功能列表

1. **新增 siteBrowserList 插槽类型**
   - 在插件插槽系统中添加新的插槽类型 `siteBrowserList`
   - 配置属性与 SiteBrowserDTO 相同（包含 contributionId, pluginPublicId, name, imagePath, pluginId）
   - 作为独立插槽类型，与 menu、view、embed、panel 同级

2. **主进程插槽注册支持**
   - 在 PluginContext 中添加 `registerSiteBrowserSlot` API
   - 在 SlotTypes 中定义 `SiteBrowserListSlotConfig` 类型
   - 在 SlotSyncService 中支持新类型同步

3. **渲染进程插槽管理**
   - 在 SlotRegistryStore 中添加 `siteBrowserSlots` 存储
   - 在 useSlotSyncListener 中处理 `siteBrowserList` 类型同步

4. **UI 渲染集成**
   - 修改 SiteBrowserManage.vue 使用插槽渲染列表
   - 同时支持原有 registerSiteBrowser 方式和新的插槽方式

### 用户场景

插件开发者可以通过以下两种方式在站点浏览器列表页面展示入口：

1. **新方式（插槽）**：使用 `slots.registerSiteBrowserSlot(config)`
2. **原有方式**：使用 `app.registerSiteBrowser(siteBrowser)`

两种方式并行存在，保持向后兼容。

### 数据模型

**SiteBrowserListSlotConfig**（新增）:
```typescript
interface SiteBrowserListSlotConfig extends BaseSlotConfig {
  type: 'siteBrowserList'
  // 与 SiteBrowserDTO 相同
  contributionId: string
  pluginPublicId: string
  name: string
  imagePath: string
}
```

### API 设计

| 方法 | 类型 | 说明 |
|------|------|------|
| slots.registerSiteBrowserSlot | 插件 API | 注册站点浏览器列表插槽 |
| slots.registerSlots | 插件 API | 批量注册插槽（需支持 siteBrowserList） |

### 边界条件

1. **重复注册**：相同 contributionId 的插槽应该被覆盖
2. **插件卸载**：插件卸载时需要自动注销所有相关的 siteBrowserList 插槽
3. **向后兼容**：原有的 `app.registerSiteBrowser` API 继续可用

## 技术方案

### 涉及模块

| 模块 | 文件 | 变更内容 |
|------|------|----------|
| 主进程类型 | src/main/plugin/types/SlotTypes.ts | 新增 SiteBrowserListSlotConfig |
| 插件上下文 | src/main/plugin/types/PluginContext.ts | 新增 registerSiteBrowserSlot API |
| 插件管理器 | src/main/plugin/PluginManager.ts | 实现插槽注册逻辑 |
| 插槽同步服务 | src/main/core/SlotSyncService.ts | 类型定义更新 |
| 渲染层 Store | src/renderer/src/store/SlotRegistryStore.ts | 新增 siteBrowserSlots |
| 插槽同步监听 | src/renderer/src/composables/useSlotSyncListener.ts | 处理新类型 |
| Preload 桥接 | src/preload/index.ts | 暴露 IPC 方法 |
| 站点浏览器页面 | src/renderer/src/components/subpage/SiteBrowserManage.vue | 使用插槽渲染 |

### 技术要点

1. **插槽类型定义**：在 SlotConfig 联合类型中添加 `SiteBrowserListSlotConfig`
2. **数据同步**：复用现有的 SlotSyncService 机制，将新类型同步到渲染进程
3. **渲染兼容**：在 SiteBrowserManage.vue 中合并两种数据源（插槽 + 原有 API）

## 开发步骤

### Phase 1: 主进程类型定义

1. **修改 SlotTypes.ts**
   - 新增 `SiteBrowserListSlotConfig` 接口
   - 将其添加到 `SlotConfig` 联合类型
   - 更新 `ComponentContent` 相关类型定义（如需要）

2. **修改 PluginContext.ts**
   - 添加 `registerSiteBrowserSlot` 方法签名
   - 更新 `registerSlots` 方法的泛型类型

### Phase 2: 插件管理器实现

3. **修改 PluginManager.ts**
   - 在 `createPluginContext` 中实现 `registerSiteBrowserSlot`
   - 更新 `registerSlots` 方法以支持 `siteBrowserList` 类型

### Phase 3: 渲染进程集成

4. **修改 SlotRegistryStore.ts**
   - 新增 `siteBrowserSlots` Map 存储
   - 新增 `allSiteBrowserSlots` getter
   - 新增 `registerSiteBrowserSlot` / `registerSiteBrowserSlots` / `unregisterSiteBrowserSlot` 方法
   - 更新 `reset` 方法

5. **修改 useSlotSyncListener.ts**
   - 新增 `SyncSiteBrowserListConfig` 接口
   - 新增 `convertToSiteBrowserListSlot` 转换函数
   - 在各事件处理中添加 `siteBrowserList` 类型分支

6. **修改 preload/index.ts**
   - 添加 `onSlotSiteBrowserListRegister` 事件监听（如果需要）
   - 确保插槽同步事件能正确传递

### Phase 4: UI 渲染

7. **修改 SiteBrowserManage.vue**
   - 导入插槽 store
   - 使用 `allSiteBrowserSlots` 渲染插件注册的站点浏览器卡片
   - 与原有 `siteBrowserList` 数据合并显示

### Phase 5: 清理与测试

8. **可选：移除旧 API 依赖**
   - 如果确定不再需要原有的 `registerSiteBrowser` 修改 UI 的功能
   - 可以考虑在适当时机移除 `app.registerSiteBrowser` 相关逻辑
   - **注意：此步骤需要与用户确认后再执行**

## 验收标准

- [ ] `SiteBrowserListSlotConfig` 类型正确定义
- [ ] 插件可以使用 `slots.registerSiteBrowserSlot` 注册插槽
- [ ] 插槽可以正确同步到渲染进程
- [ ] `SiteBrowserManage.vue` 正确显示插槽注册的站点浏览器卡片
- [ ] 原有 `app.registerSiteBrowser` 方式继续可用（向后兼容）
- [ ] 类型检查通过 (`yarn typecheck`)
- [ ] ESLint 检查通过 (`yarn lint`)
- [ ] 构建成功 (`yarn build`)

## 预计工作量

预计需要修改 7 个文件，总代码增量约 100-150 行。

## 相关文件路径

- `src/main/plugin/types/SlotTypes.ts`
- `src/main/plugin/types/PluginContext.ts`
- `src/main/plugin/PluginManager.ts`
- `src/main/core/SlotSyncService.ts`
- `src/renderer/src/store/SlotRegistryStore.ts`
- `src/renderer/src/composables/useSlotSyncListener.ts`
- `src/preload/index.ts`
- `src/renderer/src/components/subpage/SiteBrowserManage.vue`
