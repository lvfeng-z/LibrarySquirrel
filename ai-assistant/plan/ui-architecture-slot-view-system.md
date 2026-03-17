# UI 架构重构方案：插槽 + 动态视图系统

## 1. 现状分析

### 1.1 当前架构问题

根据 `src/renderer/src/` 现有代码分析：

| 问题       | 位置                 | 影响                              |
| ---------- | -------------------- | --------------------------------- |
| 页面硬编码 | `App.vue:584-600`    | 插件无法添加新页面                |
| 状态硬编码 | `PageState.ts:32-47` | 新页面需修改源码                  |
| 导航硬编码 | `App.vue:411-466`    | 插件无法动态添加导航项            |
| 布局写死   | `App.vue:468-583`    | 主工作区只能显示主页/子页面二选一 |

### 1.2 当前页面渲染模式

```
App.vue
├── SideMenu (左侧导航) ← 硬编码 el-menu-item
└── el-main
    ├── main-page (主页/作品网格) ← v-show 控制
    └── subPage (子页面) ← v-if 控制，组件硬编码
```

---

## 2. 目标架构

### 2.1 三层插槽系统

```
┌─────────────────────────────────────────────────────────┐
│                    Activity Bar (左侧导航)               │
├─────────────────────────────────────────────────────────┤
│  内置项  │  插件视图入口1  │  插件视图入口2  │  ...       │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                     主工作区 (Main Workspace)            │
│  ┌─────────────────────────────────────────────────┐   │
│  │              动态视图加载器 (ViewSlot)            │   │
│  │   插件A的Dashboard  │ 插件B的配置页 │ 内置页面    │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 2.2 插槽分类

| 插槽类型       | 位置                     | 用途               | 插件能力         |
| -------------- | ------------------------ | ------------------ | ---------------- |
| **Micro-Slot** | 顶部工具栏、状态栏       | 快速操作、状态指示 | 动态更新微件状态 |
| **Panel-Slot** | 侧边栏、右侧属性栏、底部 | 导航树、列表、属性 | 注入完整组件     |
| **View-Slot**  | 主工作区                 | 核心业务界面       | 提供完整页面     |

---

## 3. 实现方案

### 3.1 核心类型定义

创建 `src/renderer/src/model/slot/` 目录：

```typescript
// model/slot/ViewSlot.ts
export interface ViewSlot {
  id: string // 唯一标识，如 "plugin-xxx-dashboard"
  name: string // 显示名称，如 "数据大屏"
  icon?: string // Element Plus 图标名
  component: () => Promise<any> // 动态导入组件
  order?: number // 排序权重
}

// model/slot/MicroSlot.ts
export interface MicroSlot {
  id: string
  position: 'topbar' | 'statusbar' | 'toolbar'
  component: () => Promise<any>
  props?: Record<string, any>
}

// model/slot/PanelSlot.ts
export interface PanelSlot {
  id: string
  position: 'left-sidebar' | 'right-sidebar' | 'bottom'
  width?: number // 面板宽度
  component: () => Promise<any>
}
```

### 3.2 插槽注册中心

创建 `src/renderer/src/store/SlotRegistryStore.ts`：

```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ViewSlot, MicroSlot, PanelSlot } from '@renderer/model/slot'

export const useSlotRegistryStore = defineStore('slotRegistry', {
  state: () => ({
    viewSlots: ref<Map<string, ViewSlot>>(new Map()),
    microSlots: ref<Map<string, MicroSlot>>(new Map()),
    panelSlots: ref<Map<string, PanelSlot>>(new Map()),
    activeViewId: ref<string | null>(null)
  }),

  actions: {
    // 注册视图插槽
    registerViewSlot(slot: ViewSlot) {
      this.viewSlots.set(slot.id, slot)
    },

    // 取消注册
    unregisterViewSlot(id: string) {
      if (this.activeViewId === id) {
        this.activeViewId = null
      }
      this.viewSlots.delete(id)
    },

    // 注册微件插槽
    registerMicroSlot(slot: MicroSlot) {
      this.microSlots.set(slot.id, slot)
    },

    // 注册面板插槽
    registerPanelSlot(slot: PanelSlot) {
      this.panelSlots.set(slot.id, slot)
    },

    // 切换视图
    async switchView(viewId: string) {
      const slot = this.viewSlots.get(viewId)
      if (slot) {
        this.activeViewId = viewId
      }
    },

    // 获取所有视图（用于导航渲染）
    getAllViewSlots(): ViewSlot[] {
      return Array.from(this.viewSlots.values()).sort((a, b) => (a.order ?? 100) - (b.order ?? 100))
    }
  }
})
```

### 3.3 插件视图加载器组件

创建 `src/renderer/src/components/slot/ViewSlotRenderer.vue`：

```vue
<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useSlotRegistryStore } from '@renderer/store/SlotRegistryStore'

