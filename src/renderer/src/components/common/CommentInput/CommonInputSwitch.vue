<script setup lang="ts">
import { CommonInputConfig } from '@renderer/model/util/CommonInputConfig.ts'

// props
const props = defineProps<{
  config: CommonInputConfig
  handleDataChange: () => void
}>()

// model
// const data = defineModel('data', { default: undefined, required: false })
</script>
<template>
  <el-switch v-if="props.config.type === 'switch'"></el-switch>
</template>

<style scoped></style>
