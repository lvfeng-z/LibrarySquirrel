<script setup lang="ts">
import Works from '../../model/main/Works'
import DisplayCase from './DisplayCase.vue'

// props
const props = defineProps<{
  worksList: Works[]
}>()
</script>

<template>
  <el-scrollbar class="works-display-case">
    <template v-for="works in props.worksList" :key="works.id">
      <display-case :image-url="works.filePath as string"></display-case>
    </template>
  </el-scrollbar>
</template>

<style scoped>
.works-display-case {
  display: flex;
}
</style>
