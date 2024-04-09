<script setup lang="ts">
const insert = () => {
  const tag1 = { id: null, localTagName: 'aryion', baseLocalTagId: 0 }
  window.api.insertTag(tag1)
}
const query = () => {
  const a = window.api.queryTag()
  console.log(a)
}
</script>

<template>
  <el-button @click="insert">插入</el-button>
  <el-button @click="query">查询</el-button>
</template>
