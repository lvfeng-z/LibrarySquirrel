<script setup lang="ts">
import { computed, Ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import SideMenu from '@renderer/components/oneOff/SideMenu.vue'
import type { RouteRecordRaw } from 'vue-router'
import { isNullish } from '@shared/util/CommonUtil.ts'

const props = defineProps<{
  width?: string
  foldWidth?: string
}>()

const router = useRouter()
const route = useRoute()

interface MenuItem {
  id: string
  index: string
  name: string
  path: string
  label: string
  icon: unknown
  order: number
  isGroup: boolean
  children: MenuItem[]
}

// 从路由配置生成菜单项（支持嵌套结构）
function buildMenuItems(routes: RouteRecordRaw[]): MenuItem[] {
  const result: MenuItem[] = []

  routes.forEach((r) => {
    if (isNullish(r.meta)) return

    const item: MenuItem = {
      id: r.path,
      index: r.path,
      name: r.name as string,
      path: r.path,
      label: r.meta.title as string,
      icon: r.meta.icon,
      order: (r.meta.order as number) ?? 100,
      isGroup: (r.meta.isGroup as boolean) ?? false,
      children: []
    }

    // 如果有 children，递归构建
    if (r.children?.length) {
      item.children = buildMenuItems(r.children)
    }

    result.push(item)
  })

  return result.sort((a, b) => a.order - b.order)
}

// 从路由配置生成菜单项
const menuItems: Ref<MenuItem[]> = computed(() => {
  const routes = router.getRoutes()
  // 找到 MainLayout 的子路由
  const mainLayout = routes.find((r) => r.name === 'MainLayout')
  if (!mainLayout || !mainLayout.children) return []

  return buildMenuItems(mainLayout.children)
})

const activeIndex = computed(() => route.path)

function handleMenuClick(routeName: string) {
  router.push({ name: routeName })
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
      <template v-for="item in menuItems" :key="item.id">
        <!-- 分组菜单（有子菜单） -->
        <el-sub-menu v-if="item.children.length > 0" :index="item.index">
          <template #title>
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
          </template>
          <el-menu-item v-for="child in item.children" :key="child.index" :index="child.index" @click="handleMenuClick(child.name)">
            <el-icon><component :is="child.icon" /></el-icon>
            <span>{{ child.label }}</span>
          </el-menu-item>
        </el-sub-menu>

        <!-- 单个菜单项 -->
        <el-menu-item v-else :index="item.index" @click="handleMenuClick(item.name)">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </el-menu-item>
      </template>
    </template>
  </side-menu>
</template>
