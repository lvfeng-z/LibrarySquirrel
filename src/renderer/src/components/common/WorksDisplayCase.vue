<script setup lang="ts">
import WorksInfo from './WorksInfo.vue'
import AuthorInfo from './AuthorInfo.vue'
import { Ref, ref, UnwrapRef } from 'vue'
import WorksDTO from '../../model/main/dto/WorksDTO.ts'

// props
const props = defineProps<{
  works: WorksDTO
  height?: number
  width?: number
}>()

// 事件
const emit = defineEmits(['imageClicked'])

// 变量
const imageFit: Ref<UnwrapRef<'contain' | 'cover' | 'fill' | 'none' | 'scale-down'>> =
  ref('contain')
const caseWidth: Ref<UnwrapRef<string>> = ref(
  props.width === undefined ? 'auto' : String(props.width) + 'px'
) // 展示框宽度
const caseHeight: Ref<UnwrapRef<string>> = ref(
  props.width === undefined ? 'auto' : String(props.height) + 'px'
) // 展示框高度

// 方法
// 判断el-image使用什么模式
function handleElImageFit(event) {
  console.log('imageHeight', event.target.naturalHeight)
  console.log('imageWidth', event.target.naturalWidth)
  imageFit.value = 'contain'
}
// 处理图片被点击
function handleImageClicked() {
  emit('imageClicked', props.works)
}
</script>
<template>
  <div class="works-display-case">
    <el-image
      :fit="imageFit"
      class="works-display-case-image"
      :src="`workdir-resource://workdir/${props.works.filePath}`"
      @load="handleElImageFit"
      @click="handleImageClicked"
    ></el-image>
    <works-info class="works-display-case-works-info" :works="works"></works-info>
    <author-info
      class="works-display-case-author-info"
      :authors="props.works.localAuthors"
    ></author-info>
  </div>
</template>

<style scoped>
.works-display-case {
  display: flex;
  flex-direction: column;
  width: v-bind(caseWidth);
  height: v-bind(caseHeight);
}
.works-display-case-image {
  width: 100%;
}
.works-display-case-works-info {
  width: 100%;
}
.works-display-case-author-info {
  width: 100%;
}
</style>
