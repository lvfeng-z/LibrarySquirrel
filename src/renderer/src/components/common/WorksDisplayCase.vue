<script setup lang="ts">
import WorksInfo from './WorksInfo.vue'
import AuthorInfo from './AuthorInfo.vue'
import { computed, Ref, ref, UnwrapRef } from 'vue'
import WorksDTO from '../../model/main/dto/WorksDTO.ts'
import { arrayNotEmpty, notNullish } from '@renderer/utils/CommonUtil.ts'

// props
const props = defineProps<{
  works: WorksDTO
  maxHeight?: number
  maxWidth?: number
}>()

// 事件
const emit = defineEmits(['imageClicked'])

// 变量
// 接口
const apis = {
  appLauncherOpenImage: window.api.appLauncherOpenImage
}
const imageFit: Ref<UnwrapRef<'contain' | 'cover' | 'fill' | 'none' | 'scale-down'>> = ref('contain')
const caseWidth: Ref<UnwrapRef<string>> = computed(() => (props.maxWidth === undefined ? 'auto' : String(props.maxWidth) + 'px')) // 展示框宽度
const caseHeight: Ref<UnwrapRef<string>> = computed(() => (props.maxHeight === undefined ? 'auto' : String(props.maxHeight) + 'px')) // 展示框高度
// src的参数
const srcParamStr: Ref<UnwrapRef<string>> = computed(() => {
  const params: string[] = []
  if (notNullish(props.maxHeight)) {
    params.push(`visualHeight=${props.maxHeight}`)
  }
  if (notNullish(props.maxWidth)) {
    params.push(`visualWidth=${props.maxWidth}`)
  }
  return arrayNotEmpty(params) ? '?' + params.join('&') : ''
})
let clickTimeout: NodeJS.Timeout

// 方法
// 判断el-image使用什么模式
function handleElImageFit() {
  // console.log('imageHeight', event.target.naturalHeight)
  // console.log('imageWidth', event.target.naturalWidth)
  imageFit.value = 'contain'
}
// 处理图片被点击
function handleImageClicked() {
  clearTimeout(clickTimeout)
  clickTimeout = setTimeout(() => emit('imageClicked', props.works), 300)
}
// 处理图片双击事件
function handlePictureClicked() {
  clearTimeout(clickTimeout)
  apis.appLauncherOpenImage(props.works.filePath)
}
</script>
<template>
  <div class="works-display-case">
    <el-image
      :fit="imageFit"
      class="works-display-case-image"
      :src="`resource://workdir${props.works.filePath}${srcParamStr}`"
      @load="handleElImageFit"
      @click="handleImageClicked"
      @dblclick="handlePictureClicked"
    ></el-image>
    <works-info class="works-display-case-works-info" :works="works" />
    <author-info class="works-display-case-author-info" :authors="props.works.localAuthors" />
  </div>
</template>

<style scoped>
.works-display-case {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 5px;
  max-height: v-bind(caseHeight);
  max-width: v-bind(caseWidth);
}
.works-display-case-image {
  width: auto;
  cursor: pointer;
}
.works-display-case-works-info {
  width: 100%;
}
.works-display-case-author-info {
  width: 100%;
}
</style>
