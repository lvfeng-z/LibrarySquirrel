<script setup lang="ts">
import WorkCard from './WorkCard.vue'
import WorkCardItem from '@renderer/model/main/dto/WorkCardItem.ts'

// props
const props = defineProps<{
  workList: WorkCardItem[]
}>()

// 事件
const emits = defineEmits(['imageClicked'])

// 方法
function handleImageClicked(workCardItem: WorkCardItem) {
  emits('imageClicked', workCardItem)
}
</script>

<template>
  <div class="work-grid">
    <template v-for="work in props.workList" :key="work.id ? work.id : Math.random()">
      <div class="work-grid-container">
        <work-card
          class="work-grid-work-card"
          :work="work"
          :max-height="500"
          :max-width="500"
          work-info-popper-width="380px"
          author-info-popper-width="380px"
          @image-clicked="handleImageClicked(work)"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.work-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}
.work-grid-container {
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  margin: 5px 0 0 0;
  padding: 4px;
  border-radius: 10px;
  background-color: rgb(166.2, 168.6, 173.4, 10%);
  transition-duration: 0.3s;
}
.work-grid-container:hover {
  background-color: rgb(166.2, 168.6, 173.4, 30%);
  filter: drop-shadow(0 0 10px rgba(0, 0, 0, 0.2));
}
.work-grid-work-card {
  height: 100%;
}
</style>
