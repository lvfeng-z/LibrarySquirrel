<script setup lang="ts">
import WorksInfo from './WorksInfo.vue'
import AuthorInfo from './AuthorInfo.vue'
import { onBeforeMount, Ref, ref, UnwrapRef } from 'vue'

// props
const props = defineProps<{
  imageUrl: string
  height?: number
  width?: number
}>()

// onBeforeMount
onBeforeMount(() => {
  handleElImageFit()
})

// 变量
const imageFit: Ref<UnwrapRef<'contain' | 'cover' | 'fill' | 'none' | 'scale-down'>> = ref('none')
const imageWidth: Ref<UnwrapRef<string>> = ref(
  props.width === undefined ? 'auto' : String(props.width) + 'px'
)
const imageHeight: Ref<UnwrapRef<string>> = ref(
  props.width === undefined ? 'auto' : String(props.height) + 'px'
)

// 方法
// 判断el-image使用什么模式
function handleElImageFit() {
  imageFit.value = 'none'
}
</script>
<template>
  <div class="display-case">
    <el-image
      :fit="imageFit"
      class="display-case-image-box"
      :src="`workdir-resource://workdir/${props.imageUrl}`"
    ></el-image>
    <works-info class="display-case-works-info"></works-info>
    <author-info class="display-case-author-info"></author-info>
  </div>
</template>

<style scoped>
.display-case {
  display: flex;
  flex-direction: column;
  width: v-bind(imageWidth);
  height: v-bind(imageHeight);
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
