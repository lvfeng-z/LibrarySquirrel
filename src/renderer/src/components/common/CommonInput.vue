<script setup lang="ts">
import CommonInputConfig from '../../model/util/CommonInputConfig'
import { onBeforeMount, ref, Ref, UnwrapRef } from 'vue'
import ApiUtil from '../../utils/ApiUtil'
import SelectItem from '../../model/util/SelectItem'
import lodash from 'lodash'
import PageModel from '../../model/util/PageModel.ts'
import BaseQueryDTO from '../../model/main/queryDTO/BaseQueryDTO.ts'
import { isNullish, notNullish } from '../../utils/CommonUtil'
import TreeSelectNode from '../../model/util/TreeSelectNode'
import { getNode } from '../../utils/TreeUtil'

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
  if (props.config.useApi && props.config.api !== undefined) {
    requestSelectDataApi()
  } else if (props.config.selectData !== undefined) {
    innerSelectData.value = lodash.cloneDeep(props.config.selectData) as SelectItem[]
    innerTreeSelectData.value = lodash.cloneDeep(props.config.selectData) as TreeSelectNode[]
  }
})

// model
const data = defineModel<unknown>('data', { default: undefined, required: true })

// 事件
const emits = defineEmits(['dataChanged'])

// 变量
const disabled: Ref<UnwrapRef<boolean>> = ref(false)
const innerSelectData: Ref<UnwrapRef<SelectItem[]>> = ref([])
const innerTreeSelectData: Ref<UnwrapRef<TreeSelectNode[]>> = ref([])

// 方法
// 获取要显示的内容
function getSpanValue() {
  if (props.config.type === 'custom') {
    return
  }
  if (props.config.type === 'date' || props.config.type === 'datetime') {
    const datetime = new Date(data.value as number)
    const year = datetime.getFullYear() + '-'
    const month =
      (datetime.getMonth() + 1 < 10 ? '0' + (datetime.getMonth() + 1) : datetime.getMonth() + 1) +
      '-'
    const day =
      (datetime.getDay() + 1 < 10 ? '0' + (datetime.getDay() + 1) : datetime.getDay() + 1) + ' '
    const date = year + month + day
    if (props.config.type === 'date') {
      return date
    } else {
      const hour =
        (datetime.getHours() < 10 ? '0' + datetime.getHours() : datetime.getHours()) + ':'
      const minute =
        (datetime.getMinutes() < 10 ? '0' + datetime.getMinutes() : datetime.getMinutes()) + ':'
      const second =
        datetime.getSeconds() < 10 ? '0' + datetime.getSeconds() : datetime.getSeconds()
      return date + hour + minute + second
    }
  } else if (props.config.type === 'select') {
    const target = innerSelectData.value.find((selectData) => selectData.value === data.value)
    return isNullish(target) ? '-' : target.value
  } else if (props.config.type === 'selectTree') {
    let tempRoot = new TreeSelectNode()
    tempRoot.children = innerTreeSelectData.value
    tempRoot = new TreeSelectNode(tempRoot)
    const node = getNode(tempRoot, data.value as number)
    return isNullish(node) ? '-' : node.label
  } else {
    return data.value
  }
}
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
// 请求select数据接口
async function requestSelectDataApi(queryStr?: string) {
  if (props.config.useApi && props.config.api !== undefined) {
    if (props.config.pagingApi) {
      let page
      if (queryStr !== undefined && queryStr !== '') {
        page = new PageModel()
        page.query = { keyword: queryStr }
      }
      const response = await props.config.api(page)
      if (ApiUtil.apiResponseCheck(response)) {
        const datalist = (ApiUtil.apiResponseGetData(response) as PageModel<BaseQueryDTO, object>)
          .data
        if (props.config.type === 'select') {
          innerSelectData.value = datalist === undefined ? [] : (datalist as SelectItem[])
        } else {
          innerTreeSelectData.value = datalist === undefined ? [] : (datalist as TreeSelectNode[])
        }
      }
    } else {
      let query
      if (queryStr !== undefined && queryStr !== '') {
        query = { keyword: queryStr }
      }
      const response = await props.config.api(query)
      if (ApiUtil.apiResponseCheck(response)) {
        if (props.config.type === 'select') {
          innerSelectData.value = ApiUtil.apiResponseGetData(response) as SelectItem[]
        } else {
          innerTreeSelectData.value = ApiUtil.apiResponseGetData(response) as TreeSelectNode[]
        }
      }
    }
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
            props.config.type === 'selectTree'))
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
    <el-input-number
      v-if="props.config.type === 'number'"
      v-model="data"
      :placeholder="props.config.placeholder"
    ></el-input-number>
    <!-- 这一层div用来防止date-picker宽度超出父组件 -->
    <div
      v-if="!disabled && (props.config.type === 'date' || props.config.type === 'datetime')"
      class="common-input-el-date-picker"
    >
      <el-date-picker
        v-model="data"
        style="width: 100%"
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
      v-if="!disabled && props.config.type === 'select'"
      v-model="data"
      :disabled="disabled"
      :placeholder="props.config.placeholder"
      :remote="props.config.useApi"
      :remote-method="(query: string) => requestSelectDataApi(query)"
      :filterable="props.config.useApi"
      clearable
    >
      <el-option
        v-for="item in innerSelectData"
        :key="item.value"
        :value="item.value"
        :label="item.label"
      />
    </el-select>
    <el-tree-select
      v-if="!disabled && props.config.type === 'selectTree'"
      v-model="data"
      :check-strictly="true"
      :disabled="disabled"
      :data="innerTreeSelectData"
      :placeholder="props.config.placeholder"
      :remote="props.config.useApi"
      :remote-method="(query: string) => requestSelectDataApi(query)"
      :filterable="props.config.useApi"
      clearable
      @change="handleDataChange"
    ></el-tree-select>
    <el-switch v-if="props.config.type === 'switch'" :disabled="disabled"></el-switch>
    <div v-if="props.config.type === 'custom'" style="display: grid; justify-items: center">
      <component :is="notNullish(props.config.render) ? props.config.render(data) : undefined" />
    </div>
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
