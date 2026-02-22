<script setup lang="ts">
import WorkDialog from '../dialogs/WorkDialog.vue'
import { computed, Ref, ref } from 'vue'
import WorkGrid from '@renderer/components/common/WorkGrid.vue'
import WorkFullDTO from '../../../../shared/model/dto/WorkFullDTO.ts'
import WorkCardItem from '../../../../shared/model/dto/WorkCardItem.ts'

// props
const props = defineProps<{
  workList: WorkFullDTO[]
  checkable?: boolean
  checkedWorkIds?: number[] // 选中的作品id列表
}>()

// 事件
const emits = defineEmits(['checkedChange'])

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

// 处理选中状态变化
function handleCheckedChange(checkedIds: number[]) {
  emits('checkedChange', checkedIds)
}
</script>

<template>
  <div>
    <work-grid
      :work-list="workCardItemList"
      :checkable="props.checkable ?? false"
      :checked-work-ids="props.checkedWorkIds"
      @image-clicked="handleImageClicked"
      @checked-change="handleCheckedChange"
    />
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
