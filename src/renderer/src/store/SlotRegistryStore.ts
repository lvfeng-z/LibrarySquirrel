import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ViewSlot, MicroSlot, PanelSlot } from '@renderer/model/slot'

export const useSlotRegistryStore = defineStore('slotRegistry', {
  state: () => ({
    viewSlots: new Map<string, ViewSlot>(),
    microSlots: new Map<string, MicroSlot>(),
    panelSlots: new Map<string, PanelSlot>(),
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

    // 重置所有注册（用于测试或清理）
    reset() {
      this.viewSlots.clear()
      this.microSlots.clear()
      this.panelSlots.clear()
      this.activeViewId = null
    }
  }
})
