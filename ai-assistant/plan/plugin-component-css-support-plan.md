# 插件组件CSS样式支持开发计划

## 需求概述

修改插件系统的 component 类型上下文，使其支持同时提供 JS 文件和 CSS 文件。解决插件打包后 Vue 组件的样式缺失问题。

## 需求详情

### 功能列表

1. **修改 SlotTypes 定义**
   - 扩展 `content` 字段，支持字符串（向后兼容）和对象（包含 js 和 css 路径）两种形式
   - 定义新的类型 `ComponentContent` 来表示组件内容

2. **渲染进程 CSS 加载**
   - 在加载 JS 组件之前，先通过 `<link>` 标签加载 CSS 文件
   - 使用 `data-plugin-id` 属性标识 CSS 所属插件
   - 维护插件 CSS 加载状态，避免重复加载

3. **CSS 清理机制**
   - 插件失效（插槽注销）时，移除该插件提供的所有 CSS
   - 通过 `data-plugin-id` 属性查找并移除对应的 `<link>` 标签

### 用户场景

1. 插件开发者注册插槽时，传入包含 js 和 css 路径的对象：
   ```typescript
   context.slots.registerViewSlot({
     id: 'my-plugin-view',
     name: '我的视图',
     contentType: 'component',
     content: {
       js: 'resource://plugin/my-plugin/dist/views/MyView.js',
       css: 'resource://plugin/my-plugin/dist/views/MyView.css'
     }
   })
   ```

2. 插槽注销时，CSS 自动清理：
   ```typescript
   context.slots.unregisterSlot('my-plugin-view')
   // 自动移除对应的 <link> 标签
   ```

### 数据模型

- 修改 `src/main/plugin/types/SlotTypes.ts`:
  - 新增类型 `ComponentContent = string | { js: string; css: string }`
  - 修改 `EmbedSlotConfig.content`, `PanelSlotConfig.content`, `ViewSlotConfig.content` 的类型

- 修改 `src/renderer/src/composables/useSlotSyncListener.ts`:
  - 新增 `SyncComponentContent` 类型
  - 新增 CSS 加载和清理函数

### 边界条件

- **向后兼容**: content 为字符串时，按原有逻辑处理
- **CSS 不存在**: content 只有 js 路径时，正常加载组件
- **重复加载**: 同一插件的 CSS 已加载时，跳过重复加载
- **组件加载失败**: CSS 加载成功但组件加载失败时，需要回滚 CSS

## 技术方案

### 涉及模块

- `src/main/plugin/types/SlotTypes.ts` - 主进程插槽类型定义
- `src/renderer/src/composables/useSlotSyncListener.ts` - 渲染进程组件加载逻辑

### 技术要点

1. **类型设计**
   - 使用联合类型实现向后兼容：`string | { js: string; css?: string }`
   - CSS 路径可选，允许只有 js 的情况

2. **CSS 加载时机**
   - 在 dynamic import 组件之前，先创建 `<link>` 标签
   - 使用 `link.onload` 事件确保 CSS 加载完成后再加载组件

3. **CSS 标识与清理**
   - `<link>` 标签添加 `data-plugin-id` 属性
   - 插件失效时，通过属性选择器 `[data-plugin-id="${pluginId}"]` 查找并移除

4. **渲染进程与主进程通信**
   - SlotTypes 在主进程定义，需要同步到渲染进程
   - `useSlotSyncListener.ts` 中的 `SyncSlotConfig` 需要与主进程类型一致

## 开发步骤

### Phase 1: 类型定义修改

1. 修改 `src/main/plugin/types/SlotTypes.ts`:
   - 新增 `ComponentContent` 类型
   - 修改 `EmbedSlotConfig`, `PanelSlotConfig`, `ViewSlotConfig` 的 content 字段类型

### Phase 2: 渲染进程加载逻辑修改

2. 修改 `src/renderer/src/composables/useSlotSyncListener.ts`:
   - 新增 `SyncComponentContent` 类型定义
   - 新增 `loadPluginStyles` 函数：加载 CSS 文件
   - 新增 `unloadPluginStyles` 函数：移除 CSS 文件
   - 修改 `loadPluginComponent` 函数：先加载 CSS，再加载组件
   - 修改插槽注销逻辑：调用 `unloadPluginStyles`

### Phase 3: 类型同步

3. 验证主进程和渲染进程的类型一致性
4. 运行类型检查确保无类型错误

## 验收标准

- [ ] `content` 字段支持字符串和对象两种形式
- [ ] 使用 `<link>` 标签加载 CSS，且带有 `data-plugin-id` 属性
- [ ] CSS 在组件 JS 加载之前完成加载
- [ ] 插槽注销时自动移除对应的 CSS
- [ ] 向后兼容：原有的字符串形式仍然正常工作
- [ ] 类型检查通过 (`yarn typecheck`)
- [ ] ESLint 检查通过 (`yarn lint`)

## 预计工作量

约 2-3 小时，主要工作量在于：
- 类型定义修改（0.5 小时）
- CSS 加载和清理逻辑实现（1.5 小时）
- 测试和修复（1 小时）
