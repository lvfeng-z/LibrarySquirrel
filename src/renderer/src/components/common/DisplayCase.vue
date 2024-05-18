<script setup lang="ts">

import ImageBox from './ImageBox.vue'
import WorksInfo from './worksInfo.vue'
import AuthorInfo from './authorInfo.vue'
</script>

<template>
  <div class="display-case">
    <image-box class="display-case-image-box"></image-box>
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
