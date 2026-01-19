<script setup lang="ts">
import StringUtil from '../../utils/StringUtil'
import { ref, Ref } from 'vue'
import WorksCardItem from '@renderer/model/main/dto/WorksCardItem.ts'

// props
const props = withDefaults(
  defineProps<{
    works: WorksCardItem
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

// 方法
// 获取要展示的作品名称
function getWorksNameForDisplay(): string {
  if (StringUtil.isNotBlank(props.works.nickName)) {
    return props.works.nickName as string
  }
  if (StringUtil.isNotBlank(props.works.siteItemName)) {
    return props.works.siteItemName as string
  }
  return '?'
}
// cursor参数
const cursorParam: Ref<string> = ref(props.useHandCursor ? 'pointer' : 'default')
</script>

<template>
  <div class="author-info-container">
    <el-popover :trigger="popoverTrigger" :width="width" popper-class="author-info-popper">
      <template #reference>
        <el-text class="works-info-text">{{ getWorksNameForDisplay() }}</el-text>
      </template>
      <template #default>
        <div class="works-info-description">
          {{ props.works.description }}
        </div>
      </template>
    </el-popover>
  </div>
</template>

<style scoped>
.author-info-container {
  cursor: v-bind(cursorParam);
}
.works-info-text {
  width: 100%;
}
.works-info-description {
  max-height: 300px;
  overflow-y: scroll;
  text-overflow: ellipsis;
}
</style>
