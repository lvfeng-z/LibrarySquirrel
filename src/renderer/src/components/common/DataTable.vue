<script setup lang="ts">
import { onBeforeMount, Ref, ref, UnwrapRef } from 'vue'
import { OperationItem } from '../../utils/model/OperationItem'
import { Thead } from '../../utils/model/Thead'
import { OperationResponse } from '../../utils/model/OperationResponse'
//todo 数据列的宽度可拖拽调整，表头的el-tag超长部分省略，分页功能

// props
const props = defineProps<{
  selectable: boolean // 列表是否可选择
  multiSelect: boolean // 列表是否多选
  thead: Thead[] // 表头信息
  keyOfData: string // 数据的唯一标识
  data: unknown[] // 数据
  operationButton: OperationItem // 操作列按钮的文本、图标和代号
  operationDropdown?: OperationItem[] // 操作列下拉菜单的文本、图标和代号（数组）
}>()

// onBeforeMount
onBeforeMount(() => {
  initializeThead()
})

// 变量
const selectDataList: Ref<UnwrapRef<object[]>> = ref([])
const currentFactor: Ref<UnwrapRef<object>> = ref({})
const innerThead: Ref<UnwrapRef<Thead[]>> = ref([])

// 方法
// 初始化表头
function initializeThead() {
  props.thead.forEach((item) => {
    const tempThead = JSON.parse(JSON.stringify(item))

    // 未设置表头tag样式，默认为info
    if (tempThead.headerTagType == undefined) {
      tempThead.headerTagType = 'info'
    }

    innerThead.value.push(tempThead)
  })
}
function handleSelectionChange(newSelectedList: object[]) {
  selectDataList.value = newSelectedList
  emits('selectionChange', selectDataList.value)
}
function handleRowButtonClicked(operationResponse: OperationResponse) {
  emits('buttonClicked', operationResponse)
}

// 事件
const emits = defineEmits(['selectionChange', 'buttonClicked'])
</script>

<template>
  <div class="data-table">
    <div class="data-list-wrapper">
      <el-table
        class="data-list-table"
        :data="props.data"
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
            </el-table-column>
          </template>
        </template>
        <el-table-column align="center">
          <template #header>
            <el-tag size="default" type="warning">{{ '操作' }}</el-tag>
          </template>
          <template #default="{ row }">
            <el-dropdown>
              <el-button
                :icon="props.operationButton.icon"
                @click="
                  handleRowButtonClicked({
                    id: row[props.keyOfData],
                    code: props.operationButton.code
                  })
                "
              >
                {{ props.operationButton.label }}
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <template v-for="item in props.operationDropdown" :key="item.code">
                    <el-dropdown-item
                      :icon="item.icon"
                      @click="
                        handleRowButtonClicked({
                          id: row[props.keyOfData],
                          code: item.code
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
    </div>
  </div>
</template>

<style scoped>
.data-table {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
}

.data-list-wrapper {
  width: calc(100% - 10px);
  height: calc(100% - 10px);
}

.data-list-table {
  height: 100%;
  width: 100%;
}
</style>
