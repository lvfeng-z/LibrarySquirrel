<script setup lang="ts">
import { computed } from 'vue'
import { ArrayNotEmpty, NotNullish } from '@renderer/utils/CommonUtil.ts'
import LocalAuthorRankDTO from '@renderer/model/main/dto/LocalAuthorRankDTO.ts'
import SiteAuthorRankDTO from '@renderer/model/main/dto/SiteAuthorRankDTO.ts'

// props
const props = defineProps<{
  localAuthors: LocalAuthorRankDTO[] | undefined | null
  siteAuthors: SiteAuthorRankDTO[] | undefined | null
}>()

// 变量
const authorNames = computed(() => {
  let noLocalAuthorList: SiteAuthorRankDTO[] = []
  if (ArrayNotEmpty(props.siteAuthors)) {
    const localAuthors = ArrayNotEmpty(props.localAuthors) ? props.localAuthors : []
    noLocalAuthorList = props.siteAuthors.filter(
      (siteAuthor) => !localAuthors.some((localAuthor) => siteAuthor.localAuthorId === localAuthor.id)
    )
  }
  let nameList: string[] = []
  if (ArrayNotEmpty(props.localAuthors)) {
    nameList.push(...props.localAuthors.map((author) => author.localAuthorName).filter(NotNullish))
  }
  if (ArrayNotEmpty(noLocalAuthorList)) {
    nameList.push(...noLocalAuthorList.map((author) => author.siteAuthorName).filter(NotNullish))
  }
  if (ArrayNotEmpty(nameList)) {
    return nameList.join('、')
  } else {
    return ''
  }
})
</script>

<template>
  <el-text>{{ authorNames }}</el-text>
</template>

<style scoped></style>
