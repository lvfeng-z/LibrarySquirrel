<script setup lang="ts">
import { CommonInputConfig } from '../../model/util/CommonInputConfig'
import { onMounted, Ref, ref, UnwrapRef } from 'vue'
import { ElTreeSelect } from 'element-plus'
import { apiResponseCheck, apiResponseGetData } from '../../utils/ApiUtil'
import { SelectOption } from '../../model/util/SelectOption'

// props
const props = defineProps<{
  config: CommonInputConfig
}>()

// onMounted
onMounted(async () => {
  // 处理默认开关状态
  if (props.config.defaultDisabled === undefined) {
    disabled.value = false
  } else {
    disabled.value = props.config.defaultDisabled
  }

  // 请求接口给selectData赋值
  if (props.config.useApi && props.config.api !== undefined) {
    const response = await props.config.api()
    if (apiResponseCheck(response)) {
      innerSelectData.value = apiResponseGetData(response) as SelectOption[]
    }
  } else if (props.config.selectData !== undefined) {
    innerSelectData.value = JSON.parse(JSON.stringify(props.config.selectData)) as SelectOption[]
  }
})

// model
const data = defineModel<unknown>('data', { default: undefined, required: true })

// 事件
const emits = defineEmits(['dataChanged'])

// 变量
const disabled: Ref<UnwrapRef<boolean>> = ref(false)
const innerSelectData: Ref<UnwrapRef<SelectOption[]>> = ref([])

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
// 处理数据改变事件
function handleDataChange() {
  emits('dataChanged')
}
</script>

<template>
  <div v-click-out-side="handleBlur" class="common-input" @dblclick="handleDblclick">
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
      :placeholder="props.config.placeholder"
      :type="props.config.type"
      clearable
      @change="handleDataChange"
    ></el-input>
    <el-input-number
      v-if="props.config.type === 'number'"
      v-model="data"
      :placeholder="props.config.placeholder"
    ></el-input-number>
    <!-- 这一层div用来防止date-picker宽度超出父组件 -->
    <div
      v-if="props.config.type === 'date' || props.config.type === 'datetime'"
      class="common-input-el-date-picker"
    >
      <el-date-picker
        v-model="data"
        :type="props.config.type"
        :disabled="disabled"
        :placeholder="props.config.placeholder"
      ></el-date-picker>
    </div>
    <el-checkbox-group
      v-if="props.config.type === 'checkbox'"
      :disabled="disabled"
    ></el-checkbox-group>
    <el-radio-group v-if="props.config.type === 'radio'" :disabled="disabled"></el-radio-group>
    <el-select
      v-if="props.config.type === 'select'"
      :disabled="disabled"
      :placeholder="props.config.placeholder"
    ></el-select>
    <el-tree-select
      v-if="props.config.type === 'selectTree'"
      v-model="data"
      :check-strictly="true"
      :disabled="disabled"
      :data="innerSelectData"
      :placeholder="props.config.placeholder"
      @change="handleDataChange"
    ></el-tree-select>
    <el-switch v-if="props.config.type === 'switch'" :disabled="disabled"></el-switch>
  </div>
</template>

<style scoped>
.common-input {
  display: grid;
  min-width: 10px;
  min-height: 10px;
}
.common-input-el-date-picker {
  display: flex;
  width: 100%;
}
</style>
