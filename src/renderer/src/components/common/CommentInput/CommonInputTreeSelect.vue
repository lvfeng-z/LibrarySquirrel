<script setup lang="ts">
import { CommonInputConfig } from '@renderer/model/util/CommonInputConfig.ts'

// props
const props = defineProps<{
  config: CommonInputConfig
  handleDataChange: () => void
}>()

// model
const data = defineModel('data', { default: undefined, required: false })
</script>
<template>
  <el-tree-select
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
