<script setup lang="ts">
import WorksInfo from './WorksInfo.vue'
import AuthorInfo from './AuthorInfo.vue'
import { computed, Ref, ref, UnwrapRef } from 'vue'
import { ArrayNotEmpty, NotNullish } from '@renderer/utils/CommonUtil.ts'
import { ElMessage } from 'element-plus'
import { Picture } from '@element-plus/icons-vue'
import WorksCardItem from '@renderer/model/main/dto/WorksCardItem.ts'

// props
const props = defineProps<{
  works: WorksCardItem
  maxHeight?: number
  maxWidth?: number
  worksInfoPopperWidth?: string
  authorInfoPopperWidth?: string
}>()

// 事件
const emit = defineEmits(['imageClicked'])

// 变量
// 接口
const apis = {
  appLauncherOpenImage: window.api.appLauncherOpenImage
}
const imageFit: Ref<UnwrapRef<'contain' | 'cover' | 'fill' | 'none' | 'scale-down'>> = ref('contain')
// const caseWidth: Ref<UnwrapRef<string>> = computed(() => (props.maxWidth === undefined ? 'auto' : String(props.maxWidth) + 'px')) // 展示框宽度
const caseHeight: Ref<UnwrapRef<string>> = computed(() => (props.maxHeight === undefined ? 'auto' : String(props.maxHeight) + 'px')) // 展示框高度
// src的参数
const srcParamStr: Ref<UnwrapRef<string>> = computed(() => {
  const params: string[] = []
  if (NotNullish(props.maxHeight)) {
    params.push(`visualHeight=${props.maxHeight}`)
  }
  if (NotNullish(props.maxWidth)) {
    params.push(`visualWidth=${props.maxWidth}`)
  }
  return ArrayNotEmpty(params) ? '?' + params.join('&') : ''
})
let clickTimeout

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
  if (NotNullish(props.works.resource?.filePath)) {
    apis.appLauncherOpenImage(props.works.resource.filePath)
  } else {
    ElMessage({
      type: 'error',
      message: '无法打开图片，获取资源路径失败'
    })
  }
}
</script>
<template>
  <div class="works-case">
    <el-image
      :fit="imageFit"
      class="works-case-image"
      :src="`resource://workdir${props.works.resource?.filePath}${srcParamStr}`"
      @load="handleElImageFit"
      @click="handleImageClicked"
      @dblclick="handlePictureClicked"
    >
      <template #error>
        <div class="works-case-error">
          <el-icon class="works-case-error-icon"><Picture /></el-icon>
        </div>
      </template>
    </el-image>
    <works-info class="works-case-info" :works="works" :width="worksInfoPopperWidth" />
    <author-info
      class="works-case-info"
      :local-authors="props.works.localAuthors"
      :site-authors="props.works.siteAuthors"
      :width="authorInfoPopperWidth"
    />
  </div>
</template>

<style scoped>
.works-case {
  display: flex;
  flex-direction: column;
}
.works-case-image {
  width: auto;
  margin-top: auto;
  margin-bottom: auto;
  cursor: pointer;
  max-height: calc(v-bind(caseHeight) - 100px);
  border-radius: 10px;
}
.works-case-error {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 200px;
  width: 100%;
}
.works-case-error-icon {
  color: var(--el-text-color-secondary);
  scale: 2;
}
.works-case-info {
  width: calc(100% - 10px);
  display: flex;
  overflow: hidden;
  text-overflow: ellipsis;
  word-wrap: break-word;
  white-space: nowrap;
  border-radius: 5px;
  margin-left: 3px;
  margin-right: 3px;
  margin-top: 3px;
  padding-left: 4px;
  transition: background-color 0.3s;
}
.works-case-info:hover {
  background-color: var(--el-fill-color);
}
</style>
