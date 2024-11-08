<script setup lang="ts">
import CommonInputConfig from '@renderer/model/util/CommonInputConfig.ts'
import { isNullish } from '@renderer/utils/CommonUtil.ts'
import TreeSelectNode from '@renderer/model/util/TreeSelectNode.ts'
import { getNode } from '@renderer/utils/TreeUtil.ts'
import { computed, ref } from 'vue'

// props
const props = defineProps<{
  config: CommonInputConfig
}>()

// model
const data = defineModel('data', { required: false })

// 方法
// 获取要显示的内容
const spanValue = ref(getSpanValue())
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
</script>
<template>
  <span>{{ spanValue }}</span>
</template>

<style scoped></style>
