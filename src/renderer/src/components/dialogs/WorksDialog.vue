<script setup lang="ts">
import WorksDTO from '../../model/main/dto/WorksDTO'
import { computed, nextTick, onMounted, Ref, ref, UnwrapRef } from 'vue'
import { isNullish } from '../../utils/CommonUtil'
import TagBox from '../common/TagBox.vue'
import SelectItem from '../../model/util/SelectItem'

// props
const props = defineProps<{
  works: WorksDTO[]
}>()

// onMounted
onMounted(() => {
  nextTick(() => {
    const baseDialogHeader =
      baseDialog.value.$el.parentElement.querySelector('.el-dialog__header')?.clientHeight
    const baseDialogFooter =
      baseDialog.value.$el.parentElement.querySelector('.el-dialog__footer')?.clientHeight
    heightForImage.value = isNullish(baseDialogHeader)
      ? 0
      : baseDialogHeader + isNullish(baseDialogFooter)
        ? 0
        : baseDialogFooter
  })
})

// 变量
// 接口
const apis = {
  worksSelectById: window.api.worksSelectById
}
// const isWide = ref(false)
// el-dialog组件实例
const baseDialog = ref()
// 图像高度
const heightForImage: Ref<UnwrapRef<number>> = ref(0)
// 本地标签
const localTags: Ref<UnwrapRef<SelectItem[]>> = computed(() => {
  const r = props.works[0].localTags?.map(
    (localTag) =>
      new SelectItem({
        value: localTag.id as number,
        label: localTag.localTagName as string
      })
  )
  console.log(r)
  return r
})

// 方法
// 查询作品信息
function getWorksInfo() {}
// function changeWide() {
//   isWide.value = !isWide.value
// }
</script>
<template>
  <el-dialog ref="baseDialog" top="50px">
    <div class="limiter">
      <el-scrollbar>
        <el-image fit="contain" :src="`workdir-resource://workdir/${props.works[0].filePath}`">
        </el-image>
      </el-scrollbar>
      <el-scrollbar>
        <el-descriptions direction="horizontal">
          <el-descriptions-item label="作者">
            {{ props.works[0].localAuthors[0].localAuthorName }}
          </el-descriptions-item>
          <el-descriptions-item label="站点">
            {{ props.works[0].site }}
          </el-descriptions-item>
          <el-descriptions-item label="本地标签">
            <tag-box v-model:data-list="localTags"></tag-box>
          </el-descriptions-item>
        </el-descriptions>
      </el-scrollbar>
    </div>
  </el-dialog>
</template>

<style scoped>
.limiter {
  display: flex;
  flex-direction: row;
  height: calc(100vh - 16px - 16px - 16px - 50px - 50px);
}
</style>
