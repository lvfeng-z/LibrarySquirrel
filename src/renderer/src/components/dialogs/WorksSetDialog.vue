<script setup lang="ts">
import { Ref, ref, watch } from 'vue'
import { ArrayNotEmpty, IsNullish } from '@renderer/utils/CommonUtil.ts'
import ApiUtil from '@renderer/utils/ApiUtil.ts'
import WorksFullDTO from '@renderer/model/main/dto/WorksFullDTO.ts'
import WorksSetWithWorksDTO from '@renderer/model/main/dto/WorksSetWithWorksDTO.ts'
import AutoHeightDialog from '@renderer/components/dialogs/AutoHeightDialog.vue'
import WorksGridForWorksSet from '@renderer/components/common/WorksGridForWorksSet.vue'
import WorksSet from '@renderer/model/main/entity/WorksSet.ts'

// props
const props = defineProps<{
  width?: string
}>()

// model
// 弹窗开关
const state = defineModel<boolean>('state', { required: true })
const currentWorksSetId = defineModel<number>('currentWorksSetId', { required: true })

// 变量
// 接口
const apis = {
  worksSetListWorksSetWithWorksByIds: window.api.worksSetListWorksSetWithWorksByIds
}
// 当前作品集
const currentWorksSet = ref<WorksSet | undefined>(undefined)
// 作品列表
const worksList: Ref<WorksFullDTO[]> = ref([])
// 当前作品的索引
const currentWorksIndex = ref(0)

// 方法
async function loadWorksList() {
  if (IsNullish(currentWorksSetId.value)) {
    return
  }
  const response = await apis.worksSetListWorksSetWithWorksByIds([currentWorksSetId.value])
  if (ApiUtil.check(response)) {
    const worksSetList = ApiUtil.data<WorksSetWithWorksDTO[]>(response)
    if (ArrayNotEmpty(worksSetList)) {
      currentWorksSet.value = worksSetList[0].worksSet
      worksList.value = worksSetList[0].worksList
      currentWorksIndex.value = 0
    }
  }
}

// watch
watch(currentWorksSetId, () => loadWorksList())
</script>

<template>
  <auto-height-dialog v-model:state="state" :width="props.width">
    <template #header>
      {{ currentWorksSet?.nickName }}
    </template>
    <works-grid-for-works-set
      v-model:current-works-set-id="currentWorksSetId"
      v-model:current-works-index="currentWorksIndex"
      :works-list="worksList"
    />
  </auto-height-dialog>
</template>

<style scoped></style>
