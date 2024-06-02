<script setup lang="ts">
import BaseCloseablePage from './BaseCloseablePage.vue'
import { reactive, ref } from 'vue'

// 变量
const apis = reactive({
  taskServiceCreateTask: window.api.taskServiceCreateTask
}) // 接口
const activeName = ref([1]) // 默认展开的折叠面板
const importDir = ref('')

// 方法
// 保存设置
function importFromDir() {
  apis.taskServiceCreateTask('file://'.concat(importDir.value)).then(() => {
    console.log('完成了')
  })
}
</script>

<template>
  <base-closeable-page>
    <el-scrollbar>
      <el-collapse v-model="activeName">
        <el-collapse-item title="本地导入" :name="1">
          <el-input v-model="importDir"></el-input>
        </el-collapse-item>
      </el-collapse>
      <el-row>
        <el-col :span="6">
          <el-button type="primary" @click="importFromDir">导入</el-button>
        </el-col>
      </el-row>
    </el-scrollbar>
  </base-closeable-page>
</template>

<style scoped></style>
