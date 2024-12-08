<script setup lang="ts">
import SelectItem from '../../model/util/SelectItem'
import { notNullish } from '../../utils/CommonUtil'

// props
const props = withDefaults(
  defineProps<{
    item: SelectItem
    firstType?: 'success' | 'warning' | 'danger' | 'info'
    secondType?: 'success' | 'warning' | 'danger' | 'info'
  }>(),
  {
    firstType: 'success',
    secondType: 'warning'
  }
)

// 事件
const emits = defineEmits(['firstClicked', 'secondClicked'])

// 方法
// 处理点击事件
function handleClicked(first: boolean) {
  if (first) {
    emits('secondClicked')
  } else {
    emits('firstClicked')
  }
}
</script>

<template>
  <div class="double-check-tag">
    <el-check-tag class="double-check-tag-sub" :type="props.firstType" checked @change="handleClicked(false)">
      {{ props.item.label }}
    </el-check-tag>
    <el-check-tag
      v-if="notNullish(props.item.secondaryLabel)"
      class="double-check-tag-sub"
      :type="props.secondType"
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
.double-check-tag-sub {
  flex-grow: 1; /* 自动填充可用空间 */
  text-align: center; /* 文本居中，以应对可能的换行情况 */
}
</style>
