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
  <scroll-text-box class="author-info-scroll-text-box">{{ getAuthorNames() }}</scroll-text-box>
</template>

<style scoped>
.author-info-scroll-text-box {
  width: 100%;
}
</style>
