<script setup lang="ts">
const insert = () => {
  const tag1 = { id: null, tag_source: 'aryion', name: 'vore', base_tag: 0 }
  console.log(tag1)
  window.api.insertTag(tag1)
}
const query = () => {
  let a = window.api.queryTag()
  console.log(a)
}
</script>

<template>
  <el-button @click="insert">插入</el-button>
  <el-button @click="query">查询</el-button>
</template>
