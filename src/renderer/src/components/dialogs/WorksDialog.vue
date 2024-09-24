<script setup lang="ts">
import WorksDTO from '../../model/main/dto/WorksDTO'
import { computed, nextTick, onMounted, Ref, ref, UnwrapRef } from 'vue'
import { isNullish } from '../../utils/CommonUtil'
import TagBox from '../common/TagBox.vue'
import SelectItem from '../../model/util/SelectItem'
import ApiUtil from '../../utils/ApiUtil'
import ExchangeBox from '@renderer/components/common/ExchangeBox.vue'
import InputBox from '@renderer/model/util/InputBox.ts'

// props
const props = defineProps<{
  works: WorksDTO[]
}>()

// onMounted
onMounted(() => {
  getWorksInfo()
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
  worksGetFullWorksInfoById: window.api.worksGetFullWorksInfoById,
  localTagListSelectItemPageByWorksId: window.api.localTagListSelectItemPageByWorksId
}
// el-dialog组件实例
const baseDialog = ref()
// 图像高度
const heightForImage: Ref<UnwrapRef<number>> = ref(0)
// 作品信息
const worksFullInfo: Ref<UnwrapRef<WorksDTO>> = ref(new WorksDTO())
// 本地作者
const localAuthor: Ref<UnwrapRef<string>> = computed(() => {
  const names = worksFullInfo.value.localAuthors?.map((localAuthor) => localAuthor.localAuthorName)
  return isNullish(names) ? '' : names.join(',')
})
// 本地标签
const localTags: Ref<UnwrapRef<SelectItem[]>> = computed(() => {
  const result = worksFullInfo.value.localTags?.map(
    (localTag) =>
      new SelectItem({
        value: localTag.id as number,
        label: localTag.localTagName as string
      })
  )
  return isNullish(result) ? [] : result
})
// 本地标签编辑开关
const localTagEdit: Ref<UnwrapRef<boolean>> = ref(false)
// 站点标签ExchangeBox的mainInputBoxes
const exchangeBoxMainInputBoxes: Ref<UnwrapRef<InputBox[]>> = ref<InputBox[]>([
  {
    name: 'keyword',
    type: 'text',
    placeholder: '搜索标签名称',
    inputSpan: 20
  }
])
// 站点标签ExchangeBox的DropDownInputBoxes
const exchangeBoxDropDownInputBoxes: Ref<UnwrapRef<InputBox[]>> = ref<InputBox[]>([
  {
    name: 'keyword',
    type: 'text',
    placeholder: '搜索id',
    label: 'id',
    inputSpan: 22
  }
])

// 方法
// 查询作品信息
async function getWorksInfo() {
  const response = await apis.worksGetFullWorksInfoById(props.works[0].id)
  if (ApiUtil.apiResponseCheck(response)) {
    worksFullInfo.value = ApiUtil.apiResponseGetData(response) as WorksDTO
  }
}
</script>
<template>
  <el-dialog ref="baseDialog" top="50px">
    <div class="limiter">
      <el-scrollbar style="max-width: 55%">
        <div style="margin-right: 10px">
          <el-image fit="contain" :src="`workdir-resource://workdir/${props.works[0].filePath}`">
          </el-image>
        </div>
      </el-scrollbar>
      <el-scrollbar style="min-width: 45%; flex-grow: 1">
        <el-descriptions direction="horizontal" :column="1">
          <el-descriptions-item label="作者">
            {{ localAuthor }}
          </el-descriptions-item>
          <el-descriptions-item label="站点">
            {{ worksFullInfo.site?.siteName }}
          </el-descriptions-item>
          <el-descriptions-item label="本地标签">
            <el-button @click="localTagEdit = !localTagEdit">编辑</el-button>
            <tag-box v-show="!localTagEdit" v-model:data-list="localTags" />
            <exchange-box
              :class="{
                'works-dialog-local-tag-exchange-box': true,
                'works-dialog-local-tag-exchange-box-show': localTagEdit,
                'works-dialog-local-tag-exchange-box-hide': !localTagEdit
              }"
              upper-title="已绑定"
              lower-title="未绑定"
              :upper-main-input-boxes="exchangeBoxMainInputBoxes"
              :upper-drop-down-input-boxes="exchangeBoxDropDownInputBoxes"
              :lower-main-input-boxes="exchangeBoxMainInputBoxes"
              :lower-drop-down-input-boxes="exchangeBoxDropDownInputBoxes"
              :upper-search-api="apis.localTagListSelectItemPageByWorksId"
              :lower-search-api="apis.localTagListSelectItemPageByWorksId"
              :upper-api-static-params="{ worksId: worksFullInfo.id, boundOnWorksId: true }"
              :lower-api-static-params="{ worksId: worksFullInfo.id, boundOnWorksId: false }"
            />
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
.works-dialog-local-tag-exchange-box {
  overflow: hidden;
  transition: height 0.2s ease;
}
.works-dialog-local-tag-exchange-box-show {
  height: 500px;
}
.works-dialog-local-tag-exchange-box-hide {
  height: 0;
}
</style>
