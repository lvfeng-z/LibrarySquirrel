# UI 重构计划：从 Slot 系统迁移到 Vue Router

## 一、背景说明

当前项目已实现基于 Slot 系统的动态视图系统，但在实际使用中存在以下问题：

1. **无 URL 支持** - 页面切换不产生 URL，无法使用浏览器前进/后退
2. **无法分享/收藏** - 无法直接通过链接打开特定页面
3. **状态管理复杂** - 需要手动管理 activeViewId 和页面状态
4. **不符合主流趋势** - 现代 Vue 应用普遍使用 Vue Router

本计划旨在保留 Slot 系统灵活性的同时，引入 Vue Router 实现路由化管理。

---

## 二、当前 UI 结构分析

### 2.1 现有架构（无 Vue Router）

```
App.vue (根组件)
 ├── el-container
 │    ├── el-aside (侧边栏)
 │    │    └── DynamicSideMenu.vue (读取 SlotRegistryStore 生成菜单)
 │    └── el-main
 │         └── ViewSlotRenderer.vue (根据 activeViewId 动态渲染组件)
 ├── 通知列表弹窗
 ├── 路径解释弹窗
 ├── 任务确认弹窗
 └── el-tour 向导
```

### 2.2 核心状态管理

| Store | 职责 |
|-------|------|
| `SlotRegistryStore` | 管理 viewSlots、menuSlots、activeViewId |
| `UsePageStatesStore` | 管理 PageState 和页面切换 |

### 2.3 现有页面注册方式

```typescript
// useBuiltinMenus.ts
store.registerViewSlot({
  id: 'mainPage',
  name: '主页',
  component: () => import('@renderer/components/main/MainPageWrapper.vue'),
  order: 0
})
```

### 2.4 现有导航方式

```typescript
// PageUtil.ts
await pageStore.showPluginView('localTagManage')

// 或
await gotoPage(PageEnum.Settings)
```

---

## 三、目标 UI 结构

```
App.vue (根组件)
 └── <router-view> (根视图)
      └── MainLayout.vue (布局组件)
           ├── DynamicSideMenu.vue (读取路由 meta 生成菜单)
           ├── NotificationList.vue (常驻通知)
           ├── 其他常驻组件...
           └── <router-view> (嵌套视图)
                ├── Home.vue (主页)
                ├── Settings.vue (设置)
                ├── LocalTagManage.vue (本地标签)
                └── [PluginPage].vue (插件页面)
```

---

## 四、差异分析

| 方面 | 当前实现 | 目标实现 |
|------|----------|----------|
| **路由系统** | 无，使用 Store 驱动视图切换 | Vue Router，URL 驱动视图 |
| **页面注册** | Store API (`registerViewSlot`) | 路由配置 (`routes`) |
| **菜单生成** | 读取 `SlotRegistryStore.menuSlots` | 读取路由 `meta` 信息 |
| **导航方式** | `gotoPage(PageEnum)` | `router.push('/settings')` |
| **URL 支持** | 无 | 支持浏览器前进/后退、deep link |
| **布局组件** | 全部在 `App.vue` | 新增 `MainLayout.vue` |
| **插件页面** | Store 注册 `viewId` | 动态添加路由 |

---

## 五、重构实施计划

### 阶段 1：基础设施搭建

#### 1.1 安装 Vue Router
```bash
yarn add vue-router
```

#### 1.2 创建路由配置目录
```
src/renderer/src/router/
├── index.ts        # Router 实例配置
└── routes.ts       # 路由定义
```

#### 1.3 修改 main.ts
- 引入 Vue Router
- 配置 Router 实例
- 挂载到 Vue 应用

---

### 阶段 2：创建布局组件

#### 2.1 创建 MainLayout.vue
- 从 `App.vue` 提取侧边栏布局
- 保留常驻组件（通知列表、弹窗等）
- 包含嵌套 `<router-view>`

#### 2.2 重构 App.vue
```vue
<template>
  <router-view />
</template>
```

---

### 阶段 3：迁移页面路由

#### 3.1 创建路由配置

```typescript
// router/routes.ts
export const routes = [
  {
    path: '/',
    component: () => import('@renderer/src/views/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('@renderer/components/main/MainPageWrapper.vue'),
        meta: {
          title: '主页',
          icon: 'HomeFilled',
          order: 0
        }
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@renderer/components/subpage/Settings.vue'),
        meta: {
          title: '设置',
          icon: 'Setting',
          order: 70
        }
      },
      // 其他内置页面...
    ]
  }
]
```

#### 3.2 修改 DynamicSideMenu.vue

