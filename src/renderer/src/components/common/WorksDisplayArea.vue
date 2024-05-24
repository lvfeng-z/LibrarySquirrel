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
    <el-row class="works-display-case">
      <template v-for="works in props.worksList" :key="works.id">
        <works-display-case
          class="works-display-case-display-case"
          :width="300"
          :image-url="works.filePath as string"
        ></works-display-case>
      </template>
    </el-row>
  </el-scrollbar>
</template>

<style scoped>
.works-display-case {
  display: flex;
  flex-direction: row;
}
.works-display-case-display-case {
  height: 300px;
}
</style>
