<script setup lang="ts">
import Works from '../../model/main/Works'
import WorksDisplayCase from './WorksDisplayCase.vue'

// props
const props = defineProps<{
  worksList: Works[]
}>()
</script>

<template>
  <el-scrollbar>
    <el-row class="works-display-area">
      <template v-for="works in props.worksList" :key="works.id">
        <works-display-case
          class="works-display-area-works-display-case"
          :width="300"
          :height="300"
          :image-url="works.filePath as string"
        ></works-display-case>
      </template>
    </el-row>
  </el-scrollbar>
</template>

<style scoped>
.works-display-area {
  display: flex;
  flex-direction: row;
}
</style>
