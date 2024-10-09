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
  <el-scrollbar>
    <el-row class="works-display-area">
      <template v-for="works in props.worksList" :key="works.id">
        <works-display-case
          class="works-display-area-works-display-case"
          :width="235"
          :height="300"
          :works="works"
          @image-clicked="handleImageClicked"
        ></works-display-case>
      </template>
    </el-row>
    <works-dialog
      v-if="worksDialogState"
      v-model="worksDialogState"
      width="90%"
      :works="worksDialogResources"
    />
  </el-scrollbar>
</template>

<style scoped>
.works-display-area {
  display: flex;
  flex-direction: row;
}
</style>
