<script setup lang="ts" generic="Query extends BaseQueryDTO, Data, OpParam">
import SearchToolbarV1 from '@renderer/components/common/SearchToolbarV1.vue'
import { ref } from 'vue'
import OperationItem from '../../model/util/OperationItem'
import { Thead } from '../../model/util/Thead'
import DataTableOperationResponse from '../../model/util/DataTableOperationResponse'
import Page from '../../model/util/Page.ts'
import lodash from 'lodash'
import { ArrayIsEmpty, ArrayNotEmpty, IsNullish, NotNullish } from '../../utils/CommonUtil'
import TreeNode from '../../model/util/TreeNode'
import { TreeNode as ElTreeNode } from 'element-plus'
import { GetNode } from '../../utils/TreeUtil'
import DataTable from '@renderer/components/common/DataTable.vue'
import BaseQueryDTO from '@renderer/model/main/queryDTO/BaseQueryDTO.ts'

// props
const props = withDefaults(
  defineProps<{
    selectable: boolean // 列表是否可选择
    multiSelect: boolean // 列表是否多选
    dataKey: string // 数据的唯一标识
    tableRowClassName?: (data: { row: unknown; rowIndex: number }) => string // 给行添加class的函数
    thead: Thead[] // 表头
    operationButton?: OperationItem<OpParam>[] // 数据行的操作按钮
    operationWidth?: number // 操作栏宽度
    customOperationButton?: boolean // 是否使用自定义操作按钮
    treeData?: boolean //是否为树形数据
    treeLazy?: boolean // 树形数据是否懒加载
    treeLoad?: (row: unknown) => Promise<unknown[]> // 懒加载处理函数
    search: (page: Page<Query, Data>) => Promise<Page<Query, Data> | undefined> // 查询函数
    updateLoad?: (ids: (number | string)[]) => Promise<object[] | undefined> // 更新数据的函数
    updateProperties?: string[] // 要更新的属性名
    createButton?: boolean // 是否展示新增按钮
    pageSizes?: number[] // 可选分页大小
  }>(),
  {
    createButton: false,
    pageSizes: () => [10, 20, 30, 50, 100],
    treeLazy: false
  }
)

// model
// DataTable的数据
const dataList = defineModel<Data[]>('dataList', { default: [], required: false })
// 查询参数
const searchToolbarParams = defineModel<object>('searchParams', { default: {}, required: false })
// 分页查询配置
const page = defineModel<Page<Query, Data>>('page', {
  default: new Page<Query, Data>(),
  required: true
})
// 已编辑的行
const changedRows = defineModel<object[]>('changedRows', { default: [], required: true })

// 事件
const emits = defineEmits([
  'createButtonClicked',
  'rowButtonClicked',
  'selectionChange',
  'pageNumberChanged',
  'pageSizeChanged',
  'query',
  'scroll'
])

// 变量
// 数据栏
const dataTableRef = ref() // DataTable的的组件实例
// 分页栏
// 2024-05-07 jumper会导致警告：ElementPlusError: [el-input] [API] label is about to be deprecated in version 2.8.0, please use aria-label instead.
const layout = ref('sizes, prev, pager, next') // 分页栏组件
const pagerCount = ref(5) // 显示的分页按钮个数
// 保存树形数据的子数据resolve方法的map，用于在除首次加载之外的时机刷新子数据
const treeRefreshMap: Map<number, { treeNode: ElTreeNode; resolve: (data: unknown[]) => void }> = new Map<
  number,
  { treeNode: ElTreeNode; resolve: (data: unknown[]) => void }
>()
// 把向treeRefreshMap写入数据和props.load封装在一起的函数
const wrappedLoad = IsNullish(props.treeLoad)
  ? undefined
  : async (row: unknown, treeNode: ElTreeNode, resolve: (data: unknown[]) => void) => {
      const rowId = Number(lodash.pick(row, props.dataKey))
      if (!treeRefreshMap.has(rowId)) {
        treeRefreshMap.set(rowId, { treeNode: treeNode, resolve: resolve })
      }
      if (NotNullish(props.treeLoad)) {
        const children = await props.treeLoad(row)
        resolve(children)
      }
    }

