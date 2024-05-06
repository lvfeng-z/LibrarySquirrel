<script setup lang="ts">
import SearchToolbar from './SearchToolbar.vue'
import DataTable from './DataTable.vue'
import { Ref, ref, UnwrapRef } from 'vue'
import { InputBox } from '../../model/util/InputBox'
import { OperationItem } from '../../model/util/OperationItem'
import { Thead } from '../../model/util/Thead'
import { DataTableOperationResponse } from '../../model/util/DataTableOperationResponse'
import { apiResponseCheck, apiResponseGetData, apiResponseMsg } from '../../utils/ApiUtil'
import { PageCondition } from '../../model/util/PageCondition'

// props
const props = withDefaults(
  defineProps<{
    mainInputBoxes: InputBox[] // 主搜索框的inputBox
    dropDownInputBoxes: InputBox[] // 下拉搜索栏的inputBox
    selectable: boolean // 列表是否可选择
    multiSelect: boolean // 列表是否多选
    keyOfData: string // 数据的唯一标识
    operationButton: OperationItem // 数据行的操作按钮
    operationDropDown: OperationItem[] // 数据行的下拉操作按钮
    thead: Thead[] // 表头
    searchApi: (args: object) => Promise<never> // 查询接口
    pageCondition?: PageCondition<object> // 查询配置
    createButton?: boolean // 是否展示新增按钮
  }>(),
  {
    createButton: false,
    pageCondition: () => new PageCondition<object>()
  }
)

// 事件
const emits = defineEmits(['createButtonClicked', 'rowButtonClicked', 'selectionChange'])

// 暴露
defineExpose({
  handleSearchButtonClicked
})

// 变量
const searchToolbarParams = ref({}) // 搜索栏参数
const data: Ref<UnwrapRef<unknown[]>> = ref([]) // DataTable的数据

// 方法
// 处理新增按钮点击事件
function handleCreateButtonClicked() {
  emits('createButtonClicked')
}
// 处理SearchToolbar参数变化
function handleSearchToolbarParamsChanged(params: object) {
  searchToolbarParams.value = JSON.parse(JSON.stringify(params))
}
// 处理搜索按钮点击事件
async function handleSearchButtonClicked() {
  const pageCondition: PageCondition<object> = JSON.parse(JSON.stringify(props.pageCondition))
  pageCondition.query = { ...searchToolbarParams.value }
  const response = await props.searchApi(pageCondition)
  if (apiResponseCheck(response)) {
    const page = apiResponseGetData(response) as PageCondition<object>
    data.value = page.data
  } else {
    apiResponseMsg(response)
  }
}
// 处理DataTable按钮点击
function handleDataTableButtonClicked(operationResponse: DataTableOperationResponse) {
  emits('rowButtonClicked', operationResponse)
}
// 处理DataTable选中项改变
function handleDataTableSelectionChange(selections: []) {
  emits('selectionChange', selections)
}
</script>

<template>
  <div class="search-table">
    <!-- 为了不被el-table内置的2层z轴遮挡，此处为2层z轴 -->
    <SearchToolbar
      class="search-table-toolbar z-layer-2"
      :create-button="createButton"
      :drop-down-input-boxes="dropDownInputBoxes"
      :main-input-boxes="mainInputBoxes"
      @create-button-clicked="handleCreateButtonClicked"
      @search-button-clicked="handleSearchButtonClicked"
      @params-changed="handleSearchToolbarParamsChanged"
    >
    </SearchToolbar>
    <div class="search-table-data-table rounded-borders">
      <DataTable
        :data="data"
        :thead="thead"
        :selectable="selectable"
        :multi-select="multiSelect"
        :key-of-data="keyOfData"
        :operation-button="operationButton"
        :operation-dropdown="operationDropDown"
        @button-clicked="handleDataTableButtonClicked"
        @selection-change="handleDataTableSelectionChange"
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
