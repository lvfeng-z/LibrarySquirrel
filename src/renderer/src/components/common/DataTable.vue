<script setup lang="ts">
import { onBeforeMount, Ref, ref, UnwrapRef } from 'vue'
import { OperationItem } from '../../model/util/OperationItem'
import { Thead } from '../../model/util/Thead'
import { DataTableOperationResponse } from '../../model/util/DataTableOperationResponse'
import CommonInputModule from './CommonInputModule.vue'
//todo 数据列的宽度可拖拽调整，表头的el-tag超长部分省略，分页功能

// props
const props = defineProps<{
  selectable: boolean // 列表是否可选择
  multiSelect: boolean // 列表是否多选
  thead: Thead[] // 表头信息
  keyOfData: string // 数据的唯一标识
  operationButton?: OperationItem[] // 操作列按钮的文本、图标和代号
}>()

// onBeforeMount
onBeforeMount(() => {
  initializeThead()
})

// model
const data = defineModel<unknown[]>('tableData', { default: [] })

// 变量
const selectDataList: Ref<UnwrapRef<object[]>> = ref([])
const currentFactor: Ref<UnwrapRef<object>> = ref({})
const innerThead: Ref<UnwrapRef<Thead[]>> = ref([])

// 方法
// 初始化表头
function initializeThead() {
  props.thead.forEach((item) => {
    const tempThead = JSON.parse(JSON.stringify(item)) as Thead

    // 未设置表头tag样式，默认为info
    if (tempThead.headerTagType == undefined) {
      tempThead.headerTagType = 'info'
    }

    innerThead.value.push(tempThead)
  })
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
function handleRowChange(event) {
  console.log(event)
}

// 事件
const emits = defineEmits(['selectionChange', 'buttonClicked'])
</script>

<template>
  <el-table
    class="data-table"
    :data="data"
    :row-key="keyOfData"
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
              <el-tag size="default" :type="item.headerTagType">{{ item.label }}</el-tag>
            </div>
          </template>
          <template #default="scope">
            <CommonInputModule
              v-model:data="scope.row[item.name]"
              :config="item"
              @data-changed="handleRowChange(scope.row)"
            ></CommonInputModule>
          </template>
        </el-table-column>
      </template>
    </template>
    <el-table-column
      v-if="props.operationButton !== undefined && props.operationButton.length > 0"
      fixed="right"
      align="center"
      width="104"
    >
      <template #header>
        <el-tag size="default" type="warning">{{ '操作' }}</el-tag>
      </template>
      <template #default="{ row }">
        <el-dropdown>
          <el-button
            :icon="
              props.operationButton.filter((item) =>
                item.rule === undefined ? true : item.rule(row)
              )[0].icon
            "
            @click="
              handleRowButtonClicked({
                id: row[props.keyOfData],
                code: props.operationButton.filter((item) =>
                  item.rule === undefined ? true : item.rule(row)
                )[0].code,
                data: row
              })
            "
          >
            {{
              props.operationButton.filter((item) =>
                item.rule === undefined ? true : item.rule(row)
              )[0].label
            }}
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <template
                v-for="item in props.operationButton
                  .filter((item) => (item.rule === undefined ? true : item.rule(row)))
                  .slice(1)"
                :key="item.code"
              >
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
