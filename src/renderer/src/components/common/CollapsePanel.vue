<script setup lang="ts">
import { computed, ref, Ref, UnwrapRef, watch } from 'vue'

// props
const props = withDefaults(
  defineProps<{
    position?: 'top' | 'bottom' | 'left' | 'right'
    maxLength?: string
    toggleOnOutsideClick?: boolean
    hideHandle?: boolean
    borderRadios?: string
    destroyOnClose?: boolean
  }>(),
  {
    position: 'top',
    maxLength: 'auto',
    toggleOnOutsideClick: true,
    hideHandle: false,
    borderRadios: '0',
    destroyOnClose: false
  }
)

// model
const state: Ref<UnwrapRef<boolean>> = defineModel<boolean>('state', { required: true }) // 开关状态

// 变量
const top: Ref<boolean> = computed(() => props.position === 'top')
const bottom: Ref<boolean> = computed(() => props.position === 'bottom')
const left: Ref<boolean> = computed(() => props.position === 'left')
const right: Ref<boolean> = computed(() => props.position === 'right')
const delayedState: Ref<boolean> = ref(state.value)

// 处理组件外部点击事件
function handleClickOutSide() {
  if (props.toggleOnOutsideClick) {
    state.value = false
  }
}

// watch
// 控制delayedState跟随state延迟变化，用于支持关闭状态下销毁开关开启时的动画
watch(state, (newValue: boolean) => {
  if (newValue) {
    delayedState.value = newValue
  } else {
    setTimeout(() => (delayedState.value = newValue), 300)
  }
})
</script>

<template>
  <div v-click-out-side="handleClickOutSide" class="collapse-panel">
    <div
      :class="{
        'collapse-panel-main': true,
        'collapse-panel-main-top': top,
        'collapse-panel-main-bottom': bottom,
        'collapse-panel-main-left': left,
        'collapse-panel-main-right': right
      }"
    >
      <div
        :class="{
          'collapse-panel-container': true,
          'collapse-panel-container-top': top,
          'collapse-panel-container-bottom': bottom,
          'collapse-panel-container-left': left,
          'collapse-panel-container-right': right,
          'collapse-panel-container-vertical-open': (top || bottom) && state,
          'collapse-panel-container-vertical-close': (top || bottom) && !state,
          'collapse-panel-container-horizontal-open': (left || right) && state,
          'collapse-panel-container-horizontal-close': (left || right) && !state
        }"
      >
        <slot v-if="delayedState || !destroyOnClose" />
      </div>
      <div
        v-show="!hideHandle"
        :class="{
          'collapse-panel-button-wrapper': true,
          'collapse-panel-button-wrapper-top': top,
          'collapse-panel-button-wrapper-bottom': bottom,
          'collapse-panel-button-wrapper-left': left,
          'collapse-panel-button-wrapper-right': right
        }"
      >
        <div
          :class="{
            'collapse-panel-button': true,
            'collapse-panel-button-top': top,
            'collapse-panel-button-bottom': bottom,
            'collapse-panel-button-left': left,
            'collapse-panel-button-right': right
          }"
          @click="state = !state"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.collapse-panel {
  position: relative;
}
.collapse-panel-main {
  position: absolute;
  display: flex;
  filter: drop-shadow(0 0 10px rgba(0, 0, 0, 0.1));
}
.collapse-panel-main-top {
  width: 100%;
  top: 0;
  flex-direction: column;
  max-height: v-bind(maxLength);
}
.collapse-panel-main-bottom {
  width: 100%;
  bottom: 0;
  flex-direction: column-reverse;
  max-height: v-bind(maxLength);
}
.collapse-panel-main-left {
  height: 100%;
  left: 0;
  flex-direction: row;
  max-width: v-bind(maxLength);
}
.collapse-panel-main-right {
  height: 100%;
  right: 0;
  flex-direction: row-reverse;
  max-width: v-bind(maxLength);
}
.collapse-panel-container {
  overflow: hidden;
  transition: 0.3s ease;
}
.collapse-panel-container-top {
  width: 100%;
  border-bottom-left-radius: v-bind(borderRadios);
  border-bottom-right-radius: v-bind(borderRadios);
}
.collapse-panel-container-bottom {
  width: 100%;
  border-top-left-radius: v-bind(borderRadios);
  border-top-right-radius: v-bind(borderRadios);
}
.collapse-panel-container-left {
  height: 100%;
  border-top-right-radius: v-bind(borderRadios);
  border-bottom-right-radius: v-bind(borderRadios);
}
.collapse-panel-container-right {
  height: 100%;
  border-top-left-radius: v-bind(borderRadios);
  border-bottom-left-radius: v-bind(borderRadios);
}
.collapse-panel-container-vertical-open {
  height: auto;
}
.collapse-panel-container-vertical-close {
  height: 0;
}
.collapse-panel-container-horizontal-open {
  width: auto;
}
.collapse-panel-container-horizontal-close {
  width: 0;
}
.collapse-panel-button-wrapper {
  position: absolute;
  align-self: center;
  transition: 0.3s ease;
}
.collapse-panel-button-wrapper-top {
  width: 50px;
  height: 12px;
  overflow-y: hidden;
  top: 100%;
}
.collapse-panel-button-wrapper-top:hover {
  height: 15px;
}
.collapse-panel-button-wrapper-bottom {
  width: 50px;
  height: 12px;
  overflow-y: hidden;
  bottom: 100%;
}
.collapse-panel-button-wrapper-bottom:hover {
  height: 15px;
}
.collapse-panel-button-wrapper-left {
  width: 12px;
  height: 50px;
  overflow-x: hidden;
  left: 100%;
}
.collapse-panel-button-wrapper-left:hover {
  width: 15px;
}
.collapse-panel-button-wrapper-right {
  width: 12px;
  height: 50px;
  overflow-x: hidden;
  right: 100%;
}
.collapse-panel-button-wrapper-right:hover {
  width: 15px;
}
.collapse-panel-button {
  position: absolute;
  border-radius: 100% / 100%;
  background-color: rgb(166.2, 168.6, 173.4, 30%);
  transition: 0.3s ease;
  cursor: pointer;
}
.collapse-panel-button:hover {
  background-color: rgb(166.2, 168.6, 173.4, 80%);
}
.collapse-panel-button-top {
  width: 50px;
  height: 30px;
  bottom: 0;
}
.collapse-panel-button-bottom {
  width: 50px;
  height: 30px;
}
.collapse-panel-button-left {
  width: 30px;
  height: 50px;
  right: 0;
}
.collapse-panel-button-right {
  width: 30px;
  height: 50px;
}
</style>
