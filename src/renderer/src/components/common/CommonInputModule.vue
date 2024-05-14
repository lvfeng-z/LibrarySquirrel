<script setup lang="ts">
import { CommonInputConfig } from '../../model/util/CommonInputConfig'
import { onMounted, Ref, ref, UnwrapRef } from 'vue'

// props
const props = defineProps<{
  config: CommonInputConfig
}>()

// onMounted
onMounted(() => {
  if (props.config.defaultDisabled === undefined) {
    disabled.value = false
  } else {
    disabled.value = props.config.defaultDisabled
  }
})

// model
const data = defineModel<unknown>('data', { default: undefined })

// 变量
const disabled: Ref<UnwrapRef<boolean>> = ref(false)

// 方法
// 处理组件被双击事件
function handleDblclick() {
  if (props.config.dblclickEnable) {
    disabled.value = false
  }
}
// 处理失去焦点事件
function handleBlur() {
  if (props.config.defaultDisabled) {
    disabled.value = true
  }
}
</script>

<template>
  <div v-click-out-side="handleBlur" @dblclick="handleDblclick">
    <span
      v-if="
        props.config.type === 'default' ||
        (disabled && (props.config.type === 'text' || props.config.type === 'textarea'))
      "
      >{{ data }}</span
    >
    <el-input
      v-if="!disabled && (props.config.type === 'text' || props.config.type === 'textarea')"
      v-model="data"
      :type="props.config.type"
    ></el-input>
    <el-input-number v-if="props.config.type === 'number'" v-model="data"></el-input-number>
    <!-- 这一层div用来防止date-picker宽度超出父组件 -->
    <div
      v-if="props.config.type === 'date' || props.config.type === 'datetime'"
      class="common-input-module-el-date-picker"
    >
      <el-date-picker
        v-model="data"
        :type="props.config.type"
        :disabled="disabled"
      ></el-date-picker>
    </div>
    <el-checkbox-group
      v-if="props.config.type === 'checkbox'"
      :disabled="disabled"
    ></el-checkbox-group>
    <el-radio-group v-if="props.config.type === 'radio'" :disabled="disabled"></el-radio-group>
    <el-tree-select v-if="props.config.type === 'selectTree'" :disabled="disabled"></el-tree-select>
    <el-switch v-if="props.config.type === 'switch'" :disabled="disabled"></el-switch>
  </div>
</template>

<style scoped>
.common-input-module-el-date-picker {
  display: flex;
  width: 100%;
}
</style>
