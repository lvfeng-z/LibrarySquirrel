<script setup lang="ts">
import WorksFullInfoDTO from '@renderer/model/main/dto/WorksFullInfoDTO.ts'
import WorksDisplayCase from './WorksDisplayCase.vue'
import WorksDialog from '../dialogs/WorksDialog.vue'
import { Ref, ref, UnwrapRef } from 'vue'

// props
const props = defineProps<{
  worksList: WorksFullInfoDTO[]
}>()

// 变量
// 最外部容器的实例
const container = ref()
// worksDialog开关
const worksDialogState: Ref<UnwrapRef<boolean>> = ref(false)
// worksDialog的内容
const worksDialogResources: Ref<WorksFullInfoDTO[]> = ref([])

// 方法
function handleImageClicked(works: WorksFullInfoDTO) {
  worksDialogState.value = true
  worksDialogResources.value[0] = works
}
</script>

<template>
  <div ref="container" class="works-display-area">
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
  display: flex;
  flex-wrap: wrap;
  flex-direction: row;
  align-items: start;
}
.works-display-area-container {
  flex: 1 0 calc(20% - 30px);
  width: 100%;
  align-content: center;
  box-sizing: border-box;
  overflow: hidden;
  text-overflow: ellipsis;
  word-wrap: break-word;
  white-space: nowrap;
  margin: 3px;
  padding: 3px;
  border-radius: 10px;
  background-color: rgb(166.2, 168.6, 173.4, 20%);
  transition-duration: 0.4s;
}
.works-display-area-container:hover {
  background-color: rgb(166.2, 168.6, 173.4, 40%);
  transform: scale(1.02);
}
</style>
