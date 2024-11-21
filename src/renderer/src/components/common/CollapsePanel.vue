<script setup lang="ts">
import { ref, Ref, UnwrapRef } from 'vue'

// props
const props = withDefaults(
  defineProps<{
    reverse?: boolean // 是否翻转
  }>(),
  {
    reverse: false
  }
)

// 暴露
defineExpose({
  changeState
})

// 变量
const state: Ref<UnwrapRef<boolean>> = ref(false) // 开关状态

// 方法
// 开启/关闭下拉表单
function changeState(newState?: boolean) {
  if (newState === undefined) {
    state.value = !state.value
  } else {
    state.value = newState
  }
}

// 处理组件外部点击事件
function handleClickOutSide() {
  if (state.value) {
    changeState(false)
  }
}
</script>

<template>
  <div style="position: relative" v-click-out-side="handleClickOutSide">
    <div
      :class="{
        'collapse-panel': true,
        'collapse-panel-normal': !props.reverse,
        'collapse-panel-reverse': props.reverse
      }"
    >
      <div
        :class="{
          'collapse-panel-main': true,
          'collapse-panel-main-open': state,
          'collapse-panel-main-close': !state,
          'rounded-borders': true
        }"
      >
        <div class="collapse-panel-main-wrapper">
          <slot />
        </div>
      </div>
      <div
        :class="{
          'collapse-panel-button-wrapper': true,
          'collapse-panel-button-wrapper-normal': !props.reverse,
          'collapse-panel-button-wrapper-reverse': props.reverse
        }"
      >
        <div class="collapse-panel-button" @click="changeState()" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.collapse-panel {
  position: absolute;
  width: 100%;
  display: flex;
  pointer-events: fill;
}
.collapse-panel-normal {
  top: 0;
  flex-direction: column;
}
.collapse-panel-reverse {
  bottom: 0;
  flex-direction: column-reverse;
}
.collapse-panel-main {
  width: 100%;
  display: grid;
  overflow: hidden;
  transition: 0.3s ease;
}
.collapse-panel-main-open {
  grid-template-rows: 1fr;
}
.collapse-panel-main-close {
  grid-template-rows: 0fr;
}
.collapse-panel-main-wrapper {
  min-height: 0;
}
.collapse-panel-button-wrapper {
  position: absolute;
  width: 50px;
  height: 13px;
  overflow: hidden;
  align-self: center;
}
.collapse-panel-button-wrapper-normal {
  bottom: -13px;
  display: grid;
  align-content: end;
}
.collapse-panel-button-wrapper-reverse {
  top: -13px;
}
.collapse-panel-button {
  width: 50px;
  height: 30px;
  border-radius: 100% / 100%;
  background-image: linear-gradient(135deg, #001f3f, #0088a9, #00c9a7, #92d5c6, #ebf5ee);
}
</style>
