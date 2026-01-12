<script setup lang="ts">
import WorksGrid from '@renderer/components/common/WorksGrid.vue'
import { onMounted, Ref, ref } from 'vue'
import { IsNullish, NotNullish } from '@renderer/utils/CommonUtil.ts'
import ApiUtil from '@renderer/utils/ApiUtil.ts'
import WorksFullDTO from '@renderer/model/main/dto/WorksFullDTO.ts'
import WorksSetWithWorksDTO from '@renderer/model/main/dto/WorksSetWithWorksDTO.ts'

// model
const currentWorksSetId = defineModel<number>('currentWorksSetId', { required: true })

// onMounted
onMounted(() => {
  loadWorksList()
})

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
    if (NotNullish(worksSetList)) {
      worksList.value = worksSetList[0].worksList
    }
  }
}
</script>

<template>
  <el-dialog destroy-on-close center style="margin: auto; width: 90%">
    <el-scrollbar>
      <works-grid :works-list="worksList" :current-works-index="currentWorksIndex"> </works-grid>
    </el-scrollbar>
  </el-dialog>
</template>

<style scoped></style>
