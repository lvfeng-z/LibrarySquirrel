<script setup lang="ts">
import { CommonInputConfig } from '../../model/util/CommonInputConfig'
import { onMounted, Ref, ref, UnwrapRef } from 'vue'

// props
const props = defineProps<{
  config: CommonInputConfig
}>()

// onMounted
onMounted(() => {
  innerConfig.value = JSON.parse(JSON.stringify(props.config))
  if (innerConfig.value.disabled === undefined) {
    innerConfig.value.disabled = false
  }
})

// model
const data = defineModel<unknown>('data', { default: undefined })

// 变量
const innerConfig: Ref<UnwrapRef<CommonInputConfig>> = ref({ type: 'default' })
</script>

<template>
  <span
    v-if="
      innerConfig.type === 'default' ||
      (innerConfig.disabled && (innerConfig.type === 'text' || innerConfig.type === 'textarea'))
    "
    >{{ data }}</span
  >
  <el-input
    v-if="!innerConfig.disabled && (innerConfig.type === 'text' || innerConfig.type === 'textarea')"
    v-model="data"
    :type="innerConfig.type"
  ></el-input>
  <el-input-number v-if="innerConfig.type === 'number'" v-model="data"></el-input-number>
  <!-- 这一层div用来防止date-picker宽度超出父组件 -->
  <div
    v-if="innerConfig.type === 'date' || innerConfig.type === 'datetime'"
    class="common-input-module-el-date-picker"
  >
    <el-date-picker
      v-model="data"
      :type="innerConfig.type"
      :disabled="innerConfig.disabled"
    ></el-date-picker>
  </div>
  <el-checkbox-group
    v-if="innerConfig.type === 'checkbox'"
    :disabled="innerConfig.disabled"
  ></el-checkbox-group>
  <el-radio-group
    v-if="innerConfig.type === 'radio'"
    :disabled="innerConfig.disabled"
  ></el-radio-group>
  <el-tree-select
    v-if="innerConfig.type === 'selectTree'"
    :disabled="innerConfig.disabled"
  ></el-tree-select>
  <el-switch v-if="innerConfig.type === 'switch'" :disabled="innerConfig.disabled"></el-switch>
</template>

<style scoped>
.common-input-module-el-date-picker {
  display: flex;
  width: 100%;
}
</style>
