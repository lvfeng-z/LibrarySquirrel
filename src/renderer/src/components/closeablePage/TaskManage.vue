<script setup lang="ts">
import BaseCloseablePage from './BaseCloseablePage.vue'
import { reactive, ref } from 'vue'
import ApiResponse from '../../model/util/ApiResponse'
import ApiUtil from '../../utils/ApiUtil'

// 变量
const apis = reactive({
  taskCreateTask: window.api.taskCreateTask,
  taskStartTask: window.api.taskStartTask,
  dirSelect: window.api.dirSelect
}) // 接口
const activeName = ref([1, 2]) // 默认展开的折叠面板
const taskId = ref() // 任务id

// 方法
// 保存设置
async function importFromDir(dir: string) {
  await apis.taskCreateTask('file://'.concat(dir))
}
// 开始任务
function startTask() {
  apis.taskStartTask(taskId.value)
}
// 选择目录
async function selectDir(openFile: boolean) {
  const response = (await apis.dirSelect(openFile)) as ApiResponse
  if (ApiUtil.apiResponseCheck(response)) {
    const dirSelectResult = ApiUtil.apiResponseGetData(response) as Electron.OpenDialogReturnValue
    if (!dirSelectResult.canceled) {
      for (const dir of dirSelectResult.filePaths) {
        await importFromDir(dir)
      }
    }
  }
}
</script>

<template>
  <base-closeable-page>
    <el-row>
      <el-col class="task-manage-local-import-button-col" :span="12">
        <el-dropdown>
          <el-button size="large" type="danger" icon="Monitor" @click="selectDir(false)">
            从本地导入
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="selectDir(true)">选择文件导入</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-col>
      <el-col class="task-manage-site-import-button-col" :span="12">
        <el-button size="large" type="primary" icon="Link">从站点下载</el-button>
      </el-col>
    </el-row>
    <el-scrollbar>
      <el-collapse v-model="activeName">
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

<style scoped>
.task-manage-local-import-button-col {
  display: flex;
  justify-content: center;
  align-items: center;
}
.task-manage-site-import-button-col {
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
