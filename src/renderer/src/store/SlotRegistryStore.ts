import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ViewSlot, MicroSlot, PanelSlot } from '@renderer/model/slot'

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
    }
  },

  actions: {
    // 注册视图位点
    registerViewSlot(slot: ViewSlot) {
      this.viewSlots.set(slot.id, slot)
    },

    // 取消注册视图位点
    unregisterViewSlot(id: string) {
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
