<script setup lang="ts">
import { CommonInputConfig } from '@renderer/model/util/CommonInputConfig.ts'
import { ref } from 'vue'

// props
const props = defineProps<{
  config: CommonInputConfig
  handleDataChange: () => void
}>()

// model
const data = defineModel('data', { default: undefined, required: false })

// 变量
// el-input组件的实例
const input = ref()

// 方法
function focus() {
  input.value.focus()
}
// 处理时间选择下拉框展开和关闭事件
function handleVisibleChange(visible: boolean) {
  if (!visible) {
    focus()
  }
}

// 暴露
defineExpose({ focus })
</script>

<template>
  <el-date-picker
    ref="input"
    style="width: 100%"
    v-model="data"
    value-format="x"
    :type="props.config.type"
    :placeholder="props.config.placeholder"
    @visible-change="handleVisibleChange"
    @change="handleDataChange"
  />
</template>

<style scoped></style>
