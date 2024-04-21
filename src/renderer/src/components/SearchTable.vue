<script setup lang="ts">
import SearchToolbar from './SearchToolbar.vue'
import DataTable from './DataTable.vue'
import { Ref, ref, UnwrapRef } from 'vue'
import { SearchBox } from './common/SearchBox'
import { OperationItem } from './common/OperationItem'
import { Thead } from './common/Thead'
import { OperationResponse } from './common/OperationResponse'

// props
const props = defineProps<{
  keyOfData: string
  mainSearchBoxes: SearchBox[]
  dropDownSearchBoxes: SearchBox[]
  operationButton: OperationItem
  operationDropDown: OperationItem[]
  thead: Thead[]
  searchApi: (args: object) => Promise<never>
}>()

// 变量
const searchToolbarParams = ref({}) // 搜索栏参数
const data: Ref<UnwrapRef<unknown[]>> = ref([]) // DataTable的数据

// 方法
// 处理DataTable按钮点击
function handleDataTableButtonClicked(code: OperationResponse) {
  console.log('buttonClicked(code)', code)
}

// 处理SearchToolbar参数变化
function handleSearchToolbarParamsChanged(params: object) {
  searchToolbarParams.value = JSON.parse(JSON.stringify(params))
}

// 处理搜索按钮点击事件
async function handleSearchButtonClicked() {
  const params = { ...searchToolbarParams.value }
  data.value = await props.searchApi(params)
}
</script>

<template>
  <div class="search-table">
    <div class="search-table-toolbar">
      <SearchToolbar
        :drop-down-search-boxes="dropDownSearchBoxes"
        :main-search-boxes="mainSearchBoxes"
        @params-changed="handleSearchToolbarParamsChanged"
        @search-button-clicked="handleSearchButtonClicked"
      >
      </SearchToolbar>
    </div>
    <div class="search-table-data-table rounded-borders">
      <DataTable
        :data="data"
        :thead="thead"
        :multi-select="true"
        :selectable="true"
        :key-of-data="keyOfData"
        :operation-button="operationButton"
        :operation-dropdown="operationDropDown"
        @button-clicked="handleDataTableButtonClicked"
      ></DataTable>
    </div>
  </div>
</template>

<style scoped>
.search-table {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
}

.search-table-toolbar {
  height: 32px;
  width: 100%;
}

.search-table-data-table {
  height: calc(100% - 37px);
  width: 100%;
  margin-top: 5px;
}
</style>
