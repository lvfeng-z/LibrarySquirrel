<script setup lang="ts">
import WorksFullDTO from '@renderer/model/main/dto/WorksFullDTO.ts'
import WorksDialog from '../dialogs/WorksDialog.vue'
import { computed, Ref, ref } from 'vue'
import WorksGrid from '@renderer/components/common/WorksGrid.vue'
import WorksCardItem from '@renderer/model/main/dto/WorksCardItem.ts'

// props
const props = defineProps<{
  worksList: WorksFullDTO[]
}>()

// model
const currentWorksIndex = defineModel<number>('currentWorksIndex', { required: true })
// 当前作品集id
const currentWorksSetId = defineModel<number>('currentWorksSetId', { required: true })

// 变量
// worksDialog开关
const worksDialogState: Ref<boolean> = ref(false)
// 用于作品网格组件的WorksCardItem数组
const worksCardItemList: Ref<WorksCardItem[]> = computed(() => props.worksList.map((works) => new WorksCardItem(works)))

// 方法
function handleImageClicked(works: WorksCardItem) {
  currentWorksIndex.value = worksCardItemList.value.indexOf(works)
  worksDialogState.value = true
}
// 打开作品集dialog
async function openWorksSetDialog(worksSetId: number) {
  currentWorksSetId.value = worksSetId
  worksDialogState.value = false
}
</script>

<template>
  <div>
    <works-grid :works-list="worksCardItemList" @image-clicked="handleImageClicked" />
    <works-dialog
      v-model:state="worksDialogState"
      v-model:current-works-index="currentWorksIndex"
      :works="props.worksList"
      width="90%"
      @open-works-set="openWorksSetDialog"
    />
  </div>
</template>

<style scoped></style>
