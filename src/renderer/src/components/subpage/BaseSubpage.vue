<script setup lang="ts">
import { NotNullish } from '@renderer/utils/CommonUtil.ts'
import { Ref, watch } from 'vue'

// props
const props = defineProps<{
  test: {
    closeSignal: boolean
  }
  beforeClose?: () => Promise<boolean>
}>()

// model
const state: Ref<boolean> = defineModel<boolean>('state', { required: true })

// watch
watch(props.closeSignal, async () => {
  if (NotNullish(props.beforeClose)) {
    const closed = await props.beforeClose()
    if (closed) {
      state.value = false
    }
  }
})
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
