<script setup lang="ts">
import { ref } from 'vue'

let loading = false
const selectedList = ref('')
const tagSelectList = ref('')

const insert = () => {
  const tag1 = { id: null, localTagName: 'aryion', baseLocalTagId: 0 }
  window.api.tagLocalInsert(tag1)
}
const getTagSelectList = async (keyword) => {
  loading = true
  try {
    tagSelectList.value = await window.api.tagLocalGetSelectList(keyword)
  } catch (e) {
    console.log(e)
  } finally {
    loading = false
  }
}
</script>

<template>
  <div class="flex content-center items-center mb-4 justify-between">
    <h3 class="text-lg">title</h3>
    <el-button
      icon="close"
      plain
      circle
      type="default"
      class="w-8 h-8 relative -right-4 -top-2 shadow-md focus:shadow-none focus:outline-none"
    ></el-button>
  </div>
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
