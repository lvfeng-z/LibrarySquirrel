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
  <el-input-number
    v-model="data"
    :placeholder="props.config.placeholder"
    clearable
    @change="handleDataChange"
  ></el-input-number>
</template>

<style scoped></style>
