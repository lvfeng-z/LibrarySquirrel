<script setup lang="ts">
import WorkFullDTO from '@renderer/model/main/dto/WorkFullDTO.ts'
import WorkDialog from '../dialogs/WorkDialog.vue'
import { computed, Ref, ref } from 'vue'
import WorkGrid from '@renderer/components/common/WorkGrid.vue'
import WorkCardItem from '@renderer/model/main/dto/WorkCardItem.ts'

// props
const props = defineProps<{
  workList: WorkFullDTO[]
}>()

// model
const currentWorkIndex = defineModel<number>('currentWorkIndex', { required: true })
// 当前作品集id
const currentWorkSetId = defineModel<number>('currentWorkSetId', { required: true })

// 变量
// workDialog开关
const workDialogState: Ref<boolean> = ref(false)
// 用于作品网格组件的WorkCardItem数组
const workCardItemList: Ref<WorkCardItem[]> = computed(() => props.workList.map((work) => new WorkCardItem(work)))

// 方法
function handleImageClicked(workCardItem: WorkCardItem) {
  currentWorkIndex.value = workCardItemList.value.indexOf(workCardItem)
  workDialogState.value = true
}
// 打开作品集dialog
async function openWorkSetDialog(workSetId: number) {
  currentWorkSetId.value = workSetId
  workDialogState.value = false
}
</script>

<template>
  <div>
    <work-grid :work-list="workCardItemList" @image-clicked="handleImageClicked" />
    <work-dialog
      v-model:state="workDialogState"
      v-model:current-work-index="currentWorkIndex"
      :work="props.workList"
      width="90%"
      @open-work-set="openWorkSetDialog"
    />
  </div>
</template>

<style scoped></style>
