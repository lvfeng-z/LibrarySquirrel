<script setup lang="ts">
import { CommonInputConfig } from '../../model/util/CommonInputConfig'
import { onBeforeMount, ref, Ref, UnwrapRef } from 'vue'
import { IsNullish, NotNullish } from '../../utils/CommonUtil'
import TreeSelectNode from '../../model/util/TreeSelectNode'
import { GetNode } from '../../utils/TreeUtil'

// props
const props = defineProps<{
  config: CommonInputConfig
}>()

// onBeforeMount
onBeforeMount(async () => {
  // 处理默认开关状态
  if (props.config.defaultDisabled === undefined) {
    disabled.value = false
  } else {
    disabled.value = props.config.defaultDisabled
  }

  // 请求接口给selectData赋值
  if (props.config.useLoad) {
    requestSelectDataApi()
  }
})

// model
const data = defineModel<unknown>('data', { default: undefined, required: true })

// 事件
const emits = defineEmits(['dataChanged'])

// 变量
const disabled: Ref<UnwrapRef<boolean>> = ref(false)

// 方法
// 获取要显示的内容
function getSpanValue() {
  if (props.config.type === 'custom') {
    return
  }
  if (props.config.type === 'date' || props.config.type === 'datetime') {
    const datetime = new Date(data.value as number)
    const year = datetime.getFullYear() + '-'
    const month = (datetime.getMonth() + 1 < 10 ? '0' + (datetime.getMonth() + 1) : datetime.getMonth() + 1) + '-'
    const day = (datetime.getDay() + 1 < 10 ? '0' + (datetime.getDay() + 1) : datetime.getDay() + 1) + ' '
    const date = year + month + day
    if (props.config.type === 'date') {
      return date
    } else {
      const hour = (datetime.getHours() < 10 ? '0' + datetime.getHours() : datetime.getHours()) + ':'
      const minute = (datetime.getMinutes() < 10 ? '0' + datetime.getMinutes() : datetime.getMinutes()) + ':'
      const second = datetime.getSeconds() < 10 ? '0' + datetime.getSeconds() : datetime.getSeconds()
      return date + hour + minute + second
    }
  } else if (props.config.type === 'select') {
    let target
    if (NotNullish(props.config.selectData)) {
      target = props.config.selectData.find((selectData) => selectData.value === data.value)
    }
    return IsNullish(target) ? '-' : target.value
  } else if (props.config.type === 'treeSelect') {
    let tempRoot = new TreeSelectNode()
    tempRoot.children = props.config.selectData as TreeSelectNode[]
    tempRoot = new TreeSelectNode(tempRoot)
    const node = GetNode(tempRoot, data.value as number)
    return IsNullish(node) ? '-' : node.label
  } else {
    return data.value
  }
}
// 处理组件被双击事件
function handleDblclick() {
  if (props.config.dblclickToEdit) {
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
// 请求select数据接口
async function requestSelectDataApi(queryStr?: string) {
  if (props.config.useLoad && props.config.load !== undefined) {
    props.config.refreshSelectData(queryStr)
  } else {
    console.debug('CommonInput在未启用接口或者未配置接口的情况下请求了接口')
  }
}
</script>

<template>
  <div v-click-out-side="handleBlur" class="common-input" @dblclick="handleDblclick">
    <span
      v-if="
        props.config.type === 'default' ||
        (disabled &&
          (props.config.type === 'text' ||
            props.config.type === 'textarea' ||
            props.config.type === 'date' ||
            props.config.type === 'datetime' ||
            props.config.type === 'select' ||
            props.config.type === 'treeSelect'))
      "
      >{{ getSpanValue() }}</span
    >
    <el-input
      v-if="!disabled && (props.config.type === 'text' || props.config.type === 'textarea')"
      v-model="data"
      :placeholder="props.config.placeholder"
      :type="props.config.type"
      clearable
      @change="handleDataChange"
    ></el-input>
    <el-input-number v-if="props.config.type === 'number'" v-model="data" :placeholder="props.config.placeholder"></el-input-number>
    <!-- 这一层div用来防止date-picker宽度超出父组件 -->
    <div v-if="!disabled && (props.config.type === 'date' || props.config.type === 'datetime')" class="common-input-el-date-picker">
      <el-date-picker
        v-model="data"
        style="width: 100%"
        :type="props.config.type"
        :disabled="disabled"
        :placeholder="props.config.placeholder"
      ></el-date-picker>
    </div>
    <el-checkbox-group v-if="props.config.type === 'checkbox'" :disabled="disabled"></el-checkbox-group>
    <el-radio-group v-if="props.config.type === 'radio'" :disabled="disabled"></el-radio-group>
    <el-select
      v-if="!disabled && props.config.type === 'select'"
      v-model="data"
      :disabled="disabled"
      :placeholder="props.config.placeholder"
      :remote="props.config.useLoad"
      :remote-method="(query: string) => requestSelectDataApi(query)"
      :filterable="props.config.useLoad"
      clearable
    >
      <el-option v-for="item in props.config.selectData" :key="item.value" :value="item.value" :label="item.label" />
    </el-select>
    <el-tree-select
      v-if="!disabled && props.config.type === 'treeSelect'"
      v-model="data"
      :check-strictly="true"
      :disabled="disabled"
      :data="props.config.selectData"
      :placeholder="props.config.placeholder"
      :remote="props.config.useLoad"
      :remote-method="(query: string) => requestSelectDataApi(query)"
      :filterable="props.config.useLoad"
      clearable
      @change="handleDataChange"
    ></el-tree-select>
    <el-switch v-if="props.config.type === 'switch'" :disabled="disabled"></el-switch>
    <component :is="NotNullish(props.config.render) ? props.config.render(data) : undefined" v-if="props.config.type === 'custom'" />
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
