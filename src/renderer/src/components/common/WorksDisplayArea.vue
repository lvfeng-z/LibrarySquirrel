<script setup lang="ts">
import WorksDTO from '../../model/main/dto/WorksDTO'
import WorksDisplayCase from './WorksDisplayCase.vue'
import WorksDialog from '../dialogs/WorksDialog.vue'
import { onMounted, onUnmounted, Ref, ref, UnwrapRef } from 'vue'
import { throttle } from 'lodash'
import { notNullish } from '@renderer/utils/CommonUtil.ts'

// props
const props = defineProps<{
  worksList: WorksDTO[]
}>()

// onMounted
onMounted(() => {
  // 监听宽度变化
  resizeObserver.observe(container.value)
})

// onUnmounted
onUnmounted(() => {
  if (notNullish(container.value)) {
    resizeObserver.unobserve(container.value)
  }
})

// 变量
// 最外部容器的实例
const container = ref()
// 监听最外部容器的宽度变化
const resizeObserver = new ResizeObserver((entries) =>
  throttle(
    () => {
      caseWidth.value = entries[0].contentRect.width / 5
      console.log(caseWidth.value)
    },
    300,
    { leading: true, trailing: true }
  )()
)
// 每个展示框的宽度
const caseWidth: Ref<UnwrapRef<number>> = ref(235)
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
    <el-row ref="container" class="works-display-area">
      <template v-for="works in props.worksList" :key="works.id">
        <works-display-case
          class="works-display-area-works-display-case"
          :width="caseWidth"
          :height="300"
          :works="works"
          @image-clicked="handleImageClicked"
        ></works-display-case>
      </template>
    </el-row>
    <works-dialog v-if="worksDialogState" v-model="worksDialogState" width="90%" :works="worksDialogResources" />
  </el-scrollbar>
</template>

<style scoped>
.works-display-area {
  display: flex;
  flex-direction: row;
  justify-content: center;
}
</style>
