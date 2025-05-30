<script setup lang="ts">
import { computed, Ref, ref } from 'vue'
import { ArrayNotEmpty, NotNullish } from '@renderer/utils/CommonUtil.ts'
import LocalAuthorRankDTO from '@renderer/model/main/dto/LocalAuthorRankDTO.ts'
import SiteAuthorRankDTO from '@renderer/model/main/dto/SiteAuthorRankDTO.ts'
import RankAuthor from '@renderer/model/main/interface/RankAuthor.ts'

// props
const props = withDefaults(
  defineProps<{
    localAuthors: LocalAuthorRankDTO[] | undefined | null
    siteAuthors: SiteAuthorRankDTO[] | undefined | null
    popoverTrigger?: 'click' | 'hover' | 'focus' | 'contextmenu'
    useHandCursor?: boolean
    width?: string
  }>(),
  {
    popoverTrigger: 'click',
    useHandCursor: true,
    width: 'auto'
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
// 作者名称列表
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
    nameList.push(...props.localAuthors.map((author) => author.authorName).filter(NotNullish))
  }
  if (ArrayNotEmpty(noLocalAuthorList)) {
    nameList.push(...noLocalAuthorList.map((author) => author.authorName).filter(NotNullish))
  }
  return nameList
})
// 当前查看的作者
const currentAuthor: Ref<RankAuthor | undefined> = computed(() => {
  return authors.value.find((tempAuthor) => tempAuthor.authorName === currentAuthorName.value)
})
// 当前选中的作者名称
const currentAuthorName: Ref<string> = ref(authorNames.value[0])
// cursor参数
const cursorParam: Ref<string> = ref(props.useHandCursor ? 'pointer' : 'default')
</script>

<template>
  <div class="author-info-container">
    <el-popover :trigger="popoverTrigger" :width="width">
      <template #reference>
        <el-text class="author-info-text">{{ authorNames.join('、') }}</el-text>
      </template>
      <template #default>
        <el-segmented v-model="currentAuthorName" :options="authorNames" />
        <el-descriptions>
          <el-descriptions-item>
            {{ currentAuthor?.introduce }}
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
