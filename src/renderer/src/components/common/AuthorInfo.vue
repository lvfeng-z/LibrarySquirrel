<script setup lang="ts">
import LocalAuthorDTO from '../../model/main/dto/LocalAuthorDTO.ts'
import { NotNullish } from '../../utils/CommonUtil'

// props
const props = defineProps<{
  authors: LocalAuthorDTO[] | undefined | null
}>()

// 方法
function getAuthorNames() {
  if (NotNullish(props.authors)) {
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
