import { useSlotRegistryStore } from '@renderer/store/SlotRegistryStore'
import { usePageStatesStore } from '@renderer/store/UsePageStatesStore'
import { HomeFilled, Discount, User, Star, List, Link, TakeawayBox, Setting, Guide, Coordinate } from '@element-plus/icons-vue'

/**
 * 初始化内置菜单项
 * 在应用启动时调用
 */
export function initBuiltinMenus() {
  const store = useSlotRegistryStore()
  const pageStore = usePageStatesStore()

  // 注册内置视图（主页和所有子页面）
  const builtinViews = [
    {
      id: 'mainPage',
      name: '主页',
      component: () => import('@renderer/components/main/MainPageWrapper.vue'),
      order: 0,
      isBuiltin: true,
      onClose: async () => {
        // 关闭主页时不做特殊处理
      }
    },
    {
      id: 'localTagManage',
      name: '本地标签',
      component: () => import('@renderer/components/subpage/LocalTagManage.vue'),
      order: 10,
      isBuiltin: true,
      onClose: async () => {
        await pageStore.closePage()
      }
    },
    {
      id: 'siteTagManage',
      name: '站点标签',
      component: () => import('@renderer/components/subpage/SiteTagManage.vue'),
      order: 11,
      isBuiltin: true,
      onClose: async () => {
        await pageStore.closePage()
      }
    },
    {
      id: 'localAuthorManage',
      name: '本地作者',
      component: () => import('@renderer/components/subpage/LocalAuthorManage.vue'),
      order: 20,
      isBuiltin: true,
      onClose: async () => {
        await pageStore.closePage()
      }
    },
    {
      id: 'siteAuthorManage',
      name: '站点作者',
      component: () => import('@renderer/components/subpage/SiteAuthorManage.vue'),
      order: 21,
      isBuiltin: true,
      onClose: async () => {
        await pageStore.closePage()
      }
    },
    {
      id: 'developing',
      name: '收藏',
      component: () => import('@renderer/components/subpage/Developing.vue'),
      order: 30,
      isBuiltin: true,
      onClose: async () => {
        await pageStore.closePage()
      }
    },
    {
      id: 'taskManage',
      name: '任务',
      component: () => import('@renderer/components/subpage/TaskManage.vue'),
      order: 40,
      isBuiltin: true,
      onClose: async () => {
        await pageStore.closePage()
      }
    },
    {
      id: 'siteManage',
      name: '站点管理',
      component: () => import('@renderer/components/subpage/SiteManage.vue'),
      order: 50,
      isBuiltin: true,
      onClose: async () => {
        await pageStore.closePage()
      }
    },
    {
      id: 'siteBrowserManage',
      name: '站点浏览',
      component: () => import('@renderer/components/subpage/SiteBrowserManage.vue'),
      order: 51,
      isBuiltin: true,
      onClose: async () => {
        await pageStore.closePage()
      }
    },
    {
      id: 'pluginManage',
      name: '插件',
      component: () => import('@renderer/components/subpage/PluginManage.vue'),
      order: 60,
      isBuiltin: true,
      onClose: async () => {
        await pageStore.closePage()
      }
    },
    {
      id: 'settings',
      name: '设置',
      component: () => import('@renderer/components/subpage/Settings.vue'),
      order: 70,
      isBuiltin: true,
      onClose: async () => {
        await pageStore.closePage()
      }
    },
    {
      id: 'guide',
      name: '向导',
      component: () => import('@renderer/components/subpage/Guide.vue'),
      order: 80,
      isBuiltin: true,
      onClose: async () => {
        await pageStore.closePage()
      }
    },
    {
      id: 'test',
      name: '测试按钮',
      component: () => import('@renderer/components/subpage/Test.vue'),
      order: 90,
      isBuiltin: true,
      onClose: async () => {
        await pageStore.closePage()
      }
    }
  ]

  // 注册视图
  builtinViews.forEach((view) => store.registerViewSlot(view))

  // 批量注册内置菜单
  store.registerMenuSlots([
    {
      id: 'builtin-main',
      index: 'main',
      icon: HomeFilled,
      label: '主页',
      order: 0,
      viewId: 'mainPage'
    },
    {
      id: 'builtin-tag',
      index: 'tag',
      icon: Discount,
      label: '标签',
      order: 10,
      children: [
        {
          id: 'builtin-localTag',
          index: 'localTag',
          icon: Discount,
          label: '本地标签',
          order: 11,
          viewId: 'localTagManage'
        },
        {
          id: 'builtin-siteTag',
          index: 'siteTag',
          icon: Discount,
          label: '站点标签',
          order: 12,
          viewId: 'siteTagManage'
        }
      ]
    },
    {
      id: 'builtin-author',
      index: 'author',
      icon: User,
      label: '作者',
      order: 20,
      children: [
        {
          id: 'builtin-localAuthor',
          index: 'localAuthor',
          icon: User,
          label: '本地作者',
          order: 21,
          viewId: 'localAuthorManage'
        },
        {
          id: 'builtin-siteAuthor',
          index: 'siteAuthor',
          icon: User,
          label: '站点作者',
          order: 22,
          viewId: 'siteAuthorManage'
        }
      ]
    },
    {
      id: 'builtin-favorite',
      index: 'favorite',
      icon: Star,
      label: '收藏',
      order: 30,
      viewId: 'developing'
    },
    {
      id: 'builtin-task',
      index: 'task',
      icon: List,
      label: '任务',
      order: 40,
      viewId: 'taskManage'
    },
    {
      id: 'builtin-site',
      index: 'site',
      icon: Link,
      label: '站点',
      order: 50,
      children: [
        {
          id: 'builtin-siteManage',
          index: 'siteManage',
          icon: Link,
          label: '站点管理',
          order: 51,
          viewId: 'siteManage'
        },
        {
          id: 'builtin-siteBrowser',
          index: 'siteBrowser',
          icon: Link,
          label: '站点浏览',
          order: 52,
          viewId: 'siteBrowserManage'
        }
      ]
    },
    {
      id: 'builtin-plugin',
      index: 'plugin',
      icon: TakeawayBox,
      label: '插件',
      order: 60,
      viewId: 'pluginManage'
    },
    {
      id: 'builtin-settings',
      index: 'settings',
      icon: Setting,
      label: '设置',
      order: 70,
      viewId: 'settings'
    },
    {
      id: 'builtin-guide',
      index: 'guide',
      icon: Guide,
      label: '向导',
      order: 80,
      viewId: 'guide'
    },
    {
      id: 'builtin-test',
      index: 'test',
      icon: Coordinate,
      label: '测试按钮',
      order: 90,
      viewId: 'test'
    }
  ])
}
