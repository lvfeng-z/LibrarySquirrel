<script setup lang="ts">
// props
import { ref } from 'vue'

const props = defineProps<{
  stringToExplain: string
}>()

// 变量
// 接口
// const apis = {}
const meaningOfPath = ref()
// 目录含义选择列表
const meaningTypes = [
  { value: 'author', label: '作者' },
  { value: 'tag', label: '标签' },
  { value: 'worksName', label: '作品名称' },
  { value: 'worksSetName', label: '作品集名称' },
  { value: 'siteName', label: '站点名称' },
  { value: 'createTime', label: '创建时间' },
  { value: 'unknown', label: '未知/无含义' }
]
const typeOfMeaning = ref() // 目录含义类型
const typeOfInput = ref('select') // 输入栏类型

// 方法
function confirmExplain() {
  window.electron.ipcRenderer.send('explain-path-response', meaningOfPath.value)
}
// 刷新输入栏
function refreshInput() {
  switch (typeOfMeaning.value) {
    case 'author':
    case 'tag':
    case 'site':
      typeOfInput.value = 'select'
      break
    case 'worksName':
    case 'worksSetName':
      typeOfInput.value = 'input'
      break
    case 'createTime':
      typeOfInput.value = 'dateTimePicker'
      break
    default:
      typeOfInput.value = 'input'
      break
  }
}
</script>

<template>
  <el-dialog>
    <el-row>
      <label>{{ props.stringToExplain }}</label>
    </el-row>
    <el-row>
      <el-col :span="5">
        <el-select v-model="typeOfMeaning" @change="refreshInput">
          <el-option
            v-for="item in meaningTypes"
            :key="item.value"
            :value="item.value"
            :label="item.label"
          >
          </el-option>
        </el-select>
      </el-col>
      <el-col :span="19">
        <el-input v-if="typeOfInput === 'input'"></el-input>
        <el-select v-if="typeOfInput === 'select'"></el-select>
        <el-date-picker v-if="typeOfInput === 'dateTimePicker'"></el-date-picker>
      </el-col>
    </el-row>
    <el-row>
      <el-button @click="confirmExplain">确定</el-button>
    </el-row>
  </el-dialog>
</template>

<style scoped></style>
