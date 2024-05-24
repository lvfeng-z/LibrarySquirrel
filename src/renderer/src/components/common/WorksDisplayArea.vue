<script setup lang="ts">
import WorksDTO from '../../model/main/dto/WorksDTO'
import WorksDisplayCase from './WorksDisplayCase.vue'

// props
const props = defineProps<{
  worksList: WorksDTO[]
}>()
</script>

<template>
  <el-scrollbar>
    <el-row class="works-display-area">
      <template v-for="works in props.worksList" :key="works.id">
        <works-display-case
          class="works-display-area-works-display-case"
          :width="250"
          :height="300"
          :works="works"
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
