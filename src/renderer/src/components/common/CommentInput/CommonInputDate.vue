<script setup lang="ts">
import { CommonInputConfig } from '@renderer/model/util/CommonInputConfig.ts'

// props
const props = defineProps<{
  config: CommonInputConfig
  handleDataChange: () => void
}>()

// model
const data = defineModel('data', { default: undefined, required: false })
</script>

<template>
  <el-date-picker v-model="data" style="width: 100%" :type="props.config.type" :placeholder="props.config.placeholder"></el-date-picker>
</template>

<style scoped></style>
