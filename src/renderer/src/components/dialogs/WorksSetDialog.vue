<script setup lang="ts">
import WorksGrid from '@renderer/components/common/WorksGrid.vue'
import { Ref, ref, watch } from 'vue'
import { ArrayNotEmpty, IsNullish } from '@renderer/utils/CommonUtil.ts'
import ApiUtil from '@renderer/utils/ApiUtil.ts'
import WorksFullDTO from '@renderer/model/main/dto/WorksFullDTO.ts'
import WorksSetWithWorksDTO from '@renderer/model/main/dto/WorksSetWithWorksDTO.ts'
import AutoHeightDialog from '@renderer/components/dialogs/AutoHeightDialog.vue'

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
      worksList.value = worksSetList[0].worksList
    }
  }
}

// watch
watch(state, (newValue) => {
  if (newValue) {
    loadWorksList()
  }
})
</script>

<template>
  <auto-height-dialog v-model:state="state" :width="props.width">
    <works-grid :works-list="worksList" :current-works-index="currentWorksIndex" :works-set-disabled="true"> </works-grid>
  </auto-height-dialog>
</template>

<style scoped></style>