const store = useSlotRegistryStore()

const activeSlot = computed(() => {
  if (!store.activeViewId) return null
  return store.viewSlots.get(store.activeViewId) || null
})

const activeComponent = computed(() => {
  if (!activeSlot.value) return null
  // 使用异步组件实现动态加载
  return defineAsyncComponent({
    loader: activeSlot.value.component,
    loadingComponent: { template: '<div>加载中...</div>' }
  })
})
</script>

<template>
  <div class="view-slot-container">
    <component :is="activeComponent" v-if="activeComponent" v-bind="activeSlot?.props" />
    <div v-else class="view-slot-empty">请选择一个视图</div>
  </div>
</template>

<style scoped>
.view-slot-container {
  width: 100%;
  height: 100%;
}
</style>
```

### 3.4 动态导航栏组件

重构 `App.vue` 中的 SideMenu，改为动态渲染：

```vue
<!-- components/slot/DynamicSideMenu.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useSlotRegistryStore } from '@renderer/store/SlotRegistryStore'

const store = useSlotRegistryStore()

// 内置导航项
const builtinItems = [
  { index: 'main', icon: 'HomeFilled', label: '主页', page: 'mainPage' }
  // ...其他内置项
]

// 插件视图项
const pluginItems = computed(() =>
  store.getAllViewSlots().map((slot) => ({
    index: slot.id,
    icon: slot.icon || 'Guide',
    label: slot.name,
    isPlugin: true
  }))
)

function handleSelect(index: string) {
  const builtin = builtinItems.find((item) => item.index === index)
  if (builtin) {
    // 处理内置页面
    return
  }
  // 切换到插件视图
  store.switchView(index)
}
</script>

<template>
  <el-menu :default-active="activeIndex" @select="handleSelect">
    <!-- 内置项 -->
    <el-menu-item v-for="item in builtinItems" :key="item.index" :index="item.index">
      <el-icon><component :is="item.icon" /></el-icon>
      <span>{{ item.label }}</span>
    </el-menu-item>

    <!-- 分割线 -->
    <el-divider v-if="pluginItems.length > 0" />

    <!-- 插件视图项 -->
    <el-menu-item v-for="item in pluginItems" :key="item.index" :index="item.index">
      <el-icon><component :is="item.icon" /></el-icon>
      <span>{{ item.label }}</span>
    </el-menu-item>
  </el-menu>
</template>
```

### 3.5 主工作区改造

改造 `App.vue` 的主工作区逻辑：

```vue
<!-- App.vue 片段 -->
<template>
  <el-main style="padding: 0">
    <!-- 内置主页（保留） -->
    <div v-show="isMainPage" class="main-page">
      <!-- 现有代码... -->
    </div>

    <!-- 子页面（保留兼容） -->
    <div v-if="isSubPage" class="subPage">
      <!-- 现有代码... -->
    </div>

    <!-- 新的视图插槽渲染区 -->
    <view-slot-renderer v-if="isPluginView" />
  </el-main>
</template>

<script setup>
import { computed } from 'vue'
import { useSlotRegistryStore } from '@renderer/store/SlotRegistryStore'
import { usePageStatesStore } from '@renderer/store/UsePageStatesStore'

const slotStore = useSlotRegistryStore()
const pageStore = usePageStatesStore()

const isMainPage = computed(() => pageStore.pageStates.mainPage.state)
const isSubPage = computed(() => pageStore.pageStates.subPage.state)
const isPluginView = computed(() => slotStore.activeViewId !== null)
</script>
```

---

## 4. 插件端接口

### 4.1 插件暴露视图接口

在插件的入口文件中：

```typescript
// plugin/index.ts
import type { ViewSlot, MicroSlot, PanelSlot } from '@library-squirrel/renderer'

