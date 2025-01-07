<script setup lang="ts">
import WorksDTO from '../../model/main/dto/WorksDTO'
import WorksDisplayCase from './WorksDisplayCase.vue'
import WorksDialog from '../dialogs/WorksDialog.vue'
import { Ref, ref, UnwrapRef } from 'vue'

// props
const props = defineProps<{
  worksList: WorksDTO[]
}>()

// 变量
// 最外部容器的实例
const container = ref()
// worksDialog开关
const worksDialogState: Ref<UnwrapRef<boolean>> = ref(false)
// worksDialog的内容
const worksDialogResources: Ref<WorksDTO[]> = ref([])

// 方法
function handleImageClicked(works: WorksDTO) {
  worksDialogState.value = true
  worksDialogResources.value[0] = works
}
</script>

<template>
  <div ref="container" class="works-display-area">
    <template v-for="works in props.worksList" :key="works.id">
      <works-display-case
        class="works-display-area-works-display-case"
        :works="works"
        :max-height="500"
        @image-clicked="handleImageClicked"
      ></works-display-case>
    </template>
    <works-dialog v-if="worksDialogState" v-model="worksDialogState" width="90%" :works="worksDialogResources" />
  </div>
</template>

<style scoped>
.works-display-area {
  display: flex;
  flex-wrap: wrap;
  flex-direction: row;
  justify-content: center;
}
.works-display-area-works-display-case {
  flex: 1 0 20%;
  box-sizing: border-box;
}
</style>
