<script setup lang="ts">
import { onBeforeMount } from 'vue'
import { NotNullish } from '@renderer/utils/CommonUtil.ts'

// props
const props = defineProps<{
  closeSignal: EventTarget
  beforeClose?: () => Promise<boolean>
}>()

onBeforeMount(() => {
  const handle = async () => {
    if (NotNullish(props.beforeClose)) {
      const closed = await props.beforeClose()
      if (closed) {
        emits('closed')
      } else {
        props.closeSignal.addEventListener('close', handle, { once: true })
      }
    }
  }
  props.closeSignal.addEventListener('close', handle, { once: true })
})

// 事件
const emits = defineEmits(['closed'])
</script>

<template>
  <div class="base-subpage">
    <div class="base-subpage-content">
      <slot />
    </div>
    <div class="base-subpage-dialog">
      <slot name="dialog" />
    </div>
  </div>
</template>

<style>
.base-subpage {
  display: flex;
  width: 100%;
  height: 100%;
  background: white;
  justify-content: center;
  align-items: center;
}
.base-subpage-dialog {
  position: absolute;
}
.base-subpage-content {
  height: 100%;
  width: calc(100% - 15px);
  margin-left: 5px;
  margin-right: 10px;
}
</style>
