<script setup lang="ts">
import { CommonInputConfig } from '@renderer/model/util/CommonInputConfig.ts'
import { ref } from 'vue'
import AutoLoadSelect from '@renderer/components/common/AutoLoadSelect.vue'

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
  <auto-load-select
    ref="input"
    v-model="data"
    :placeholder="props.config.placeholder"
    :remote="props.config.remote"
    :filterable="props.config.remote"
    :load="config.remotePageMethod"
    clearable
    @change="handleDataChange"
  >
    <el-option v-for="item in props.config.selectList" :key="item.value" :value="item.value" :label="item.label" />
  </auto-load-select>
</template>

<style scoped></style>
