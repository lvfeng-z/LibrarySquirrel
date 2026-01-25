<script setup lang="ts">
import { Ref, ref, watch } from 'vue'
import { ArrayNotEmpty, IsNullish } from '@renderer/utils/CommonUtil.ts'
import ApiUtil from '@renderer/utils/ApiUtil.ts'
import WorkFullDTO from '@renderer/model/main/dto/WorkFullDTO.ts'
import WorkSetWithWorkDTO from '@renderer/model/main/dto/WorkSetWithWorkDTO.ts'
import AutoHeightDialog from '@renderer/components/dialogs/AutoHeightDialog.vue'
import WorkGridForWorkSet from '@renderer/components/common/WorkGridForWorkSet.vue'
import WorkSet from '@renderer/model/main/entity/WorkSet.ts'

// props
const props = defineProps<{
  width?: string
}>()

// model
// 弹窗开关
const state = defineModel<boolean>('state', { required: true })
const currentWorkSetId = defineModel<number>('currentWorkSetId', { required: true })

// 变量
// 接口
const apis = {
  workSetListWorkSetWithWorkByIds: window.api.workSetListWorkSetWithWorkByIds
}
// 当前作品集
const currentWorkSet = ref<WorkSet | undefined>(undefined)
// 作品列表
const workList: Ref<WorkFullDTO[]> = ref([])
// 当前作品的索引
const currentWorkIndex = ref(0)

// 方法
async function loadWorkList() {
  if (IsNullish(currentWorkSetId.value)) {
    return
  }
  const response = await apis.workSetListWorkSetWithWorkByIds([currentWorkSetId.value])
  if (ApiUtil.check(response)) {
    const workSetList = ApiUtil.data<WorkSetWithWorkDTO[]>(response)
    if (ArrayNotEmpty(workSetList)) {
      currentWorkSet.value = workSetList[0].workSet
      workList.value = workSetList[0].workList.map((origin) => new WorkFullDTO(origin))
      currentWorkIndex.value = 0
    }
  }
}

// watch
watch(currentWorkSetId, () => loadWorkList())
</script>

<template>
  <auto-height-dialog v-model:state="state" :width="props.width">
    <template #header>
      {{ currentWorkSet?.nickName }}
    </template>
    <work-grid-for-work-set
      v-model:current-work-set-id="currentWorkSetId"
      v-model:current-work-index="currentWorkIndex"
      :work-list="workList"
    />
  </auto-height-dialog>
</template>

<style scoped></style>
