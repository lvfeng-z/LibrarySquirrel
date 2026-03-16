import { useSlotRegistryStore, setRouterInstance, getRouterInstance } from '@renderer/store/SlotRegistryStore'
import { HomeFilled, Discount, User, Star, List, Link, TakeawayBox, Setting, Guide, Coordinate } from '@element-plus/icons-vue'
import { markRaw } from 'vue'
import type { Router } from 'vue-router'

/**
 * 设置 Router 实例
 * 在应用启动时调用
 */
export function initRouterInstance(router: Router) {
  setRouterInstance(router)
}

/**
 * 获取 Router 实例
 */
export function useRouterInstance(): Router | null {
  return getRouterInstance()
}

/**
 * 初始化内置菜单项
 * 在应用启动时调用
 */
export function initBuiltinMenus() {
  const store = useSlotRegistryStore()

  // 注册内置视图（主页和所有子页面）
  const builtinViews = [
    {
      id: 'mainPage',
      name: '主页',
      component: () => import('@renderer/components/main/MainPageWrapper.vue'),
      order: 0,
      isBuiltin: true
    },
    {
      id: 'localTagManage',
      name: '本地标签',
      component: () => import('@renderer/components/subpage/LocalTagManage.vue'),
      order: 10,
      isBuiltin: true
    },
    {
      id: 'siteTagManage',
      name: '站点标签',
      component: () => import('@renderer/components/subpage/SiteTagManage.vue'),
      order: 11,
      isBuiltin: true
    },
    {
      id: 'localAuthorManage',
      name: '本地作者',
      component: () => import('@renderer/components/subpage/LocalAuthorManage.vue'),
      order: 20,
      isBuiltin: true
    },
    {
      id: 'siteAuthorManage',
      name: '站点作者',
      component: () => import('@renderer/components/subpage/SiteAuthorManage.vue'),
      order: 21,
      isBuiltin: true
    },
    {
      id: 'developing',
      name: '收藏',
      component: () => import('@renderer/components/subpage/Developing.vue'),
      order: 30,
      isBuiltin: true
    },
    {
      id: 'taskManage',
      name: '任务',
      component: () => import('@renderer/components/subpage/TaskManage.vue'),
      order: 40,
      isBuiltin: true
    },
    {
      id: 'siteManage',
      name: '站点管理',
      component: () => import('@renderer/components/subpage/SiteManage.vue'),
      order: 50,
      isBuiltin: true
    },
    {
      id: 'siteBrowserManage',
      name: '站点浏览',
      component: () => import('@renderer/components/subpage/SiteBrowserManage.vue'),
      order: 51,
      isBuiltin: true
    },
    {
      id: 'pluginManage',
      name: '插件',
      component: () => import('@renderer/components/subpage/PluginManage.vue'),
      order: 60,
      isBuiltin: true
    },
    {
      id: 'settings',
      name: '设置',
      component: () => import('@renderer/components/subpage/Settings.vue'),
      order: 70,
      isBuiltin: true
    },
    {
      id: 'guide',
      name: '向导',
      component: () => import('@renderer/components/subpage/Guide.vue'),
      order: 80,
      isBuiltin: true
    },
    {
      id: 'test',
      name: '测试按钮',
      component: () => import('@renderer/components/subpage/Test.vue'),
      order: 90,
      isBuiltin: true
    }
  ]

  // 注册视图（使用 registerViewSlotWithRoute 确保路由被添加）
  builtinViews.forEach((view) => store.registerViewSlotWithRoute(view))

  // 批量注册内置菜单（icon 使用 markRaw 避免 reactive 警告）
  store.registerMenuSlots([
    {
      id: 'builtin-main',
      index: 'main',
      icon: markRaw(HomeFilled),
      label: '主页',
      order: 0,
      viewId: 'mainPage'
    },
    {
      id: 'builtin-tag',
      index: 'tag',
      icon: markRaw(Discount),
      label: '标签',
      order: 10,
      children: [
        {
          id: 'builtin-localTag',
          index: 'localTag',
          icon: markRaw(Discount),
          label: '本地标签',
          order: 11,
          viewId: 'localTagManage'
        },
        {
          id: 'builtin-siteTag',
          index: 'siteTag',
          icon: markRaw(Discount),
          label: '站点标签',
          order: 12,
          viewId: 'siteTagManage'
        }
      ]
    },
    {
      id: 'builtin-author',
      index: 'author',
      icon: markRaw(User),
      label: '作者',
      order: 20,
      children: [
        {
          id: 'builtin-localAuthor',
          index: 'localAuthor',
          icon: markRaw(User),
          label: '本地作者',
          order: 21,
          viewId: 'localAuthorManage'
        },
        {
          id: 'builtin-siteAuthor',
          index: 'siteAuthor',
          icon: markRaw(User),
          label: '站点作者',
          order: 22,
          viewId: 'siteAuthorManage'
        }
      ]
    },
    {
      id: 'builtin-favorite',
      index: 'favorite',
      icon: markRaw(Star),
      label: '收藏',
      order: 30,
      viewId: 'developing'
    },
    {
      id: 'builtin-task',
      index: 'task',
      icon: markRaw(List),
      label: '任务',
      order: 40,
      viewId: 'taskManage'
    },
    {
      id: 'builtin-site',
      index: 'site',
      icon: markRaw(Link),
      label: '站点',
      order: 50,
      children: [
        {
          id: 'builtin-siteManage',
          index: 'siteManage',
          icon: markRaw(Link),
          label: '站点管理',
          order: 51,
          viewId: 'siteManage'
        },
        {
          id: 'builtin-siteBrowser',
          index: 'siteBrowser',
          icon: markRaw(Link),
          label: '站点浏览',
          order: 52,
          viewId: 'siteBrowserManage'
        }
      ]
    },
    {
      id: 'builtin-plugin',
      index: 'plugin',
      icon: markRaw(TakeawayBox),
      label: '插件',
      order: 60,
      viewId: 'pluginManage'
    },
    {
      id: 'builtin-settings',
      index: 'settings',
      icon: markRaw(Setting),
      label: '设置',
      order: 70,
      viewId: 'settings'
    },
    {
      id: 'builtin-guide',
      index: 'guide',
      icon: markRaw(Guide),
      label: '向导',
      order: 80,
      viewId: 'guide'
    },
    {
      id: 'builtin-test',
      index: 'test',
      icon: markRaw(Coordinate),
      label: '测试按钮',
      order: 90,
      viewId: 'test'
    }
  ])
}
