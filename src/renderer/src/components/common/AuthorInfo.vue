<script setup lang="ts">
import { computed, Ref, ref } from 'vue'
import { ArrayNotEmpty, NotNullish } from '@renderer/utils/CommonUtil.ts'
import LocalAuthorRankDTO from '@renderer/model/main/dto/LocalAuthorRankDTO.ts'
import SiteAuthorRankDTO from '@renderer/model/main/dto/SiteAuthorRankDTO.ts'

// props
const props = withDefaults(
  defineProps<{
    localAuthors: LocalAuthorRankDTO[] | undefined | null
    siteAuthors: SiteAuthorRankDTO[] | undefined | null
    popoverTrigger?: 'click' | 'hover' | 'focus' | 'contextmenu'
    useHandCursor?: boolean
  }>(),
  {
    popoverTrigger: 'click',
    useHandCursor: true
  }
)

// 变量
// 作者
const authors = computed(() => {
  let noLocalAuthorList: SiteAuthorRankDTO[] = []
  if (ArrayNotEmpty(props.siteAuthors)) {
    const localAuthors = ArrayNotEmpty(props.localAuthors) ? props.localAuthors : []
    noLocalAuthorList = props.siteAuthors.filter(
      (siteAuthor) => !localAuthors.some((localAuthor) => siteAuthor.localAuthorId === localAuthor.id)
    )
  }
  let authorList: (LocalAuthorRankDTO | SiteAuthorRankDTO)[] = []
  if (ArrayNotEmpty(props.localAuthors)) {
    authorList.push(...props.localAuthors)
  }
  if (ArrayNotEmpty(noLocalAuthorList)) {
    authorList.push(...noLocalAuthorList)
  }
  return authorList
})
// 作者名称
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
// cursor参数
const cursorParam: Ref<string> = ref(props.useHandCursor ? 'pointer' : 'default')
</script>

<template>
  <div class="author-info-container">
    <el-popover :trigger="popoverTrigger" :title="authorNames">
      <template #reference>
        <el-text class="author-info-text">{{ authorNames }}</el-text>
      </template>
      <template #default>
        <el-descriptions>
          <el-descriptions-item>
            {{ authors }}
          </el-descriptions-item>
        </el-descriptions>
      </template>
    </el-popover>
  </div>
</template>

<style scoped>
.author-info-container {
  cursor: v-bind(cursorParam);
}
.author-info-text {
  width: 100%;
}
</style>
