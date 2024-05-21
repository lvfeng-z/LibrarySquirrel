<script setup lang="ts">
import WorksInfo from './WorksInfo.vue'
import AuthorInfo from './AuthorInfo.vue'

// props
const props = defineProps<{
  imageUrl: string
}>()
</script>
<template>
  <div class="display-case">
    <el-image
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
