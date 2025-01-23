<script setup lang="ts" generic="Data, OpParam">
import { onBeforeMount, onMounted, Ref, ref } from 'vue'
import OperationItem from '../../model/util/OperationItem'
import { Thead } from '../../model/util/Thead'
import DataTableOperationResponse from '../../model/util/DataTableOperationResponse'
import PopperInput from './CommentInput/PopperInput.vue'
import CommonInput from '@renderer/components/common/CommentInput/CommonInput.vue'
import { NotNullish } from '../../utils/CommonUtil'
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
    operationButton?: OperationItem<OpParam>[] // 操作列按钮的文本、图标和代号
    operationWidth?: number // 操作栏宽度
    customOperationButton?: boolean // 是否使用自定义操作栏
    treeData?: boolean // 是否为树形数据
    treeLazy?: boolean // 树形数据是否懒加载
    treeLoad?: (row: unknown, treeNode: TreeNode, resolve: (data: unknown[]) => void) => void // 懒加载处理函数
  }>(),
  { customOperationButton: false, treeData: false, treeLazy: false }
)

// onBeforeMount
onBeforeMount(() => {
  initializeThead()
})

// onMounted
onMounted(() => {
  // 获取表格 body 包装器
  const scrollBarWrapper = dataTable.value.$refs.scrollBarRef.wrapRef
  scrollBarWrapper.addEventListener('scroll', () => emits('scroll'))
})

// model
const data = defineModel<unknown[]>('tableData', { default: [] })

// 变量
const dataTable = ref() // el-table组件的实例
const selectDataList: Ref<Data[]> = ref([])
const selectedDataKey: Ref<string> = ref('')

// 方法
// 初始化表头
async function initializeThead() {
  for (const item of props.thead) {
    // 给selectData赋值
    if (NotNullish(item.load)) {
      item.refreshSelectData()
    }
  }
}
// 处理选中事件
function handleSelectionChange(event: Data[]) {
  selectDataList.value = event
  emits('selectionChange', selectDataList.value)
}
// 取消所有选中
function cancelAllSelection() {
  selectDataList.value.length = 0
  dataTable.value.clearSelection()
}
// 处理操作按钮点击事件
function handleRowButtonClicked(operation: { row: Data; operationItem: OperationItem<OpParam> }) {
  if (operation.operationItem.clickToSelect) {
    if (props.multiSelect) {
      dataTable.value.toggleRowSelection(operation.row, true)
    } else {
      selectedDataKey.value = operation.row[props.keyOfData]
    }
    handleSelectionChange([operation.row])
  }
  const operationResponse: DataTableOperationResponse<Data> = {
    id: operation.row[props.keyOfData],
    code: operation.operationItem.code,
    data: operation.row
  }
  emits('buttonClicked', operationResponse)
}
// 处理行数据变化
function handleRowChange(row: object) {
  emits('rowChanged', row)
}
// 获取操作栏按钮
function getOperateButton(row): OperationItem<OpParam> {
  if (props.operationButton !== undefined && props.operationButton.length > 0) {
    return props.operationButton.filter((item) => (item.rule === undefined ? true : item.rule(row)))[0]
  } else {
    return { code: '', label: '', icon: '' }
  }
}
// 获取操作栏下拉按钮
function getOperateDropDownButton(row): OperationItem<OpParam>[] {
  if (props.operationButton !== undefined && props.operationButton.length > 0) {
    return props.operationButton.filter((item) => (item.rule === undefined ? true : item.rule(row))).slice(1)
  } else {
    return [{ code: '', label: '', icon: '' }]
  }
}
// 获取可视范围内的行数据
function getVisibleRows(offsetTop?: number, offsetBottom?: number) {
  // 获取表格 body 包装器
  const tableBodyWrapper = dataTable.value.$el.querySelector('.el-table__body-wrapper') as Element

  // 获取所有行中class为row-key-col的元素（添加在每一行末尾的隐藏列）
  const rowElements = tableBodyWrapper.querySelectorAll('.row-key-col')

  // 返回可视区域内的行的键
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
    .map((rowElement) => {
      try {
        return rowElement.attributes['row-key']['value']
      } catch (error) {
        console.warn(error)
        return undefined
      }
    })
}

// 事件
const emits = defineEmits(['selectionChange', 'buttonClicked', 'rowChanged', 'scroll'])

// 暴露
defineExpose({
  getVisibleRows,
  cancelAllSelection
})
</script>

<template>
  <el-table
    ref="dataTable"
    class="data-table"
    :lazy="props.treeLazy"
    :load="props.treeLoad"
    :data="data"
    :row-key="keyOfData"
    :row-class-name="tableRowClassName"
    :selectable="props.selectable"
    @selection-change="handleSelectionChange"
  >
    <el-table-column v-if="props.selectable && props.multiSelect" type="selection" width="30" :reserve-selection="props.multiSelect" />
    <el-table-column v-if="props.selectable && !props.multiSelect" width="30">
      <template #default="{ row }">
        <el-radio v-model="selectedDataKey" :value="row[props.keyOfData]" @change="handleSelectionChange([row])" />
      </template>
    </el-table-column>
    <el-table-column v-if="props.treeData" width="25" />
    <template v-for="(item, index) in props.thead">
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
            <component
              :is="item.editMethod === 'replace' ? CommonInput : PopperInput"
              v-model:data="scope.row[item.name]"
              :config="item"
              @data-changed="handleRowChange(scope.row)"
            />
          </template>
        </el-table-column>
      </template>
    </template>
    <el-table-column
      v-if="(props.operationButton !== undefined && props.operationButton.length > 0) || props.customOperationButton"
      fixed="right"
      align="center"
      :width="operationWidth"
      :min-width="104"
    >
      <template #header>
        <el-tag size="default" type="warning">{{ '操作' }}</el-tag>
      </template>
      <template #default="{ row }">
        <el-dropdown v-if="!customOperationButton">
          <el-button
            :type="getOperateButton(row).buttonType"
            :icon="getOperateButton(row).icon"
            @click="handleRowButtonClicked({ row: row, operationItem: getOperateButton(row) })"
          >
            {{ getOperateButton(row).label }}
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <template v-for="item in getOperateDropDownButton(row)" :key="item.code">
                <el-dropdown-item :icon="item.icon" @click="handleRowButtonClicked({ row: row, operationItem: item })">
                  {{ item.label }}
                </el-dropdown-item>
              </template>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <slot v-if="customOperationButton" name="customOperations" :row="row" />
      </template>
    </el-table-column>
    <el-table-column :hidden="true" :width="1">
      <template #default="scope">
        <div :row-key="scope.row[keyOfData]" class="row-key-col" style="width: 0; height: 0; position: absolute" />
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
