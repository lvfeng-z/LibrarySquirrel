<script setup lang="ts">
import WorksFullDTO from '@renderer/model/main/dto/WorksFullDTO.ts'
import WorksCase from './WorksCase.vue'
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
  <div class="works-area">
    <template v-for="works in props.worksList" :key="works.id">
      <div class="works-area-container">
        <works-case
          class="works-area-works-case"
          :works="works"
          :max-height="500"
          :max-width="500"
          author-info-popper-width="380px"
          @image-clicked="handleImageClicked"
        />
      </div>
    </template>
    <div class="works-area-dialog">
      <works-dialog v-if="worksDialogState" v-model="worksDialogState" :works="worksDialogResources" />
    </div>
  </div>
</template>

<style scoped>
.works-area {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}
.works-area-container {
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  margin: 5px 5px 0;
  padding: 4px;
  border-radius: 10px;
  background-color: rgb(166.2, 168.6, 173.4, 10%);
  transition-duration: 0.3s;
}
.works-area-container:hover {
  background-color: rgb(166.2, 168.6, 173.4, 30%);
  filter: drop-shadow(0 0 10px rgba(0, 0, 0, 0.2));
}
.works-area-works-case {
  height: 100%;
}
.works-area-dialog :deep(.el-overlay-dialog) {
  display: flex;
}
</style>
