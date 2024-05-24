<script setup lang="ts">
import LocalAuthor from '../../model/main/LocalAuthor.ts'

// props
const props = defineProps<{
  author: LocalAuthor
}>()
</script>

<template>
  <el-text>{{ props.author.localAuthorName }}</el-text>
</template>

<style scoped></style>
