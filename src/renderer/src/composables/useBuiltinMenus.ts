import { useSlotRegistryStore } from '@renderer/store/SlotRegistryStore'
import { HomeFilled, Discount, User, Star, List, Link, TakeawayBox, Setting, Guide, Coordinate } from '@element-plus/icons-vue'

/**
 * 初始化内置菜单项
 * 在应用启动时调用
 */
export function initBuiltinMenus() {
  const store = useSlotRegistryStore()

  // 批量注册内置菜单
  store.registerMenuSlots([
    {
      id: 'builtin-main',
      index: 'main',
      icon: HomeFilled,
      label: '主页',
      order: 0,
      pageStateKey: 'mainPage'
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
          pageStateKey: 'localTagManage'
        },
        {
          id: 'builtin-siteTag',
          index: 'siteTag',
          icon: Discount,
          label: '站点标签',
          order: 12,
          pageStateKey: 'siteTagManage'
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
          pageStateKey: 'localAuthorManage'
        },
        {
          id: 'builtin-siteAuthor',
          index: 'siteAuthor',
          icon: User,
          label: '站点作者',
          order: 22,
          pageStateKey: 'siteAuthorManage'
        }
      ]
    },
    {
      id: 'builtin-favorite',
      index: 'favorite',
      icon: Star,
      label: '收藏',
      order: 30,
      pageStateKey: 'developing'
    },
    {
      id: 'builtin-task',
      index: 'task',
      icon: List,
      label: '任务',
      order: 40,
      pageStateKey: 'taskManage'
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
          pageStateKey: 'siteManage'
        },
        {
          id: 'builtin-siteBrowser',
          index: 'siteBrowser',
          icon: Link,
          label: '站点浏览',
          order: 52,
          pageStateKey: 'siteBrowserManage'
        }
      ]
    },
    {
      id: 'builtin-plugin',
      index: 'plugin',
      icon: TakeawayBox,
      label: '插件',
      order: 60,
      pageStateKey: 'pluginManage'
    },
    {
      id: 'builtin-settings',
      index: 'settings',
      icon: Setting,
      label: '设置',
      order: 70,
      pageStateKey: 'settings'
    },
    {
      id: 'builtin-guide',
      index: 'guide',
      icon: Guide,
      label: '向导',
      order: 80,
      pageStateKey: 'guide'
    },
    {
      id: 'builtin-test',
      index: 'test',
      icon: Coordinate,
      label: '测试按钮',
      order: 90,
      pageStateKey: 'test'
    }
  ])
}
