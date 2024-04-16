<template>
  <div class="data-table">
    <div class="data-list-wrapper">
      <el-table
        class="data-list-table"
        :data="props.data"
        :selectable="props.selectable"
        @selection-change="selectionChange"
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
              v-model="currentFactor"
              :value="row[props.keyOfData]"
              @change="selectionChange(row)"
              >{{ '' }}
            </el-radio>
          </template>
        </el-table-column>
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
                  <el-tag size="default" :type="item.headerTagType">{{ item.label }}</el-tag>
                </div>
              </template>
            </el-table-column>
          </template>
        </template>
        <el-table-column label="操作" align="center">
          <template #header>
            <el-tag size="default" type="warning">{{ '操作' }}</el-tag>
          </template>
          <template #default="{ row }">
            <el-dropdown>
              <el-button
                :icon="props.operationButton.icon"
                @click="
                  buttonClicked({ id: row[props.keyOfData], code: props.operationButton.code })
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
                        buttonClicked({
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

<script setup lang="ts">
import { ref } from 'vue'

// 类型
// 表头
export interface Thead {
  name: string // 字段名
  label: string // 标题名称
  dataType: string // 数据类型
  hide: boolean // 是否隐藏
  width?: number // 数据列宽度
  headerAlign?: 'center' | 'left' | 'right' // 标题停靠位置
  headerTagType?: 'warning' | 'info' | 'success' | 'primary' | 'danger' // 标题使用的el-tag样式
  dataAlign?: 'center' | 'left' | 'right' // 数据停靠位置
  overHide?: boolean //列超出长度时是否省略
}

// 操作栏按钮或下拉菜单按钮
export interface OperationItem {
  label: string
  icon: string
  code: string
}

// 操作点击返回类型
export interface OperationResponse {
  id: string
  code: string
}

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

// 变量
const selectDataList = ref([])
const currentFactor = ref('')

// 方法
function selectionChange(newSelectedList) {
  selectDataList.value = newSelectedList
  emits('selectionChange', selectDataList.value)
}
function buttonClicked(operationResponse: OperationResponse) {
  emits('buttonClicked', operationResponse)
}

// 事件
const emits = defineEmits(['selectionChange', 'buttonClicked'])
</script>

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
  display: flex;
  flex-direction: column;
}

.data-list-table {
  height: 100%;
  width: 100%;
}
</style>
