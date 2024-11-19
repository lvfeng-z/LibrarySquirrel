<script setup lang="ts">
import { CommonInputConfig } from '@renderer/model/util/CommonInputConfig.ts'

// props
const props = defineProps<{
  config: CommonInputConfig
  handleDataChange: () => void
}>()

// 方法

// model
const data = defineModel('data', { default: undefined, required: false })
</script>
<template>
  <el-select
    v-model="data"
    :placeholder="props.config.placeholder"
    :remote="props.config.useLoad"
    :remote-method="(query: unknown) => props.config.refreshSelectData(query)"
    :filterable="props.config.useLoad"
    clearable
  >
    <el-option v-for="item in props.config.selectData" :key="item.value" :value="item.value" :label="item.label" />
  </el-select>
</template>

<style scoped></style>
