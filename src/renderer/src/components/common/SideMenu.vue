<script setup lang="ts">
import { onBeforeMount, ref, Ref, UnwrapRef } from 'vue'
// props
const props = defineProps<{
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
// 展开
function expand() {
  if (innerStates.value >= 2) {
    innerStates.value = 0
  } else {
    innerStates.value++
  }
  handleStates()
}
// 收起
function shrink() {
  if (innerStates.value <= 0) {
    innerStates.value = 2
  } else {
    innerStates.value--
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
    shrink()
  }
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
      <div class="side-menu-button-wrapper">
        <div class="side-menu-button-wrapper-upper">
          <div class="side-menu-button-upper side-menu-button" @click="expand"></div>
        </div>
        <div class="side-menu-button-wrapper-lower">
          <div class="side-menu-button-lower side-menu-button" @click="shrink"></div>
        </div>
      </div>
      <slot v-if="!disappear" name="default"></slot>
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
}
.side-menu-disappear {
  width: 0;
}
.side-menu-show {
  width: 63px;
}
.side-menu-main:not(.el-menu--collapse) {
  width: 200px;
  height: 100%;
}
.side-menu-button-wrapper {
  position: absolute;
  width: 20px;
  height: 62px;
  right: -20px;
  top: calc(50% - 51px);
}
.side-menu-button-wrapper-upper {
  width: 15px;
  height: 31px;
  right: -20px;
  top: 45%;
  overflow: hidden; /* 隐藏超出边界的部分 */
  direction: rtl;
  border-bottom: 1px solid #eeeeee;
}
.side-menu-button-upper {
  width: 40px;
  height: 60px;
  border-radius: 100% / 100%;
  background-image: linear-gradient(135deg, #001f3f, #0088a9, #00c9a7, #92d5c6, #ebf5ee);
}
.side-menu-button-wrapper-lower {
  width: 15px;
  height: 31px;
  right: -20px;
  top: 45%;
  overflow: hidden; /* 隐藏超出边界的部分 */
  display: grid;
  align-content: end;
  justify-content: start;
  direction: rtl;
  border-top: 1px solid #eeeeee;
}
.side-menu-button-lower {
  width: 40px;
  height: 60px;
  border-radius: 100% / 100%;
  background-image: linear-gradient(135deg, #001f3f, #0088a9, #00c9a7, #92d5c6, #ebf5ee);
}
.side-menu-button:hover {
  background-color: lavender;
}
</style>
