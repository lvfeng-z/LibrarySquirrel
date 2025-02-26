<script setup lang="ts">
import { ref } from 'vue'
import { CommonInputConfig } from '@renderer/model/util/CommonInputConfig.ts'
import AutoLoadSelect from '@renderer/components/common/AutoLoadSelect.vue'
import { NotNullish } from '@renderer/utils/CommonUtil.ts'
import SelectItem from '@renderer/model/util/SelectItem.ts'
import IPage from '@renderer/model/util/IPage.ts'
import { AssertNotNullish } from '@renderer/utils/AssertUtil.ts'

// props
const props = defineProps<{
  config: CommonInputConfig
  cacheData?: SelectItem // autoLoadSelect - 在选择项加载之前用于展示的数据
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
function load(page: IPage<unknown, SelectItem>, input?: string) {
  AssertNotNullish(props.config.remotePageMethod)
  return props.config.remotePageMethod(page, input)
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
    :load="load"
    clearable
    @change="() => emits('change')"
  >
    <template #default="{ list }">
      <el-option v-if="NotNullish(cacheData)" :hidden="true" :value="cacheData.value" :label="cacheData.label" />
      <el-option v-for="item in list" :key="item.value" :value="item.value" :label="item.label" />
    </template>
  </auto-load-select>
</template>

<style scoped></style>
