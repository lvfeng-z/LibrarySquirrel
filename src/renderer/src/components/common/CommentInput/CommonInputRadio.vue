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
  <el-radio-group v-if="props.config.type === 'radio'"></el-radio-group>
</template>

<style scoped></style>
