<script setup lang="ts">
import SearchToolbar from './SearchToolbar.vue'
import DataTable from './DataTable.vue'
import { Ref, ref, UnwrapRef } from 'vue'
import { InputBox } from '../../utils/model/InputBox'
import { OperationItem } from '../../utils/model/OperationItem'
import { Thead } from '../../utils/model/Thead'
import { OperationResponse } from '../../utils/model/OperationResponse'

// props
const props = withDefaults(
  defineProps<{
    selectable: boolean // 列表是否可选择
    multiSelect: boolean // 列表是否多选
    keyOfData: string
    mainInputBoxes: InputBox[]
    dropDownInputBoxes: InputBox[]
    operationButton: OperationItem
    operationDropDown: OperationItem[]
    thead: Thead[]
    searchApi: (args: object) => Promise<never>
    createButton?: boolean
  }>(),
  {
    createButton: false
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
  const params = { ...searchToolbarParams.value }
  data.value = await props.searchApi(params)
}
// 处理DataTable按钮点击
function handleDataTableButtonClicked(operationResponse: OperationResponse) {
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
