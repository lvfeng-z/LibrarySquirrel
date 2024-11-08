<script setup lang="ts">
import CommonInputConfig from '@renderer/model/util/CommonInputConfig.ts'
import { onBeforeMount, ref, Ref, UnwrapRef } from 'vue'
import TreeSelectNode from '@renderer/model/util/TreeSelectNode.ts'
import lodash from 'lodash'

// props
const props = defineProps<{
  config: CommonInputConfig
  handleDataChange: () => void
}>()

// onBeforeMount
onBeforeMount(() => {
  // 给selectData赋值
  innerTreeSelectData.value = lodash.cloneDeep(props.config.selectData) as TreeSelectNode[]
})

// 变量
const innerTreeSelectData: Ref<UnwrapRef<TreeSelectNode[]>> = ref([])

// model
const data = defineModel('data', { default: undefined, required: false })
</script>
<template>
  <el-tree-select
    v-model="data"
    :check-strictly="true"
    :data="innerTreeSelectData"
    :placeholder="props.config.placeholder"
    :remote="props.config.useApi"
    :filterable="props.config.useApi"
    clearable
    @change="handleDataChange"
  ></el-tree-select>
</template>

<style scoped></style>
