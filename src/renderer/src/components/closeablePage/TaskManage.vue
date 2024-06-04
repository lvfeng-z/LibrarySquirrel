<script setup lang="ts">
import BaseCloseablePage from './BaseCloseablePage.vue'
import { reactive, ref } from 'vue'

// 变量
const apis = reactive({
  taskServiceCreateTask: window.api.taskServiceCreateTask,
  taskServiceStartTask: window.api.taskServiceStartTask
}) // 接口
const activeName = ref([1, 2]) // 默认展开的折叠面板
const importDir = ref('') // 导入目录
const taskId = ref() // 任务id

// 方法
// 保存设置
function importFromDir() {
  apis.taskServiceCreateTask('file://'.concat(importDir.value)).then(() => {
    console.log('完成了')
  })
}
// 开始任务
function startTask() {
  apis.taskServiceStartTask(taskId.value)
}
</script>

<template>
  <base-closeable-page>
    <el-scrollbar>
      <el-collapse v-model="activeName">
        <el-collapse-item title="本地导入" :name="1">
          <el-row>
            <el-col :span="24">
              <el-input v-model="importDir"></el-input>
            </el-col>
          </el-row>
          <el-row>
            <el-col :span="3">
              <el-button type="primary" @click="importFromDir">导入</el-button>
            </el-col>
          </el-row>
        </el-collapse-item>
        <el-collapse-item title="开始任务" :name="2">
          <el-row>
            <el-col :span="24">
              <el-input v-model="taskId"></el-input>
            </el-col>
          </el-row>
          <el-row>
            <el-col :span="3">
              <el-button type="primary" @click="startTask">开始任务</el-button>
            </el-col>
          </el-row>
        </el-collapse-item>
      </el-collapse>
    </el-scrollbar>
  </base-closeable-page>
</template>

<style scoped></style>
