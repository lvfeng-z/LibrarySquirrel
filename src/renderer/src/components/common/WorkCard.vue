<script setup lang="ts">
import WorkInfo from './WorkInfo.vue'
import AuthorInfo from './AuthorInfo.vue'
import { computed, Ref, ref, UnwrapRef } from 'vue'
import { ArrayNotEmpty, NotNullish } from '@renderer/utils/CommonUtil.ts'
import { ElMessage } from 'element-plus'
import { Picture } from '@element-plus/icons-vue'
import WorkCardItem from '@renderer/model/main/dto/WorkCardItem.ts'

// props
const props = defineProps<{
  work: WorkCardItem
  maxHeight?: number
  maxWidth?: number
  workInfoPopperWidth?: string
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
  clickTimeout = setTimeout(() => emit('imageClicked', props.work), 300)
}
// 处理图片双击事件
function handlePictureClicked() {
  clearTimeout(clickTimeout)
  if (NotNullish(props.work.resource?.filePath)) {
    apis.appLauncherOpenImage(props.work.resource.filePath)
  } else {
    ElMessage({
      type: 'error',
      message: '无法打开图片，获取资源路径失败'
    })
  }
}
</script>
<template>
  <div class="work-card">
    <el-image
      :fit="imageFit"
      class="work-card-image"
      :src="`resource://workdir${props.work.resource?.filePath}${srcParamStr}`"
      @load="handleElImageFit"
      @click="handleImageClicked"
      @dblclick="handlePictureClicked"
    >
      <template #error>
        <div class="work-card-error">
          <el-icon class="work-card-error-icon"><Picture /></el-icon>
        </div>
      </template>
    </el-image>
    <work-info class="work-card-info" :work="work" :width="workInfoPopperWidth" />
    <author-info
      class="work-card-info"
      :local-authors="props.work.localAuthors"
      :site-authors="props.work.siteAuthors"
      :width="authorInfoPopperWidth"
    />
  </div>
</template>

<style scoped>
.work-card {
  display: flex;
  flex-direction: column;
}
.work-card-image {
  width: auto;
  margin-top: auto;
  margin-bottom: auto;
  cursor: pointer;
  max-height: calc(v-bind(caseHeight) - 100px);
  border-radius: 10px;
}
.work-card-error {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 200px;
  width: 100%;
}
.work-card-error-icon {
  color: var(--el-text-color-secondary);
  scale: 2;
}
.work-card-info {
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
.work-card-info:hover {
  background-color: var(--el-fill-color);
}
</style>
