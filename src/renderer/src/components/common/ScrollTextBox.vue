<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

// props
const props = withDefaults(
  defineProps<{
    textAlign?: 'left' | 'center' | 'right' | 'justify'
  }>(),
  { textAlign: 'center' }
)
// onMounted
onMounted(() => {
  resizeObserver = new ResizeObserver(triggerVScrollableUpdate)
  if (scrollTextBoxRef.value) {
    resizeObserver.observe(scrollTextBoxRef.value)
  }
  if (scrollTextBoxLabelRef.value) {
    scrollTextBoxLabelRef.value.style.setProperty('--animationName', 'scroll-text-left')
  }
})

// onBeforeUnmount
onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})

// 变量
const scrollTextBoxRef = ref()
const scrollTextBoxLabelRef = ref()
let resizeObserver: ResizeObserver

// 方法
async function triggerVScrollableUpdate() {
  await nextTick() // 确保 DOM 更新完成
  const el = scrollTextBoxRef.value
  if (el != null) {
    const label = el.querySelector('.scrollable-check')
    const selfWidth = el.offsetWidth

    const shouldScroll = label.offsetWidth > selfWidth
    if (shouldScroll) {
      label.classList.add('scroll-text')
    } else {
      label.classList.remove('scroll-text')
    }
  }
}
</script>
<template>
  <div
    ref="scrollTextBoxRef"
    v-scrollable
    :class="{
      'scroll-text-box': true,
      left: props.textAlign === 'left',
      center: props.textAlign === 'center',
      right: props.textAlign === 'right'
    }"
  >
    <label ref="scrollTextBoxLabelRef" class="scrollable-check">
      <slot></slot>
    </label>
  </div>
</template>
<style scoped>
.scroll-text-box {
  overflow: hidden;
  display: flex;
  align-items: center;
  align-content: center;
}
.scroll-text {
  --animationName: scroll-text;
  animation: var(--animationName) 10s linear infinite;
}
.left {
  justify-content: left;
}
.center {
  justify-content: center;
}
.right {
  justify-content: right;
}
</style>
