<script setup lang="ts">
import CommonInputConfig from '../../../model/util/CommonInputConfig.ts'
import { onBeforeMount, ref, Ref, UnwrapRef } from 'vue'
import SelectItem from '../../../model/util/SelectItem.ts'
import TreeSelectNode from '../../../model/util/TreeSelectNode.ts'
import CommonInputText from '@renderer/components/common/CommentInput/CommonInputText.vue'
import PageModel from '@renderer/model/util/PageModel.ts'
import ApiUtil from '@renderer/utils/ApiUtil.ts'
import BaseQueryDTO from '@renderer/model/main/queryDTO/BaseQueryDTO.ts'
import lodash from 'lodash'
import CommonInputDate from '@renderer/components/common/CommentInput/CommonInputDate.vue'
import CommonInputSelect from '@renderer/components/common/CommentInput/CommonInputSelect.vue'
import CommonInputTreeSelect from '@renderer/components/common/CommentInput/CommonInputTreeSelect.vue'
import CommonInputDefault from '@renderer/components/common/CommentInput/CommonInputDefault.vue'
import { isNullish } from '@renderer/utils/CommonUtil.ts'
import { getNode } from '@renderer/utils/TreeUtil.ts'

// props
const props = defineProps<{
  config: CommonInputConfig
}>()

// onBeforeMount
onBeforeMount(() => {
  // 处理默认开关状态
  if (props.config.defaultDisabled === undefined) {
    disabled.value = false
  } else {
    disabled.value = props.config.defaultDisabled
  }
  defaultComponent.value = CommonInputDefault
  switch (props.config.type) {
    case 'default':
      component.value = CommonInputDefault
      break
    case 'text':
    case 'textarea':
      component.value = CommonInputText
      break
    case 'date':
    case 'datetime':
      component.value = CommonInputDate
      break
    case 'select':
      component.value = CommonInputSelect
      break
    case 'treeSelect':
      component.value = CommonInputTreeSelect
      break
    default:
      component.value = CommonInputDefault
      break
  }
  if (props.config.type === 'select' || props.config.type === 'treeSelect') {
    requestSelectDataApi()
  }
})

// model
const data = defineModel<unknown>('data', { default: undefined, required: true })

// 事件
const emits = defineEmits(['dataChanged'])

// 变量
const config: Ref<UnwrapRef<CommonInputConfig>> = ref(lodash.cloneDeep(props.config))
const disabled: Ref<UnwrapRef<boolean>> = ref(false)
const defaultComponent = ref()
const component = ref()

// 方法
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
    const target = props.config.selectData.find((selectData) => selectData.value === data.value)
    return isNullish(target) ? '-' : target.value
  } else if (props.config.type === 'treeSelect') {
    let tempRoot = new TreeSelectNode()
    tempRoot.children = props.config.selectData
    tempRoot = new TreeSelectNode(tempRoot)
    const node = getNode(tempRoot, data.value as number)
    return isNullish(node) ? '-' : node.label
  } else {
    return data.value
  }
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
          config.value.selectData = datalist as SelectItem[]
        } else {
          config.value.selectData = datalist as TreeSelectNode[]
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
          config.value.selectData = ApiUtil.apiResponseGetData(response) as SelectItem[]
        } else {
          config.value.selectData = ApiUtil.apiResponseGetData(response) as TreeSelectNode[]
        }
      }
    }
  } else {
    console.debug('CommonInput在未启用接口或者未配置接口的情况下请求了接口')
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
  console.log('CommonInputR.handleDataChange')
  emits('dataChanged')
}
</script>

<template>
  <div v-click-out-side="handleBlur" class="common-input" @dblclick="handleDblclick">
    <span v-if="disabled">{{ getSpanValue() }}</span>
    <component
      v-if="!disabled"
      :is="component"
      v-bind="{ config: config, handleDataChange: handleDataChange }"
      v-model="data"
    />
  </div>
</template>

<style scoped>
.common-input {
  display: grid;
  min-width: 10px;
  min-height: 10px;
}
</style>