```typescript
// 从读取 Store 改为读取路由配置
import { useRouter } from 'vue-router'

const router = useRouter()

// 从路由配置生成菜单
const menuItems = computed(() => {
  return router.getRoutes()
    .filter(route => route.meta?.title)
    .sort((a, b) => (a.meta.order ?? 100) - (b.meta.order ?? 100))
})
```

---

### 阶段 4：导航适配

#### 4.1 更新 PageUtil.ts

```typescript
// 保持向后兼容
import { useRouter } from 'vue-router'

const router = useRouter()

export async function gotoPage(pageEnum: PageEnum) {
  const routeMap = {
    [PageEnum.MainPage]: '/',
    [PageEnum.Settings]: '/settings',
    // ...
  }

  const path = routeMap[pageEnum]
  if (path) {
    await router.push(path)
  }
}
```

#### 4.2 更新 SlotRegistryStore

```typescript
// 扩展支持路由注册
import { createRouter, type Router } from 'vue-router'

let router: Router | null = null

export function setRouter(routerInstance: Router) {
  router = routerInstance
}

export function addRoute(route: RouteRecordRaw) {
  if (router) {
    router.addRoute('main', route)
  }
}
```

---

### 阶段 5：插件系统适配

#### 5.1 动态路由注册

```typescript
// 插件安装时添加路由
function installPlugin(plugin: Plugin) {
  if (plugin.views) {
    plugin.views.forEach(view => {
      addRoute({
        path: view.path,
        name: view.id,
        component: () => view.component(),
        meta: {
          title: view.name,
          icon: view.icon,
          isPlugin: true
        }
      })
    })
  }
}

// 插件卸载时移除路由
function uninstallPlugin(pluginId: string) {
  if (router) {
    router.removeRoute(pluginId)
  }
}
```

#### 5.2 插件页面组件

```typescript
// 插件入口文件
export default {
  registerViews(registry: ViewRegistry) {
    registry.registerView({
      id: 'my-plugin-dashboard',
      name: '数据大屏',
      path: '/plugin/my-plugin/dashboard',
      icon: 'DataAnalysis',
      component: () => import('./views/Dashboard.vue')
    })
  }
}
```

---

## 六、关键文件变更清单

### 新增文件

| 文件路径 | 说明 |
|----------|------|
| `src/renderer/src/router/index.ts` | Vue Router 实例配置 |
| `src/renderer/src/router/routes.ts` | 路由配置定义 |
| `src/renderer/src/views/MainLayout.vue` | 主布局组件 |

### 修改文件

| 文件路径 | 变更内容 |
|----------|----------|
| `src/renderer/src/main.ts` | 添加 Vue Router 配置 |
| `src/renderer/src/App.vue` | 简化为仅包含 `<router-view>` |
| `src/renderer/src/components/slot/DynamicSideMenu.vue` | 改为读取路由配置 |
| `src/renderer/src/composables/useBuiltinMenus.ts` | 适配路由系统 |
| `src/renderer/src/utils/PageUtil.ts` | 使用 router 导航 |
| `src/renderer/src/store/UsePageStatesStore.ts` | 适配路由系统 |
| `src/renderer/src/store/SlotRegistryStore.ts` | 支持动态路由注册 |

### 后续可删除文件（待确认无依赖后）

| 文件路径 | 说明 |
|----------|------|
| `src/renderer/src/constants/PageState.ts` | PageEnum 可保留用于兼容 |
| `src/renderer/src/model/slot/ViewSlot.ts` | 部分功能可被路由替代 |

---

## 七、兼容性考虑

### 7.1 渐进式迁移
- 保持 PageEnum 和路由并存一段时间
- 逐步将页面迁移到路由
- `gotoPage()` 函数内部适配到路由

### 7.2 URL 同步
- 确保浏览器后退/前进按钮正常工作
- 支持 deep link 直接打开页面
- 刷新页面保持当前视图

### 7.3 插件兼容
- 插件的视图注册 API 保持兼容
- 内部自动转换为路由注册
- 提供迁移指南

---

## 八、预期收益

| 收益 | 说明 |
|------|------|
| **更好的 UX** | 浏览器原生导航支持、URL 可分享 |
| **更好的开发体验** | 路由级别代码分割、清晰的路由组织 |
| **更好的维护性** | 声明式路由配置、Vue 生态最佳实践 |
| **更好的调试** | Vue Devtools 路由调试支持 |

---

## 九、实施建议

1. **分阶段实施** - 每个阶段独立测试后再进入下一阶段
2. **保留向后兼容** - 避免一次性大规模重构导致功能回退
3. **充分测试** - 特别是浏览器前进/后退、deep link 场景
4. **文档更新** - 更新内部开发文档说明新的路由结构
