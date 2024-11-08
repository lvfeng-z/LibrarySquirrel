<script setup lang="ts">
import CommonInputConfig from '@renderer/model/util/CommonInputConfig.ts'
import { onBeforeMount, ref, Ref, UnwrapRef } from 'vue'
import SelectItem from '@renderer/model/util/SelectItem.ts'
import lodash from 'lodash'

// props
const props = defineProps<{
  config: CommonInputConfig
  handleDataChange: () => void
}>()

// onBeforeMount
onBeforeMount(() => {
  // 给selectData赋值
  innerSelectData.value = lodash.cloneDeep(props.config.selectData) as SelectItem[]
})

// 变量
const innerSelectData: Ref<UnwrapRef<SelectItem[]>> = ref([])

// 方法

// model
const data = defineModel('data', { default: undefined, required: false })
</script>
<template>
  <el-select
    v-model="data"
    :placeholder="props.config.placeholder"
    :remote="props.config.useApi"
    :filterable="props.config.useApi"
    clearable
  >
    <el-option
      v-for="item in innerSelectData"
      :key="item.value"
      :value="item.value"
      :label="item.label"
    />
  </el-select>
</template>

<style scoped></style>
