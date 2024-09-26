<script setup lang="ts">
import WorksDTO from '../../model/main/dto/WorksDTO'
import { computed, nextTick, onMounted, Ref, ref, UnwrapRef } from 'vue'
import { isNullish } from '../../utils/CommonUtil'
import TagBox from '../common/TagBox.vue'
import SelectItem from '../../model/util/SelectItem'
import ApiUtil from '../../utils/ApiUtil'
import ExchangeBox from '@renderer/components/common/ExchangeBox.vue'
import InputBox from '@renderer/model/util/InputBox.ts'
import ApiResponse from '@renderer/model/util/ApiResponse.ts'
import LocalTag from '@renderer/model/main/LocalTag.ts'

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
  localTagListByWorksId: window.api.localTagListByWorksId,
  localTagListSelectItemPageByWorksId: window.api.localTagListSelectItemPageByWorksId,
  reWorksTagLink: window.api.reWorksTagLink,
  reWorksTagUnlink: window.api.reWorksTagUnlink
}
// el-dialog组件实例
const baseDialog = ref()
// localTag的ExchangeBox组件
const localTagExchangeBox = ref()
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
    name: 'localTagName',
    type: 'text',
    placeholder: '搜索标签名称',
    inputSpan: 21
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
// 处理本地标签exchangeBox确认交换事件
async function handleLocalTagExchangeConfirm(unbound: SelectItem[], bound: SelectItem[]) {
  const worksId = worksFullInfo.value.id
  const boundIds = bound.map((item) => item.value)
  const unboundIds = unbound.map((item) => item.value)
  const boundResponse: ApiResponse = await apis.reWorksTagLink(boundIds, worksId)
  const unboundResponse: ApiResponse = await apis.reWorksTagUnlink(unboundIds, worksId)
  const upperSuccess = ApiUtil.apiResponseCheck(boundResponse)
  const lowerSuccess = ApiUtil.apiResponseCheck(unboundResponse)
  if (upperSuccess && lowerSuccess) {
    localTagExchangeBox.value.refreshData()
    ApiUtil.apiResponseMsg(boundResponse)
    updateWorksLocalTags()
  }
}
// 更新本地标签
async function updateWorksLocalTags() {
  const response = await apis.localTagListByWorksId(worksFullInfo.value.id)
  if (ApiUtil.apiResponseCheck(response)) {
    worksFullInfo.value.localTags = ApiUtil.apiResponseGetData(response) as LocalTag[]
  }
}
</script>
<template>
  <el-dialog ref="baseDialog" top="50px">
    <div class="limiter">
      <el-scrollbar style="max-width: 70%">
        <el-image
          style="margin-right: 10px"
          fit="contain"
          :src="`workdir-resource://workdir/${props.works[0].filePath}`"
        >
        </el-image>
      </el-scrollbar>
      <el-scrollbar style="flex-grow: 1">
        <el-descriptions style="margin-right: 10px" direction="horizontal" :column="1">
          <el-descriptions-item label="作者">
            {{ localAuthor }}
          </el-descriptions-item>
          <el-descriptions-item label="站点">
            {{ worksFullInfo.site?.siteName }}
          </el-descriptions-item>
          <el-descriptions-item label="本地标签">
            <el-button @click="localTagEdit = true"> 编辑 </el-button>
            <tag-box v-model:data-list="localTags" />
            <el-drawer
              v-model="localTagEdit"
              size="45%"
              :with-header="false"
              @open="localTagExchangeBox.refreshData()"
            >
              <exchange-box
                ref="localTagExchangeBox"
                style="height: 100%"
                upper-title="已有标签"
                lower-title="可选标签"
                :upper-main-input-boxes="exchangeBoxMainInputBoxes"
                :lower-main-input-boxes="exchangeBoxMainInputBoxes"
                :upper-search-api="apis.localTagListSelectItemPageByWorksId"
                :lower-search-api="apis.localTagListSelectItemPageByWorksId"
                :upper-api-static-params="{ worksId: worksFullInfo.id, boundOnWorksId: true }"
                :lower-api-static-params="{ worksId: worksFullInfo.id, boundOnWorksId: false }"
                @exchange-confirm="handleLocalTagExchangeConfirm"
              />
            </el-drawer>
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
