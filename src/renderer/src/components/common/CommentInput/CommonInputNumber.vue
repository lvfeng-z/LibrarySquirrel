<script setup lang="ts">
import { CommonInputConfig } from '@renderer/model/util/CommonInputConfig.ts'
import { ref } from 'vue'

// props
const props = defineProps<{
  config: CommonInputConfig
  handleDataChange: () => void
}>()

// model
const data = defineModel<unknown>('data', { default: undefined, required: false })

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
  <el-input-number
    ref="input"
    v-model="data"
    :placeholder="props.config.placeholder"
    clearable
    @change="handleDataChange"
  ></el-input-number>
</template>

<style scoped></style>
