<script setup lang="ts">
import { CommonInputConfig } from '../../../model/util/CommonInputConfig.ts'
import { computed, onBeforeMount, ref, Ref, UnwrapRef } from 'vue'
import TreeSelectNode from '../../../model/util/TreeSelectNode.ts'
import CommonInputText from '@renderer/components/common/CommentInput/CommonInputText.vue'
import lodash from 'lodash'
import CommonInputDate from '@renderer/components/common/CommentInput/CommonInputDate.vue'
import CommonInputSelect from '@renderer/components/common/CommentInput/CommonInputSelect.vue'
import CommonInputTreeSelect from '@renderer/components/common/CommentInput/CommonInputTreeSelect.vue'
import { isNullish, notNullish } from '@renderer/utils/CommonUtil.ts'
import { getNode } from '@renderer/utils/TreeUtil.ts'

// props
const props = defineProps<{
  config: CommonInputConfig
}>()

// onBeforeMount
onBeforeMount(() => {
  // 处理默认开关状态
  if (props.config.defaultDisabled === undefined) {
    enable()
  } else {
    if (props.config.defaultDisabled) {
      disable()
    } else {
      enable()
    }
  }
})

// model
const data = defineModel<unknown>('data', { default: undefined, required: true })

// 事件
const emits = defineEmits(['dataChanged'])

// 变量
const config: Ref<UnwrapRef<CommonInputConfig>> = ref(lodash.cloneDeep(props.config))
const disabled: Ref<UnwrapRef<boolean>> = ref(false)
const dynamicComponent = computed(() => {
  if (!disabled.value || props.config.type === 'custom') {
    switch (props.config.type) {
      case 'text':
      case 'textarea':
        return CommonInputText
      case 'date':
      case 'datetime':
        return CommonInputDate
      case 'select':
        props.config.refreshSelectData()
        return CommonInputSelect
      case 'treeSelect':
        props.config.refreshSelectData()
        return CommonInputTreeSelect
      case 'custom':
        if (notNullish(props.config.render)) {
          return props.config.render(data.value)
        }
        break
    }
  }
  return undefined
})

// 方法
// 启用
function enable() {
  disabled.value = false
}
// 禁用
function disable() {
  disabled.value = true
}
// 处理组件被双击事件
function handleDblclick() {
  if (props.config.dblclickEnable) {
    enable()
  }
}
// 处理失去焦点事件
function handleBlur() {
  if (props.config.defaultDisabled) {
    disable()
  }
}
// 处理数据改变事件
function handleDataChange() {
  emits('dataChanged')
}
// 获取span要显示的值
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
    let target
    if (notNullish(props.config.selectData)) {
      target = props.config.selectData.find((selectData) => selectData.value === data.value)
    }
    return isNullish(target) ? '-' : target.value
  } else if (props.config.type === 'treeSelect') {
    let tempRoot = new TreeSelectNode()
    tempRoot.children = props.config.selectData as TreeSelectNode[]
    tempRoot = new TreeSelectNode(tempRoot)
    const node = getNode(tempRoot, data.value as number)
    return isNullish(node) ? '-' : node.label
  } else {
    return data.value
  }
}
</script>

<template>
  <div v-click-out-side="handleBlur" class="common-input" @dblclick="handleDblclick">
    <span v-if="disabled && props.config.type !== 'custom'">{{ getSpanValue() }}</span>
    <component
      markRow
      v-if="!disabled || props.config.type === 'custom'"
      :is="dynamicComponent"
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
