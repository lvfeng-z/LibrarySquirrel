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

// 暴露
defineExpose({ focus })
</script>
<template>
  <el-tree-select
    ref="input"
    v-model="data"
    :check-strictly="true"
    :data="props.config.selectData"
    :placeholder="props.config.placeholder"
    :remote="props.config.useLoad"
    :remote-method="(query: unknown) => props.config.refreshSelectData(query)"
    :filterable="props.config.useLoad"
    clearable
    @change="handleDataChange"
  ></el-tree-select>
</template>

<style scoped></style>
