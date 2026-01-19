<script setup lang="ts">
import WorksCard from './WorksCard.vue'
import WorksCardItem from '@renderer/model/main/dto/WorksCardItem.ts'

// props
const props = defineProps<{
  worksList: WorksCardItem[]
}>()

// 事件
const emits = defineEmits(['imageClicked'])

// 方法
function handleImageClicked(worksCardItem: WorksCardItem) {
  emits('imageClicked', worksCardItem)
}
</script>

<template>
  <div class="works-grid">
    <template v-for="works in props.worksList" :key="works.id ? works.id : Math.random()">
      <div class="works-grid-container">
        <works-card
          class="works-grid-works-case"
          :works="works"
          :max-height="500"
          :max-width="500"
          works-info-popper-width="380px"
          author-info-popper-width="380px"
          @image-clicked="handleImageClicked(works)"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.works-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}
.works-grid-container {
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  margin: 5px 0 0 0;
  padding: 4px;
  border-radius: 10px;
  background-color: rgb(166.2, 168.6, 173.4, 10%);
  transition-duration: 0.3s;
}
.works-grid-container:hover {
  background-color: rgb(166.2, 168.6, 173.4, 30%);
  filter: drop-shadow(0 0 10px rgba(0, 0, 0, 0.2));
}
.works-grid-works-case {
  height: 100%;
}
</style>