export default {
  name: 'data-dashboard',
  version: '1.0.0',

  // 注册视图插槽
  registerViews(registry: {
    registerViewSlot: (slot: ViewSlot) => void
    registerMicroSlot: (slot: MicroSlot) => void
    registerPanelSlot: (slot: PanelSlot) => void
  }) {
    // 注册主视图
    registry.registerViewSlot({
      id: 'data-dashboard',
      name: '数据大屏',
      icon: 'DataAnalysis',
      order: 10,
      component: () => import('./views/Dashboard.vue')
    })

    // 注册顶部微件
    registry.registerMicroSlot({
      id: 'data-dashboard-progress',
      position: 'topbar',
      component: () => import('./widgets/ProgressWidget.vue')
    })
  },

  // 卸载时清理
  unregister(registry: { unregisterViewSlot: (id: string) => void; unregisterMicroSlot: (id: string) => void }) {
    registry.unregisterViewSlot('data-dashboard')
    registry.unregisterMicroSlot('data-dashboard-progress')
  }
}
```

### 4.2 主进程暴露注册方法

在 `src/preload/index.ts` 添加：

```typescript
// 插件系统 - 插槽注册
slotRegisterViewSlot: (slot: ViewSlot) => ipcRenderer.invoke('plugin-register-view-slot', slot),
slotRegisterMicroSlot: (slot: MicroSlot) => ipcRenderer.invoke('plugin-register-micro-slot', slot),
slotRegisterPanelSlot: (slot: PanelSlot) => ipcRenderer.invoke('plugin-register-panel-slot', slot),
slotUnregisterViewSlot: (id: string) => ipcRenderer.invoke('plugin-unregister-view-slot', id),
```

---

## 5. 实现步骤

### 阶段一：基础设施（预计 2 天）

1. 创建 `src/renderer/src/model/slot/` 目录及类型定义
2. 创建 `SlotRegistryStore.ts`
3. 创建 `ViewSlotRenderer.vue` 组件

### 阶段二：主界面改造（预计 2 天）

4. 创建 `DynamicSideMenu.vue` 替换现有 SideMenu
5. 改造 `App.vue` 主工作区逻辑
6. 改造 `UsePageStatesStore` 支持插件视图 ID

### 阶段三：微件/面板插槽（预计 2 天）

7. 实现 MicroSlot 渲染器
8. 实现 PanelSlot 渲染器
9. 在工具栏/侧边栏预留插槽

### 阶段四：插件集成（预计 1 天）

10. 修改 PluginLoader 支持插槽注册
11. 编写示例插件验证流程

---

## 6. 向后兼容方案

| 场景       | 兼容策略                                         |
| ---------- | ------------------------------------------------ |
| 现有子页面 | 不保持 `PageState` 体系，通过适配器转为 ViewSlot |
| 现有导航   | 保留硬编码菜单项，插件视图动态追加               |
| 插件无视图 | 正常加载，不影响主程序功能                       |

---

## 7. 文件变更清单

### 新增文件

```
src/renderer/src/
├── model/slot/
│   ├── index.ts              # 统一导出
│   ├── ViewSlot.ts           # 视图插槽类型
│   ├── MicroSlot.ts          # 微件插槽类型
│   └── PanelSlot.ts          # 面板插槽类型
├── store/
│   └── SlotRegistryStore.ts  # 插槽注册中心
└── components/slot/
    ├── ViewSlotRenderer.vue  # 视图渲染器
    ├── MicroSlotRenderer.vue # 微件渲染器
    ├── PanelSlotRenderer.vue # 面板渲染器
    └── DynamicSideMenu.vue   # 动态导航菜单
```

### 修改文件

```
src/renderer/src/
├── App.vue                   # 集成动态插槽
├── store/UsePageStatesStore.ts  # 支持插件视图
├── main.ts                   # (无需修改)
└── components/oneOff/SideMenu.vue  # 保留或移除

src/preload/index.ts          # 添加插槽相关 IPC
```

---

## 8. 风险与注意事项

1. **组件卸载**：动态组件需正确处理生命周期，确保插件卸载时组件被销毁
2. **状态隔离**：不同插件视图的状态应隔离，避免内存泄漏
3. **权限控制**：插件注册的插槽需审核，防止恶意组件
4. **版本兼容**：插件 API 需版本化管理，保持向后兼容

---

## 9. 验收标准

- [ ] 插件可以注册并显示在左侧导航栏
- [ ] 点击插件导航项，主工作区加载对应组件
- [ ] 卸载插件后，导航项自动消失
- [ ] 现有内置页面功能不受影响
- [ ] 微件插槽可在工具栏显示插件组件
