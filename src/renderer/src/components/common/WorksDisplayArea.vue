<script setup lang="ts">
import WorksFullDTO from '@renderer/model/main/dto/WorksFullDTO.ts'
import WorksDisplayCase from './WorksDisplayCase.vue'
import WorksDialog from '../dialogs/WorksDialog.vue'
import { Ref, ref, UnwrapRef } from 'vue'

// props
const props = defineProps<{
  worksList: WorksFullDTO[]
}>()

// 变量
// worksDialog开关
const worksDialogState: Ref<UnwrapRef<boolean>> = ref(false)
// worksDialog的内容
const worksDialogResources: Ref<WorksFullDTO[]> = ref([])

// 方法
function handleImageClicked(works: WorksFullDTO) {
  worksDialogState.value = true
  worksDialogResources.value[0] = works
}
</script>

<template>
  <div class="works-display-area">
    <template v-for="works in props.worksList" :key="works.id">
      <div class="works-display-area-container">
        <works-display-case
          class="works-display-area-works-display-case"
          :works="works"
          :max-height="500"
          :max-width="500"
          @image-clicked="handleImageClicked"
        />
      </div>
    </template>
    <works-dialog v-if="worksDialogState" v-model="worksDialogState" width="90%" :works="worksDialogResources" />
  </div>
</template>

<style scoped>
.works-display-area {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}
.works-display-area-container {
  flex: 1 0 calc(20% - 30px);
  width: 100%;
  align-content: center;
  box-sizing: border-box;
  overflow: hidden;
  margin: 5px 5px 0;
  padding: 2px;
  border-radius: 10px;
  background-color: rgb(166.2, 168.6, 173.4, 20%);
  transition-duration: 0.3s;
}
.works-display-area-container:hover {
  background-color: rgb(166.2, 168.6, 173.4, 50%);
  transform: scale(1.03);
}
</style>
