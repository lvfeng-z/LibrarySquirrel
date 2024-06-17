<script setup lang="ts">
import PageModel from '../../model/util/PageModel'
import BaseQueryDTO from '../../model/main/queryDTO/BaseQueryDTO'
import { Ref, ref, UnwrapRef } from 'vue'
import ApiUtil from '../../utils/ApiUtil'
import ApiResponse from '../../model/util/ApiResponse'

// props
const props = defineProps<{
  api: (params?: object) => ApiResponse
}>()

// 变量
const page: Ref<UnwrapRef<PageModel<BaseQueryDTO, object>>> = ref(
  new PageModel<BaseQueryDTO, object>()
)

// 处理DataScroll滚动事件
async function handleScroll() {
  const response = (await props.api(page)) as ApiResponse
  if (ApiUtil.apiResponseCheck(response)) {
    const newPage = ApiUtil.apiResponseGetData(response) as PageModel<BaseQueryDTO, object>
    page.value.pageNumber++
    page.value.pageCount = newPage.pageCount
    page.value.dataCount = newPage.dataCount
    const oldData = page.value.data === undefined ? [] : page.value.data
    const newData = newPage.data === undefined ? [] : newPage.data
    page.value.data = [...oldData, ...newData]
  }
}
</script>

<template>
  <el-select v-scroll-to-bottom="handleScroll" popper-class="select-scroll">
    <slot name="default"></slot>
  </el-select>
</template>

<style scoped></style>
