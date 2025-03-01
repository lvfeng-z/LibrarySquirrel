<script setup lang="ts">
import CollapsePanel from '@renderer/components/common/CollapsePanel.vue'

// model
// 开关状态
const state = defineModel<boolean>('state', { required: true })
// // 任务列表
// const taskList = defineModel<object>('taskList', { required: true })
//
// // 方法
// function add() {
//   const taskStatus = useTaskStatusStore()
//   taskStatus.get(1)
// }
//
// // 暴露
// defineExpose({ add })
</script>

<template>
  <collapse-panel v-model:state="state">
    <slot name="default" />
  </collapse-panel>
</template>

<style scoped></style>
