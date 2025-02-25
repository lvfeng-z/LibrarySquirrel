<script setup lang="ts">
import { CommonInputConfig } from '@renderer/model/util/CommonInputConfig.ts'
import { ref } from 'vue'

// props
const props = defineProps<{
  config: CommonInputConfig
  handleDataChange: () => void
}>()

// model
// const data = defineModel('data', { default: undefined, required: false })

// 变量
// el-input组件的实例
const input = ref()

// 方法
function focus() {
  input.value.focus()
}

// 暴露
defineExpose({ focus })
</script>
<template>
  <el-switch v-if="props.config.type === 'switch'" ref="input"></el-switch>
</template>

<style scoped></style>
