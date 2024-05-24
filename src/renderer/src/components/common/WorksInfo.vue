<script setup lang="ts">
import WorksDTO from '../../model/main/dto/WorksDTO'
import StringUtil from '../../utils/StringUtil'

// props
const props = defineProps<{
  works: WorksDTO
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

<style scoped>

</style>
