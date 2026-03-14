<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSlotRegistryStore, type MenuSlotItem } from '@renderer/store/SlotRegistryStore'
import { usePageStatesStore } from '@renderer/store/UsePageStatesStore'
import SideMenu from '@renderer/components/oneOff/SideMenu.vue'

const props = defineProps<{
  width?: string
  foldWidth?: string
}>()

const slotStore = useSlotRegistryStore()
const pageStore = usePageStatesStore()

const activeIndex = ref('main')

// 所有菜单项（从 Store 获取，包括内置和插件）
const menuItems = computed(() => slotStore.allMenuSlots)

function findMenuItem(items: MenuSlotItem[], index: string): MenuSlotItem | undefined {
  for (const item of items) {
    if (item.index === index) return item
    if (item.children) {
      const found = findMenuItem(item.children, index)
      if (found) return found
    }
  }
  return undefined
}

async function handleSelect(index: string) {
  activeIndex.value = index

  // 查找菜单项
  const menuItem = findMenuItem(menuItems.value, index)

  if (!menuItem) return

  // 优先检查是否有 viewId（插件视图或内置视图）
  if (menuItem.viewId) {
    await pageStore.showPluginView(menuItem.viewId)
    return
  }
}
</script>

<template>
  <side-menu
    :width="props.width || '160px'"
    :fold-width="props.foldWidth || '64px'"
    :default-active="[activeIndex]"
    background-color="black"
  >
    <template #default>
      <!-- 递归渲染菜单树（统一处理内置和插件菜单） -->
      <template v-for="item in menuItems" :key="item.id">
        <!-- 子菜单 -->
        <el-sub-menu v-if="item.children && item.children.length > 0" :index="item.index">
          <template #title>
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
          </template>
          <el-menu-item v-for="child in item.children" :key="child.id" :index="child.index" @click="handleSelect(child.index)">
            <el-icon><component :is="child.icon" /></el-icon>
            <span>{{ child.label }}</span>
          </el-menu-item>
        </el-sub-menu>

        <!-- 叶子菜单项 -->
        <el-menu-item v-else :index="item.index" @click="handleSelect(item.index)">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </el-menu-item>
      </template>
    </template>
  </side-menu>
</template>
