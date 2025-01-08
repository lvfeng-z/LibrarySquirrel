<script setup lang="ts">
import LocalAuthorDTO from '../../model/main/dto/LocalAuthorDTO.ts'
import { notNullish } from '../../utils/CommonUtil'
import ScrollTextBox from './ScrollTextBox.vue'

// props
const props = defineProps<{
  authors: LocalAuthorDTO[] | undefined | null
}>()

// 方法
function getAuthorNames() {
  if (notNullish(props.authors)) {
    const nameList = props.authors.map((author) => author.localAuthorName)
    return nameList.join('、')
  } else {
    return ''
  }
}
</script>

<template>
  <el-text>{{ getAuthorNames() }}</el-text>
</template>

<style scoped></style>
