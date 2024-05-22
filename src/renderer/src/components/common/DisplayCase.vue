<script setup lang="ts">
import WorksInfo from './WorksInfo.vue'
import AuthorInfo from './AuthorInfo.vue'
import { Ref, ref, UnwrapRef } from 'vue'

// props
const props = defineProps<{
  imageUrl: string
  height?: number
  width?: number
}>()

// 变量
const imageFit: Ref<UnwrapRef<'contain' | 'cover' | 'fill' | 'none' | 'scale-down'>> = ref('none')
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
  imageFit.value = 'none'
}
</script>
<template>
  <div class="display-case">
    <el-image
      :fit="imageFit"
      class="display-case-image-box"
      :src="`workdir-resource://workdir/${props.imageUrl}`"
      @load="handleElImageFit"
    ></el-image>
    <works-info class="display-case-works-info"></works-info>
    <author-info class="display-case-author-info"></author-info>
  </div>
</template>

<style scoped>
.display-case {
  display: flex;
  flex-direction: column;
  width: v-bind(caseWidth);
  height: v-bind(caseHeight);
}
.display-case-image-box {
  width: 100%;
}
.display-case-works-info {
  width: 100%;
}
.display-case-author-info {
  width: 100%;
}
</style>
