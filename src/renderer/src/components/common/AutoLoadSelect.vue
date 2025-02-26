<script setup lang="ts">
import IPage from '@renderer/model/util/IPage.ts'
import Page from '@renderer/model/util/Page.ts'
import { Ref, ref, UnwrapRef } from 'vue'
import lodash from 'lodash'
import SelectItem from '../../model/util/SelectItem'
import { ArrayNotEmpty } from '@renderer/utils/CommonUtil.ts'

// props
const props = defineProps<{
  load: (page: IPage<unknown, SelectItem>, input?: string) => Promise<IPage<unknown, SelectItem>>
  valueKey?: string
}>()

// 变量
// el-select组件的实例
const select = ref()
const page: Ref<UnwrapRef<IPage<unknown, SelectItem>>> = ref(new Page<unknown, SelectItem>())

// 方法
// 处理DataScroll滚动事件
async function handleScroll(newQuery: boolean, input?: string) {
  // 新查询重置查询条件
  if (newQuery) {
    page.value = new Page<unknown, SelectItem>()
  }
  //查询
  const tempPage = lodash.cloneDeep(page.value)
  tempPage.data = undefined
  const nextPage = await props.load(tempPage, input)

  // 没有新数据时，不再增加页码
  if (ArrayNotEmpty(nextPage.data)) {
    page.value.pageNumber++
    page.value.pageCount = nextPage.pageCount
    page.value.dataCount = nextPage.dataCount
    const oldData = page.value.data === undefined ? [] : page.value.data
    page.value.data = [...oldData, ...nextPage.data]
  }
}
function focus() {
  select.value.focus()
}

// 暴露
defineExpose({ focus })
</script>

<template>
  <el-select
    ref="select"
    v-el-select-bottomed="() => handleScroll(false)"
    :value-key="valueKey"
    :remote-method="(query: string) => handleScroll(true, query)"
  >
    <slot name="default" :list="page.data" />
  </el-select>
</template>

<style scoped></style>
