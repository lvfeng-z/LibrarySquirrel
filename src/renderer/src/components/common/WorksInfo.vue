<script setup lang="ts">
import WorksFullInfoDTO from '@renderer/model/main/dto/WorksFullInfoDTO.ts'
import StringUtil from '../../utils/StringUtil'

// props
const props = defineProps<{
  works: WorksFullInfoDTO
}>()

// 方法
// 获取要展示的作品名称
function getWorksNameForDisplay(): string {
  if (StringUtil.isNotBlank(props.works.nickName)) {
    return props.works.nickName as string
  }
  if (StringUtil.isNotBlank(props.works.siteWorksName)) {
    return props.works.siteWorksName as string
  }
  return '?'
}
</script>

<template>
  <el-text>{{ getWorksNameForDisplay() }}</el-text>
</template>

<style scoped></style>
