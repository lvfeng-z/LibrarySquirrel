<script setup lang="ts">
import { onBeforeMount, Ref, ref, UnwrapRef } from 'vue'
import OperationItem from '../../model/util/OperationItem'
import Thead from '../../model/util/Thead'
import DataTableOperationResponse from '../../model/util/DataTableOperationResponse'
import CommonInput from './CommonInput.vue'
import ApiUtil from '../../utils/ApiUtil'
import lodash from 'lodash'
import { isNullish } from '../../utils/CommonUtil'
import { TreeNode } from 'element-plus'
//todo 数据列的宽度可拖拽调整，表头的el-tag超长部分省略

// props
const props = withDefaults(
  defineProps<{
    selectable: boolean // 列表是否可选择
    multiSelect: boolean // 列表是否多选
    thead: Thead[] // 表头信息
    keyOfData: string // 数据的唯一标识
    tableRowClassName?: (data: { row: unknown; rowIndex: number }) => string // 给行添加class的函数
    operationButton?: OperationItem[] // 操作列按钮的文本、图标和代号
    customOperationButton?: boolean // 是否使用自定义操作栏
    treeData?: boolean // 是否为树形数据
    lazy?: boolean // 树形数据是否懒加载
    load?: (row: unknown, treeNode: TreeNode, resolve: (data: unknown[]) => void) => void // 懒加载处理函数
  }>(),
  { customOperationButton: false, treeData: false, lazy: false }
)

// onBeforeMount
onBeforeMount(() => {
  initializeThead()
})

// model
const data = defineModel<unknown[]>('tableData', { default: [] })

// 变量
const dataTable = ref() // el-table的组件实例
const selectDataList: Ref<UnwrapRef<object[]>> = ref([])
const currentFactor: Ref<UnwrapRef<object>> = ref({})
const innerThead: Ref<UnwrapRef<Thead[]>> = ref([])

// 方法
// 初始化表头
async function initializeThead() {
  for (const item of props.thead) {
    const tempThead = lodash.cloneDeep(item) as Thead
    // 阻止CommonInput组件请求接口
    tempThead.useApi = false
    // 请求接口并将响应值赋值给selectData，同时忽略接口报错
    if (item.useApi && item.api !== undefined) {
      const response = await item.api()
      if (ApiUtil.apiResponseCheck(response)) {
        tempThead.selectData = ApiUtil.apiResponseGetData(response) as []
      }
    }

    // 未设置表头tag样式，默认为info
    if (isNullish(tempThead.headerTagType)) {
      tempThead.headerTagType = 'info'
    }

    innerThead.value.push(tempThead)
  }
}
// 处理选中事件
function handleSelectionChange(event: object[]) {
  selectDataList.value = event
  emits('selectionChange', selectDataList.value)
}
// 处理操作按钮点击事件
function handleRowButtonClicked(operationResponse: DataTableOperationResponse) {
  emits('buttonClicked', operationResponse)
}
// 处理行数据变化
function handleRowChange(row: object) {
  emits('rowChanged', row)
}
// 获取操作栏按钮
function getOperateButton(row): OperationItem {
  if (props.operationButton !== undefined && props.operationButton.length > 0) {
    return props.operationButton.filter((item) =>
      item.rule === undefined ? true : item.rule(row)
    )[0]
  } else {
    return { code: '', label: '', icon: '' }
  }
}
// 获取操作栏下拉按钮
function getOperateDropDownButton(row): OperationItem[] {
  if (props.operationButton !== undefined && props.operationButton.length > 0) {
    return props.operationButton
      .filter((item) => (item.rule === undefined ? true : item.rule(row)))
      .slice(1)
  } else {
    return [{ code: '', label: '', icon: '' }]
  }
}
// 获取可视范围内的行数据
function getVisibleRows(offsetTop?: number, offsetBottom?: number) {
  // 获取表格 body 包装器
  const tableBodyWrapper = dataTable.value.$el.querySelector('.el-table__body-wrapper') as Element

  // 获取所有行元素
  const rowElements = tableBodyWrapper.querySelectorAll('.el-table__row')

  // 获取可视区域内的行
  return Array.from(rowElements)
    .filter((row) => {
      const rowTop = row.getBoundingClientRect().top
      const rowBottom = row.getBoundingClientRect().bottom
      offsetTop = offsetTop || 0
      offsetBottom = offsetBottom || 0
      return (
        rowTop < tableBodyWrapper.getBoundingClientRect().bottom + offsetBottom &&
        rowBottom > tableBodyWrapper.getBoundingClientRect().top - offsetTop
      )
    })
    .map((rowElement) => rowElement['__vnode'].key)
}

// 事件
const emits = defineEmits(['selectionChange', 'buttonClicked', 'rowChanged'])

// 暴露
defineExpose({
  getVisibleRows
})
</script>

<template>
  <el-table
    ref="dataTable"
    class="data-table"
    :lazy="props.lazy"
    :load="props.load"
    :data="data"
    :row-key="keyOfData"
    :row-class-name="tableRowClassName"
    :selectable="props.selectable"
    @selection-change="handleSelectionChange"
  >
    <el-table-column
      v-if="props.selectable && props.multiSelect"
      type="selection"
      width="30"
      :reserve-selection="props.multiSelect"
    />
    <el-table-column v-if="props.selectable && !props.multiSelect" width="30">
      <template #default="{ row }">
        <el-radio
          v-model="currentFactor[props.keyOfData]"
          :value="row[props.keyOfData]"
          @change="handleSelectionChange([row])"
          >{{ '' }}
        </el-radio>
      </template>
    </el-table-column>
    <el-table-column v-if="props.treeData" width="25" />
    <template v-for="(item, index) in innerThead">
      <template v-if="!item.hide">
        <el-table-column
          :key="index"
          :prop="item.name"
          :label="item.label"
          :width="item.width"
          :align="item.dataAlign"
          :show-overflow-tooltip="item.overHide"
        >
          <template #header>
            <div :style="{ textAlign: item.headerAlign }">
              <el-tag size="default" :type="item.headerTagType">
                {{ item.label }}
              </el-tag>
            </div>
          </template>
          <template #default="scope">
            <common-input
              v-model:data="scope.row[item.name]"
              :config="item"
              @data-changed="handleRowChange(scope.row)"
            ></common-input>
          </template>
        </el-table-column>
      </template>
    </template>
    <el-table-column
      v-if="props.operationButton !== undefined && props.operationButton.length > 0"
      fixed="right"
      align="center"
      min-width="104"
    >
      <template #header>
        <el-tag size="default" type="warning">{{ '操作' }}</el-tag>
      </template>
      <template #default="{ row }">
        <el-dropdown v-if="!customOperationButton">
          <el-button
            :type="getOperateButton(row).buttonType"
            :icon="getOperateButton(row).icon"
            @click="
              handleRowButtonClicked({
                id: row[props.keyOfData],
                code: getOperateButton(row).code,
                data: row
              })
            "
          >
            {{ getOperateButton(row).label }}
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <template v-for="item in getOperateDropDownButton(row)" :key="item.code">
                <el-dropdown-item
                  :icon="item.icon"
                  @click="
                    handleRowButtonClicked({
                      id: row[props.keyOfData],
                      code: item.code,
                      data: row
                    })
                  "
                >
                  {{ item.label }}
                </el-dropdown-item>
              </template>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <slot v-if="customOperationButton" name="customOperations" :row="row" />
      </template>
    </el-table-column>
  </el-table>
</template>

<style scoped>
.data-table {
  height: 100%;
  width: 100%;
}
</style>
