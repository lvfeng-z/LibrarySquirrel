import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ViewSlot, MicroSlot, PanelSlot } from '@renderer/model/slot'
import type { RouteRecordRaw } from 'vue-router'
import type { Router } from 'vue-router'

// 菜单项类型
export interface MenuSlotItem {
  id: string
  index: string
  icon?: unknown
  label: string
  order?: number
  children?: MenuSlotItem[]
  // 如果是叶子菜单项，指向对应的视图
  viewId?: string
  // 如果是叶子菜单项，指向对应的页面状态
  pageStateKey?: string
}

// Router 实例管理
let routerInstance: Router | null = null

/**
 * 设置 Router 实例
 * 在应用启动时调用
 */
export function setRouterInstance(router: Router) {
  routerInstance = router
}

/**
 * 获取当前的 Router 实例
 */
export function getRouterInstance(): Router | null {
  return routerInstance
}

export const useSlotRegistryStore = defineStore('slotRegistry', {
  state: () => ({
    viewSlots: new Map<string, ViewSlot>(),
    microSlots: new Map<string, MicroSlot>(),
    panelSlots: new Map<string, PanelSlot>(),
    menuSlots: new Map<string, MenuSlotItem>(),
    activeViewId: ref<string | null>(null)
  }),

  getters: {
    allViewSlots: (state): ViewSlot[] => {
      return Array.from(state.viewSlots.values()).sort((a, b) => (a.order ?? 100) - (b.order ?? 100))
    },

    activeView: (state): ViewSlot | null => {
      if (!state.activeViewId) return null
      return state.viewSlots.get(state.activeViewId) || null
    },

    microSlotsByPosition:
      (state) =>
      (position: string): MicroSlot[] => {
        return Array.from(state.microSlots.values()).filter((slot) => slot.position === position)
      },

    panelSlotsByPosition:
      (state) =>
      (position: string): PanelSlot[] => {
        return Array.from(state.panelSlots.values()).filter((slot) => slot.position === position)
      },

    // 获取所有菜单项（已排序）
    allMenuSlots: (state): MenuSlotItem[] => {
      return Array.from(state.menuSlots.values()).sort((a, b) => (a.order ?? 100) - (b.order ?? 100))
    },

    // 获取用于菜单的路由配置
    routeConfigs(): RouteRecordRaw[] {
      const routes: RouteRecordRaw[] = []

      // 从 viewSlots 生成路由
      this.viewSlots.forEach((slot) => {
        routes.push({
          path: `/${slot.id}`,
          name: slot.id,
          component: slot.component,
          meta: {
            title: slot.name,
            order: slot.order ?? 100
          }
        })
      })

      return routes.sort((a, b) => (a.meta?.order as number ?? 100) - (b.meta?.order as number ?? 100))
    }
  },

  actions: {
    // 注册视图位点
    registerViewSlot(slot: ViewSlot) {
      this.viewSlots.set(slot.id, slot)

      // 如果是插件视图且 router 可用，自动添加路由
      if (slot.isPlugin && routerInstance) {
        routerInstance.addRoute('MainLayout', {
          path: slot.id,
          name: slot.id,
          component: slot.component,
          meta: { title: slot.name, order: slot.order ?? 100, isPlugin: true }
        })
      }
    },

    // 注册视图位点并同步到路由
    registerViewSlotWithRoute(slot: ViewSlot) {
      this.registerViewSlot(slot)

      // 如果提供了 router 实例，添加路由
      if (routerInstance) {
        routerInstance.addRoute('MainLayout', {
          path: slot.id,
          name: slot.id,
          component: slot.component,
          meta: { title: slot.name, order: slot.order ?? 100 }
        })
      }
    },

    // 取消注册视图位点
    unregisterViewSlot(id: string) {
      const slot = this.viewSlots.get(id)
      // 如果是插件视图且 router 可用，自动移除路由
      if (slot?.isPlugin && routerInstance) {
        routerInstance.removeRoute(id)
      }

      if (this.activeViewId === id) {
        this.activeViewId = null
      }
      this.viewSlots.delete(id)
    },

    // 注册微件位点
    registerMicroSlot(slot: MicroSlot) {
      this.microSlots.set(slot.id, slot)
    },

    // 取消注册微件位点
    unregisterMicroSlot(id: string) {
      this.microSlots.delete(id)
    },

    // 注册面板位点
    registerPanelSlot(slot: PanelSlot) {
      this.panelSlots.set(slot.id, slot)
    },

    // 取消注册面板位点
    unregisterPanelSlot(id: string) {
      this.panelSlots.delete(id)
    },

    // 切换视图
    switchView(viewId: string): boolean {
      const slot = this.viewSlots.get(viewId)
      if (slot) {
        this.activeViewId = viewId
        return true
      }
      return false
    },

    // 清除当前视图
    clearActiveView() {
      this.activeViewId = null
    },

    // 注册菜单位点
    registerMenuSlot(item: MenuSlotItem) {
      this.menuSlots.set(item.id, item)
    },

    // 批量注册菜单位点
    registerMenuSlots(items: MenuSlotItem[]) {
      items.forEach((item) => {
        this.menuSlots.set(item.id, item)
      })
    },

    // 取消注册菜单位点
    unregisterMenuSlot(id: string) {
      this.menuSlots.delete(id)
    },

    // 重置所有注册（用于测试或清理）
    reset() {
      this.viewSlots.clear()
      this.microSlots.clear()
      this.panelSlots.clear()
      this.menuSlots.clear()
      this.activeViewId = null
    }
  }
})
