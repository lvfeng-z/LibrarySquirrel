<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
// onMounted
onMounted(() => {
  resizeObserver = new ResizeObserver(triggerVScrollableUpdate)
  if (scrollTextBoxRef.value) {
    resizeObserver.observe(scrollTextBoxRef.value)
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
  <div ref="scrollTextBoxRef" v-scrollable class="scroll-text-box">
    <label class="scroll-text-box-text scrollable-check">
      <slot></slot>
    </label>
  </div>
</template>
<style scoped>
.scroll-text-box {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
  align-content: center;
  justify-content: center;
}
.scroll-text-box .scroll-text-box-text {
  white-space: nowrap;
  text-align: center;
}
.scroll-text {
  animation: scroll-text 10s linear infinite;
}
</style>
