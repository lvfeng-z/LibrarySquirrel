<script setup lang="ts">
// props
import { ref } from 'vue'

const props = defineProps<{
  stringToExplain: string
}>()

// 变量
const meaningOfPath = ref()

// 方法
function confirmExplain() {
  window.electron.ipcRenderer.send('explain-path-response', meaningOfPath.value)
}
</script>

<template>
  <el-dialog>
    <el-row>
      <label>{{ props.stringToExplain }}</label>
    </el-row>
    <el-row>
      <el-input v-model="meaningOfPath"></el-input>
    </el-row>
    <el-row>
      <el-button @click="confirmExplain">确定</el-button>
    </el-row>
  </el-dialog>
</template>

<style scoped></style>
