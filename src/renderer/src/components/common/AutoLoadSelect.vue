<script setup lang="ts">
import IPage from '@renderer/model/util/IPage.ts'
import Page from '@renderer/model/util/Page.ts'
import BaseQueryDTO from '../../model/main/queryDTO/BaseQueryDTO'
import { Ref, ref, UnwrapRef } from 'vue'
import lodash from 'lodash'
import SelectItem from '../../model/util/SelectItem'
import { arrayNotEmpty } from '@renderer/utils/CommonUtil.ts'

// props
const props = defineProps<{
  load: (page: IPage<BaseQueryDTO, SelectItem>, input?: string) => Promise<IPage<BaseQueryDTO, SelectItem>>
}>()

// 变量
const page: Ref<UnwrapRef<IPage<BaseQueryDTO, SelectItem>>> = ref(new Page<BaseQueryDTO, SelectItem>())

// 处理DataScroll滚动事件
async function handleScroll(newQuery: boolean, input?: string) {
  // 新查询重置查询条件
  if (newQuery) {
    page.value = new Page<BaseQueryDTO, SelectItem>()
  }
  //查询
  const tempPage = lodash.cloneDeep(page.value)
  tempPage.data = undefined
  const nextPage = await props.load(tempPage, input)

  // 没有新数据时，不再增加页码
  if (arrayNotEmpty(nextPage.data)) {
    page.value.pageNumber++
    page.value.pageCount = nextPage.pageCount
    page.value.dataCount = nextPage.dataCount
    const oldData = page.value.data === undefined ? [] : page.value.data
    page.value.data = [...oldData, ...nextPage.data]
  }
}
</script>

<template>
  <el-select v-scroll-to-bottom="() => handleScroll(false)" :remote-method="(query: string) => handleScroll(true, query)">
    <el-option v-for="item in page.data" :key="item.value" :value="item.value" :label="item.label"> </el-option>
  </el-select>
</template>

<style scoped></style>
