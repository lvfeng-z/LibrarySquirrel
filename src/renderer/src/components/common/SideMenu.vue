<script setup lang="ts">
import { onBeforeMount, ref, Ref, UnwrapRef } from 'vue'
import { ArrowLeftBold, ArrowRightBold, Expand, Fold } from '@element-plus/icons-vue'

// props
const props = defineProps<{
  width: string
  defaultActive: string[]
  states?: number
}>()

// onBeforeMount
onBeforeMount(() => {
  if (props.states != undefined) {
    innerStates.value = props.states
  }
})

// 变量
const isCollapsed: Ref<UnwrapRef<boolean>> = ref(true)
const disappear: Ref<UnwrapRef<boolean>> = ref(false)
const innerStates: Ref<UnwrapRef<number>> = ref(1)

// 方法
// 处理顶部按钮点击事件
function handleTopClicked() {
  if (innerStates.value < 2) {
    innerStates.value++
  } else if (innerStates.value === 2) {
    innerStates.value--
  }
  handleStates()
}
// 处理底部按钮点击事件
function handleBottomClicked() {
  if (innerStates.value > 0) {
    innerStates.value--
  } else {
    innerStates.value++
  }
  handleStates()
}
// 处理状态改变
function handleStates() {
  switch (innerStates.value) {
    case 0:
      disappear.value = true
      isCollapsed.value = true
      break
    case 1:
      disappear.value = false
      isCollapsed.value = true
      break
    case 2:
      disappear.value = false
      isCollapsed.value = false
      break
    default:
      innerStates.value = 0
      disappear.value = true
      isCollapsed.value = true
  }
}
// 处理点击外部区域
function handleClickOutSide() {
  if (innerStates.value == 2) {
    innerStates.value--
  }
  handleStates()
}
</script>

<template>
  <div
    v-click-out-side="handleClickOutSide"
    :class="{
      'side-menu': true,
      'side-menu-disappear': disappear,
      'side-menu-show': !disappear
    }"
  >
    <el-menu :default-openeds="defaultActive" class="side-menu-main" :collapse="isCollapsed">
      <el-menu-item v-if="!disappear" index="/top" @click="handleTopClicked">
        <el-icon v-if="innerStates < 2"><Expand /></el-icon>
        <el-icon v-if="innerStates === 2"><Fold /></el-icon>
      </el-menu-item>
      <slot v-if="!disappear" name="default"></slot>
      <li style="display: flex; flex-grow: 1">
        <el-menu-item index="/shrink" style="align-self: flex-end; width: 100%" @click="handleBottomClicked">
          <el-icon v-if="!disappear"><ArrowLeftBold /></el-icon>
          <el-icon v-if="disappear"><ArrowRightBold /></el-icon>
        </el-menu-item>
      </li>
    </el-menu>
  </div>
</template>

<style scoped>
.side-menu {
  height: 100%;
  transition: width 0.1s ease;
}
.side-menu-main {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.side-menu-disappear {
  width: 0;
}
.side-menu-show {
  width: v-bind(width);
}
.side-menu-main:not(.el-menu--collapse) {
  width: 200px;
  height: 100%;
}
</style>
