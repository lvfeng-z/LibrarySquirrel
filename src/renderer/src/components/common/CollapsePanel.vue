<script setup lang="ts">
import { Ref, UnwrapRef } from 'vue'

// props
const props = withDefaults(
  defineProps<{
    reverse?: boolean // 是否翻转
  }>(),
  {
    reverse: false
  }
)

// model
const state: Ref<UnwrapRef<boolean>> = defineModel('state', { required: true }) // 开关状态

// 处理组件外部点击事件
function handleClickOutSide() {
  state.value = false
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
          'collapse-panel-main-close': !state
        }"
      >
        <div class="collapse-panel-main-wrapper rounded-borders">
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
        <div :class="{ 'collapse-panel-button': true, 'collapse-panel-button-normal': !props.reverse }" @click="state = !state" />
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
  height: 12px;
  align-self: center;
  transition: 0.3s ease;
}
.collapse-panel-button-wrapper:hover {
  height: 15px;
}
.collapse-panel-button-wrapper-normal {
  overflow-x: hidden;
  top: 100%;
}
.collapse-panel-button-wrapper-reverse {
  overflow-y: hidden;
  bottom: 100%;
}
.collapse-panel-button {
  position: absolute;
  width: 50px;
  height: 30px;
  border-radius: 100% / 100%;
  background-color: rgb(166.2, 168.6, 173.4, 30%);
  transition: 0.3s ease;
}
.collapse-panel-button-normal {
  bottom: 0;
}
.collapse-panel-button:hover {
  background-color: rgb(166.2, 168.6, 173.4, 80%);
}
</style>
