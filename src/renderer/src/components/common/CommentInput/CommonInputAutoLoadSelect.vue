<script setup lang="ts">
import { ref } from 'vue'
import { CommonInputConfig } from '@renderer/model/util/CommonInputConfig.ts'
import AutoLoadSelect from '@renderer/components/common/AutoLoadSelect.vue'

// props
const props = defineProps<{
  config: CommonInputConfig
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

// 事件
const emits = defineEmits(['change'])

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
    :value-key="props.config.valueKey"
    clearable
    @change="() => emits('change')"
  >
    <template #default="{ list }">
      <el-option v-for="item in list" :key="item.value" :value="config.objectMode ? item : item.value" :label="item.label" />
    </template>
  </auto-load-select>
</template>

<style scoped></style>
