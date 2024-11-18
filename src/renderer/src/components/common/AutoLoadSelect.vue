<script setup lang="ts">
import PageModel from '../../model/util/PageModel'
import BaseQueryDTO from '../../model/main/queryDTO/BaseQueryDTO'
import { Ref, ref, UnwrapRef } from 'vue'
import ApiUtil from '../../utils/ApiUtil'
import ApiResponse from '../../model/util/ApiResponse'
import lodash from 'lodash'
import SelectItem from '../../model/util/SelectItem'

// props
const props = defineProps<{
  api: (params?: PageModel<BaseQueryDTO, SelectItem>) => ApiResponse
}>()

// 变量
const page: Ref<UnwrapRef<PageModel<BaseQueryDTO, SelectItem>>> = ref(
  new PageModel<BaseQueryDTO, SelectItem>()
)

// 处理DataScroll滚动事件
async function handleScroll(newQuery: boolean, query?: string) {
  // 新查询重置查询条件
  if (newQuery) {
    page.value = new PageModel<BaseQueryDTO, SelectItem>()
  }

  // 构建查询条件
  page.value.query = { ...new BaseQueryDTO(), ...{ localAuthorName: query } }
  //查询
  const tempPage = lodash.cloneDeep(page.value)
  tempPage.data = undefined
  const response = (await props.api(tempPage)) as ApiResponse

  // 解析响应值
  if (ApiUtil.check(response)) {
    const newPage = ApiUtil.data(response) as PageModel<BaseQueryDTO, SelectItem>
    // 没有新数据时，不再增加页码
    if (newPage.data !== undefined && newPage.data.length > 0) {
      page.value.pageNumber++
      page.value.pageCount = newPage.pageCount
      page.value.dataCount = newPage.dataCount
      const oldData = page.value.data === undefined ? [] : page.value.data
      page.value.data = [...oldData, ...newPage.data]
    }
  }
}
</script>

<template>
  <el-select
    v-scroll-to-bottom="() => handleScroll(false)"
    :remote-method="(query: string) => handleScroll(true, query)"
  >
    <el-option v-for="item in page.data" :key="item.value" :value="item.value" :label="item.label">
    </el-option>
  </el-select>
</template>

<style scoped></style>
