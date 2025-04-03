<script setup lang="ts">
import LocalAuthorRoleDTO from '../../model/main/dto/LocalAuthorRoleDTO.ts'
import { NotNullish } from '../../utils/CommonUtil'

// props
const props = defineProps<{
  authors: LocalAuthorRoleDTO[] | undefined | null
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
