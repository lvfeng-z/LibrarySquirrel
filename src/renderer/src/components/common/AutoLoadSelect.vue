<script setup lang="ts">
import PageModel from '../../model/util/PageModel'
import BaseQueryDTO from '../../model/main/queryDTO/BaseQueryDTO'

// props
const props = defineProps<{
  api?: (params?: object) => Promise<PageModel<BaseQueryDTO, object>>
}>()

// 处理DataScroll滚动事件
async function handleScroll() {
  // 获得滚动条包裹的 ref 对象
  let scrollWrapper

  if (scrollWrapper) {
    const scrollHeight = scrollWrapper.scrollHeight
    const scrollTop = scrollWrapper.scrollTop
    const height = scrollWrapper.clientHeight

    // 判断是否滚动到底部
    if (scrollTop + height + 0.5 >= scrollHeight) {
    }
  }
}
</script>

<template>
  <el-select @visible-change="handleScroll">
    <slot name="default" />
  </el-select>
</template>

<style scoped></style>
