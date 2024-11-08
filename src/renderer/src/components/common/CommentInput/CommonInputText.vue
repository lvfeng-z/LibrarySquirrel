<script setup lang="ts">
import CommonInputConfig from '@renderer/model/util/CommonInputConfig.ts'

// props
const props = defineProps<{
  config: CommonInputConfig
  handleDataChange: () => void
}>()

// model
const data = defineModel('data', { default: undefined, required: false })
</script>
<template>
  <el-input
    v-model="data"
    :placeholder="props.config.placeholder"
    :type="config.type"
    clearable
    @change="handleDataChange"
  ></el-input>
</template>

<style scoped></style>