// 方法
// 数据栏
// 搜索页面并刷新数据
async function doSearch() {
  dataTableRef.value.cancelAllSelection()
  const tempPage = lodash.cloneDeep(page.value)
  // 配置查询参数
  tempPage.query = {
    ...tempPage.query,
    ...searchToolbarParams.value
  } as Query
  const newPage: Page<Query, Data> | undefined = await props.search(tempPage)
  if (NotNullish(newPage)) {
    dataList.value = newPage.data === undefined ? [] : newPage.data
    page.value.dataCount = newPage.dataCount
  }
  // 刷新子数据
  if (NotNullish(props.treeLoad) && NotNullish(wrappedLoad)) {
    if (NotNullish(dataList.value)) {
      dataList.value.forEach((row) => {
        const treeInitItem = treeRefreshMap.get(row[props.dataKey])
        if (NotNullish(treeInitItem)) {
          wrappedLoad(row, treeInitItem.treeNode, treeInitItem.resolve)
        }
      })
    }
  }
}
// 处理DataTable按钮点击
function handleDataTableButtonClicked(operationResponse: DataTableOperationResponse<Data>) {
  emits('rowButtonClicked', operationResponse)
}
// 处理DataTable选中项改变事件
function handleDataTableSelectionChange(selections: []) {
  emits('selectionChange', selections)
}
// 处理滚动事件
function handleScroll() {
  emits('scroll')
}
// 更新现有数据
async function refreshData(waitingUpdateIds: number[] | string[], updateChildren: boolean) {
  // 校验
  if (IsNullish(props.updateLoad) || ArrayIsEmpty(props.updateProperties)) {
    return
  }

  const idsStr: (number | string)[] = waitingUpdateIds.map((id: number | string) => (typeof id === 'number' ? String(id) : id))

  // 根级节点列入待刷新数组
  let waitingUpdateList: Data[]
  waitingUpdateList = dataList.value.filter((data) => idsStr.includes(String(data[props.dataKey])))

  // 根据treeData确认是否包含哪些下级数据
  if (props.treeData && updateChildren) {
    // 更新根数据的所有下级数据
    let tiledWaitingUpdate: TreeNode[] = [] // 平铺的树形数据

    // 把所有根级节点列入tiledWaitingUpdate
    tiledWaitingUpdate = tiledWaitingUpdate.concat(waitingUpdateList as TreeNode[])
    // 把所有根级节点的子节点列入tiledWaitingUpdate
    for (let index = 0; index < tiledWaitingUpdate.length; index++) {
      if (
        Object.prototype.hasOwnProperty.call(tiledWaitingUpdate[index], 'children') &&
        NotNullish(tiledWaitingUpdate[index].children)
      ) {
        const children = tiledWaitingUpdate[index].children
        if (Array.isArray(children)) {
          tiledWaitingUpdate.push(...(children as TreeNode[]))
        }
      }
    }
    waitingUpdateList = tiledWaitingUpdate as Data[]
  } else if (props.treeData) {
    // 只更waitingUpdateIds包含的下级数据
    // 根级节点id列表
    const waitingUpdateRootIds = waitingUpdateList.map((waitingUpdate) => waitingUpdate[props.dataKey])
    // 叶子节点id列表
    const waitingUpdateChildIds = waitingUpdateIds.filter((id) => !waitingUpdateRootIds.includes(id))

    // 利用树形工具找到叶子节点，列入waitingUpdateList
    const tempRoot = { id: undefined, pid: undefined, children: dataList.value as TreeNode[], isLeaf: false }
    for (const id of waitingUpdateChildIds) {
      const child = GetNode(tempRoot, id) as Data
      if (NotNullish(child)) {
        waitingUpdateList.push(child)
      }
    }
  }
  const originalIds = waitingUpdateList.map((data) => data[props.dataKey])

  // 请求更新接口
  const newDataList = await props.updateLoad(originalIds)
  if (ArrayNotEmpty(newDataList)) {
    // 更新updateParamName指定的属性
    for (const newData of newDataList) {
      const waitingUpdate = waitingUpdateList.find((waitingUpdate) => newData[props.dataKey] === waitingUpdate[props.dataKey])
      if (NotNullish(waitingUpdate)) {
        props.updateProperties.forEach((paramName) => {
          waitingUpdate[paramName] = newData[paramName]
        })
      }
    }
  }
}
// 分页栏
// 当前页变化
function handlePageNumberChange() {
  doSearch()
}
// 页面大小变化
function handlePageSizeChange() {
  doSearch()
}
// 处理编辑事件
function handleRowChange(changedRow: object) {
  changedRows.value.push(changedRow)
}
// 获取可视范围内的行
function getVisibleRows(offsetTop?: number, offsetBottom?: number) {
  return dataTableRef.value.getVisibleRows(offsetTop, offsetBottom)
}

// 暴露
defineExpose({
  doSearch,
  refreshData,
  getVisibleRows
})
</script>

<template>
  <div class="search-table">
    <!-- 为了不被el-table内置的2层z轴以及固定列的2+1增z轴遮挡，此处为3层z轴 -->
    <search-toolbar-v1 class="search-table-toolbar z-layer-3" @search-button-clicked="doSearch">
      <template #main>
        <slot name="toolbarMain" />
      </template>
      <template #dropdown>
        <slot name="toolbarDropdown" />
      </template>
    </search-toolbar-v1>
    <div class="search-table-data">
      <data-table
        ref="dataTableRef"
        v-model:table-data="dataList"
        class="search-table-data-table"
        :thead="thead"
        :selectable="selectable"
        :multi-select="multiSelect"
        :data-key="dataKey"
        :table-row-class-name="tableRowClassName"
        :operation-button="operationButton"
        :operation-width="operationWidth"
        :custom-operation-button="customOperationButton"
        :tree-data="treeData"
        :lazy="props.treeLazy"
        :load="wrappedLoad"
        @button-clicked="handleDataTableButtonClicked"
        @selection-change="handleDataTableSelectionChange"
        @row-changed="handleRowChange"
        @scroll="handleScroll"
      >
        <template #customOperations="{ row }">
          <slot name="customOperations" :row="row" />
        </template>
      </data-table>
      <div class="search-table-data-pagination-scroll-wrapper">
        <el-scrollbar class="search-table-data-pagination-scroll">
          <div class="search-table-data-pagination-wrapper">
            <el-pagination
              v-model:current-page="page.pageNumber"
              v-model:page-size="page.pageSize"
              class="search-table-data-pagination"
              :layout="layout"
              :page-sizes="pageSizes"
              :default-page-size="page.pageSize"
              :pager-count="pagerCount"
              :total="page.dataCount"
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
}
.search-table-toolbar {
  height: 32px;
  width: 100%;
  background-color: var(--el-fill-color-blank);
  border-top-left-radius: 6px;
  border-top-right-radius: 6px;
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
