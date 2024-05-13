<script setup lang="ts">
import { CommonInputType } from '../../model/util/CommonInputType'

// props
const props = defineProps<{
  type: CommonInputType
}>()

// model
const data = defineModel<unknown>('data', { default: undefined })
</script>

<template>
  <span v-if="props.type.type === 'default'">{{ data }}</span>
  <el-input
    v-if="props.type.type === 'text' || props.type.type === 'textarea'"
    v-model="data"
    :type="props.type.type"
  ></el-input>
  <el-input-number v-if="props.type.type === 'number'" v-model="data"></el-input-number>
  <el-date-picker
    v-if="props.type.type === 'date' || props.type.type === 'datetime'"
    v-model="data"
    :type="props.type.type"
  ></el-date-picker>
  <el-checkbox-group v-if="props.type.type === 'checkbox'"></el-checkbox-group>
  <el-radio-group v-if="props.type.type === 'radio'"></el-radio-group>
  <el-tree-select v-if="props.type.type === 'selectTree'"></el-tree-select>
  <el-switch v-if="props.type.type === 'switch'"></el-switch>
</template>

<style scoped></style>
