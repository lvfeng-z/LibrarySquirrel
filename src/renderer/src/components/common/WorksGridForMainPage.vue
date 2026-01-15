<script setup lang="ts">
import WorksFullDTO from '@renderer/model/main/dto/WorksFullDTO.ts'
import WorksDialog from '../dialogs/WorksDialog.vue'
import { Ref, ref } from 'vue'
import WorksSetDialog from '@renderer/components/dialogs/WorksSetDialog.vue'
import WorksGrid from '@renderer/components/common/WorksGrid.vue'

// props
const props = defineProps<{
  worksList: WorksFullDTO[]
}>()

// model
const currentWorksIndex = defineModel<number>('currentWorksIndex', { required: true })

// 变量
// worksDialog开关
const worksDialogState: Ref<boolean> = ref(false)
// worksSetDialogState开关
const worksSetDialogState: Ref<boolean> = ref(false)
// 当前作品集id
const currentWorksSetId: Ref<number> = ref(-1)

// 方法
function handleImageClicked(works: WorksFullDTO) {
  currentWorksIndex.value = props.worksList.indexOf(works)
  worksDialogState.value = true
}
// 打开作品集dialog
async function openWorksSetDialog(worksSetId: number) {
  currentWorksSetId.value = worksSetId
  worksDialogState.value = false
  worksSetDialogState.value = true
}
</script>

<template>
  <div>
    <works-grid :works-list="props.worksList" @image-clicked="handleImageClicked"></works-grid>
    <works-dialog
      v-model:state="worksDialogState"
      v-model:current-works-index="currentWorksIndex"
      :works="props.worksList"
      width="90%"
      @open-works-set="openWorksSetDialog"
    />
    <works-set-dialog v-model:state="worksSetDialogState" v-model:current-works-set-id="currentWorksSetId" width="90%" />
  </div>
</template>

<style scoped></style>
