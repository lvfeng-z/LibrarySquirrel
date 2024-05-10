<script setup lang="ts">
import { SelectOption } from '../../model/util/SelectOption'

// props
const props = withDefaults(
  defineProps<{
    item: SelectOption
    leftTagType?: 'success' | 'warning' | 'danger' | 'info'
    rightTagType?: 'success' | 'warning' | 'danger' | 'info'
  }>(),
  {
    leftTagType: 'success',
    rightTagType: 'warning'
  }
)

// 事件
const emits = defineEmits(['leftClicked', 'rightClicked'])

// 方法
// 处理点击事件
function handleClicked(right: boolean) {
  if (right) {
    emits('rightClicked')
  } else {
    emits('leftClicked')
  }
}
</script>

<template>
  <div>
    <el-check-tag :type="props.leftTagType" checked @change="handleClicked(false)">
      {{ props.item.label }}
    </el-check-tag>
    <el-check-tag :type="props.rightTagType" checked @change="handleClicked(true)">
      {{ props.item.secondaryLabel }}
    </el-check-tag>
  </div>
</template>

<style scoped></style>
