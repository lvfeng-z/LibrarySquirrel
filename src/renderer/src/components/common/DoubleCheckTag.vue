<script setup lang="ts">
import SelectItem from '../../model/util/SelectItem'
import { notNullish } from '../../utils/CommonUtil'

// props
const props = withDefaults(
  defineProps<{
    item: SelectItem
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
  <div class="double-check-tag">
    <el-check-tag class="double-check-tag-tag" :type="props.leftTagType" checked @change="handleClicked(false)">
      {{ props.item.label }}
    </el-check-tag>
    <el-check-tag
      v-if="notNullish(props.item.secondaryLabel)"
      class="double-check-tag-tag"
      :type="props.rightTagType"
      checked
      @change="handleClicked(true)"
    >
      {{ props.item.secondaryLabel }}
    </el-check-tag>
  </div>
</template>

<style scoped>
.double-check-tag {
  display: flex;
  flex-wrap: wrap; /* 允许换行 */
  justify-content: space-between; /* 在一行时左右对齐，换行时每个标签独占一行 */
}

/* 使每个el-check-tag在容器允许的情况下自适应宽度 */
.double-check-tag-tag {
  flex-grow: 1; /* 自动填充可用空间 */
  text-align: center; /* 文本居中，以应对可能的换行情况 */
}
</style>
