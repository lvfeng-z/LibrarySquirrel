<script setup lang="ts">
import SearchToolbar from './SearchToolbar.vue'
import DataTable from './DataTable.vue'
import { onMounted, Ref, ref, UnwrapRef } from 'vue'
import InputBox from '../../model/util/InputBox'
import OperationItem from '../../model/util/OperationItem'
import Thead from '../../model/util/Thead'
import DataTableOperationResponse from '../../model/util/DataTableOperationResponse'
import ApiUtil from '../../utils/ApiUtil'
import PageModel from '../../model/util/PageModel'
import QuerySortOption from '../../model/util/QuerySortOption'
import lodash from 'lodash'
import BaseQueryDTO from '../../model/main/queryDTO/BaseQueryDTO.ts'

// props
const props = withDefaults(
  defineProps<{
    mainInputBoxes: InputBox[] // 主搜索框的inputBox
    dropDownInputBoxes: InputBox[] // 下拉搜索栏的inputBox
    selectable: boolean // 列表是否可选择
    multiSelect: boolean // 列表是否多选
    keyOfData: string // 数据的唯一标识
    thead: Thead[] // 表头
    operationButton?: OperationItem[] // 数据行的操作按钮
    customOperationButton?: boolean // 是否使用自定义操作按钮
    sort?: QuerySortOption[] // 排序
    searchApi: (args: object) => Promise<never> // 查询接口
    pageCondition?: PageModel<BaseQueryDTO, object> // 查询配置
    createButton?: boolean // 是否展示新增按钮
    pageSizes?: number[]
  }>(),
  {
    createButton: false,
    pageCondition: () => new PageModel<BaseQueryDTO, object>(),
    pageSizes: () => [10, 20, 30, 50, 100]
  }
)

// model
// 已编辑的行
const changedRows = defineModel<object[]>('changedRows', { default: [], required: true })

// 事件
const emits = defineEmits([
  'createButtonClicked',
  'rowButtonClicked',
  'selectionChange',
  'pageNumberChanged',
  'pageSizeChanged',
  'query'
])

// onMounted
onMounted(() => {
  if (props.sort !== undefined) {
    const tempSort = lodash.cloneDeep(props.sort)
    innerSort.value = [...innerSort.value, ...tempSort]
  }
})

// 变量
// 数据栏
const searchToolbarParams = ref({}) // 搜索栏参数
const data: Ref<UnwrapRef<unknown[]>> = ref([]) // DataTable的数据
const innerSort: Ref<UnwrapRef<QuerySortOption[]>> = ref([]) // 排序参数
// 分页栏
const pageNumber = ref(1) // 当前页码
const innerPageSizes = ref(props.pageSizes) // 可选页面大小
const pageSize = ref(innerPageSizes.value[0]) // 页面大小
// 2024-05-07 jumper会导致警告：ElementPlusError: [el-input] [API] label is about to be deprecated in version 2.8.0, please use aria-label instead.
const layout = ref('sizes, prev, pager, next') // 分页栏组件
const dataCount = ref(3) // 数据总量
const pagerCount = ref(5) // 显示的分页按钮个数

// 方法
// 数据栏
// 处理新增按钮点击事件
function handleCreateButtonClicked() {
  emits('createButtonClicked')
}
// 处理搜索按钮点击事件
async function handleSearchButtonClicked() {
  // 配置分页参数
  const pageCondition: PageModel<BaseQueryDTO, object> = lodash.cloneDeep(props.pageCondition)
  pageCondition.pageSize = pageSize.value
  pageCondition.pageNumber = pageNumber.value
  // 配置查询参数
  pageCondition.query = { ...new BaseQueryDTO(), ...searchToolbarParams.value }
  // 配置排序参数
  pageCondition.query.sort = lodash.cloneDeep(innerSort.value)

  const response = await props.searchApi(pageCondition)
  if (ApiUtil.apiResponseCheck(response)) {
    const page = ApiUtil.apiResponseGetData(response) as PageModel<BaseQueryDTO, object>
    data.value = page.data === undefined ? [] : page.data
    dataCount.value = page.dataCount
  } else {
    ApiUtil.apiResponseMsg(response)
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
// 分页栏
// 当前页变化
function handlePageNumberChange() {
  handleSearchButtonClicked()
}
// 页面大小变化
function handlePageSizeChange() {
  handleSearchButtonClicked()
}
// 处理编辑事件
function handleRowChange(changedRow: object) {
  changedRows.value.push(changedRow)
}

// 暴露
defineExpose({
  handleSearchButtonClicked
})
</script>

<template>
  <div class="search-table">
    <!-- 为了不被el-table内置的2层z轴以及固定列的2+1增z轴遮挡，此处为3层z轴 -->
    <SearchToolbar
      v-model:params="searchToolbarParams"
      class="search-table-toolbar z-layer-3"
      :create-button="createButton"
      :drop-down-input-boxes="dropDownInputBoxes"
      :main-input-boxes="mainInputBoxes"
      @create-button-clicked="handleCreateButtonClicked"
      @search-button-clicked="handleSearchButtonClicked"
    >
    </SearchToolbar>
    <div class="search-table-data">
      <DataTable
        v-model:tableData="data"
        class="search-table-data-table"
        :thead="thead"
        :selectable="selectable"
        :multi-select="multiSelect"
        :key-of-data="keyOfData"
        :operation-button="operationButton"
        :custom-operation-button="customOperationButton"
        @button-clicked="handleDataTableButtonClicked"
        @selection-change="handleDataTableSelectionChange"
        @row-changed="handleRowChange"
      >
        <template #custom>
          <slot name="custom" />
        </template>
      </DataTable>
      <div class="search-table-data-pagination-scroll-wrapper">
        <el-scrollbar class="search-table-data-pagination-scroll">
          <div class="search-table-data-pagination-wrapper">
            <el-pagination
              v-model:current-page="pageNumber"
              v-model:page-size="pageSize"
              class="search-table-data-pagination"
              :layout="layout"
              :page-sizes="innerPageSizes"
              :pager-count="pagerCount"
              :total="dataCount"
              @current-change="handlePageNumberChange"
              @size-change="handlePageSizeChange"
            />
          </div>
        </el-scrollbar>
      </div>
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
.search-table-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: calc(100% - 37px);
  width: 100%;
  margin-top: 5px;
}
.search-table-data-table {
  flex-grow: 1;
}
.search-table-data-pagination-scroll-wrapper {
  width: 100%;
  height: auto;
}
.search-table-data-pagination-scroll {
  height: auto;
  width: 100%;
}
.search-table-data-pagination-wrapper {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #fdfdfd;
  border-bottom-left-radius: 6px;
  border-bottom-right-radius: 6px;
}
.search-table-data-pagination {
  height: auto;
  width: auto;
}
</style>
