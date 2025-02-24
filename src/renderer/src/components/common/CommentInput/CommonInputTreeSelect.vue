<script setup lang="ts">
import { CommonInputConfig } from '@renderer/model/util/CommonInputConfig.ts'
import { ref } from 'vue'
import { ElTreeSelect } from 'element-plus'

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
// 树形选择组件配置
const treeProps = {
  label: 'label',
  children: 'children',
  isLeaf: 'isLeaf'
}

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
    :props="treeProps"
    clearable
    @change="handleDataChange"
  />
</template>

<style scoped></style>
