<script setup lang="ts">
import { ref } from 'vue'

let loading: boolean = false
const selectedList = ref('')
let tagSelectList = []
const insert = () => {
  const tag1 = { id: null, localTagName: 'aryion', baseLocalTagId: 0 }
  window.api.tagLocalInsert(tag1)
}
const getTagSelectList = async (keyword) => {
  loading = true
  try {
    const result = window.api.tagLocalGetSelectList(keyword)
    console.log(result)
    tagSelectList = result
  } catch (e) {
    console.log(e)
  } finally {
    loading = false
  }
}
</script>

<template>
  <el-select
    v-model="selectedList"
    multiple
    filterable
    remote
    :remote-method="getTagSelectList"
    :loading="loading"
  >
    <el-option
      v-for="item in tagSelectList"
      :key="item.value"
      :label="item.label"
      :value="item.value"
    ></el-option>
  </el-select>
  <el-button @click="insert">插入</el-button>
  <el-button @click="getTagSelectList">查询</el-button>
</template>
