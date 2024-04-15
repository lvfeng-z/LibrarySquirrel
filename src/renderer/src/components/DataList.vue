<template>
  <div class="data-list">
    <div class="data-list-wrapper">
      <el-table :data="props.data" :selectable="props.selectable" @selection-change="selectionChange">
        <el-table-column
          v-if="props.selectable"
          type="selection"
          width="30"
          :reserve-selection="props.multiSelect"
        />
        <template v-for="(item, index) in props.thead">
          <template v-if="!item.hide">
            <el-table-column :key="index" :prop="item.name" :label="item.label"></el-table-column>
          </template>
        </template>
        <el-table-column label="操作" align="center">
          <template #default>
            <el-dropdown>
              <el-button icon="view">查看</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item icon="edit">修改</el-dropdown-item>
                  <el-dropdown-item icon="delete">删除</el-dropdown-item>
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

const props = defineProps<{
  selectable: boolean // 列表是否可选择
  multiSelect: boolean // 列表是否多选
  thead: dataListThead[] // 表头信息
  data: [] // 数据
}>()

// 表头信息类型
type dataListThead = { name: string; label: string; dataType: string; hide: boolean }

// 变量
const selectDataList = ref([])

// 方法
function selectionChange(newSelectedList) {
  selectDataList.value = newSelectedList
  emits('selectionChange', selectDataList.value)
}

// 事件
const emits = defineEmits(['selectionChange'])
</script>

<style scoped>
.data-list {
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
</style>
