<script setup lang="ts">
import WorksDTO from '../../model/main/dto/WorksDTO'
import { computed, onMounted, Ref, ref, UnwrapRef } from 'vue'
import { isNullish } from '../../utils/CommonUtil'
import TagBox from '../common/TagBox.vue'
import SelectItem from '../../model/util/SelectItem'
import ApiUtil from '../../utils/ApiUtil'
import ExchangeBox from '@renderer/components/common/ExchangeBox.vue'
import { InputBox } from '@renderer/model/util/InputBox.ts'
import ApiResponse from '@renderer/model/util/ApiResponse.ts'
import LocalTag from '@renderer/model/main/entity/LocalTag.ts'
import IPage from '@renderer/model/util/IPage.ts'
import BaseQueryDTO from '@renderer/model/main/queryDTO/BaseQueryDTO.ts'
import { OriginType } from '@renderer/constants/OriginType.ts'
import SiteTagDTO from '@renderer/model/main/dto/SiteTagDTO.ts'
import Page from '@renderer/model/util/Page.ts'
import SiteTag from '@renderer/model/main/entity/SiteTag.ts'
import SiteTagQueryDTO from '@renderer/model/main/queryDTO/SiteTagQueryDTO.ts'
import StringUtil from '@renderer/utils/StringUtil.ts'

// props
const props = defineProps<{
  works: WorksDTO[]
}>()

// onMounted
onMounted(() => {
  getWorksInfo()
  // nextTick(() => {
  //   const baseDialogHeader =
  //     baseDialog.value.$el.parentElement.querySelector('.el-dialog__header')?.clientHeight
  //   const baseDialogFooter =
  //     baseDialog.value.$el.parentElement.querySelector('.el-dialog__footer')?.clientHeight
  //   heightForImage.value = isNullish(baseDialogHeader)
  //     ? 0
  //     : baseDialogHeader + isNullish(baseDialogFooter)
  //       ? 0
  //       : baseDialogFooter
  // })
})

// 变量
// 接口
const apis = {
  appLauncherOpenImage: window.api.appLauncherOpenImage,
  localTagListByWorksId: window.api.localTagListByWorksId,
  localTagQuerySelectItemPageByWorksId: window.api.localTagQuerySelectItemPageByWorksId,
  siteTagQueryPageByWorksId: window.api.siteTagQueryPageByWorksId,
  siteTagQuerySelectItemPageByWorksId: window.api.siteTagQuerySelectItemPageByWorksId,
  reWorksTagLink: window.api.reWorksTagLink,
  reWorksTagUnlink: window.api.reWorksTagUnlink,
  worksGetFullWorksInfoById: window.api.worksGetFullWorksInfoById
}
// container元素实例
const container = ref()
// localTag的ExchangeBox组件
const localTagExchangeBox = ref()
// siteTag的ExchangeBox组件
const siteTagExchangeBox = ref()
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
// 本地标签
const siteTags: Ref<UnwrapRef<SelectItem[]>> = computed(() => {
  const result = worksFullInfo.value.siteTags?.map(
    (siteTag) =>
      new SelectItem({
        value: siteTag.id as number,
        label: siteTag.siteTagName as string,
        subLabels: [(StringUtil.isBlank(siteTag.site?.siteName) ? '?' : siteTag.site?.siteName) as string]
      })
  )
  return isNullish(result) ? [] : result
})
// 本地标签编辑开关
const localTagEdit: Ref<UnwrapRef<boolean>> = ref(false)
// 本地标签编辑开关
const siteTagEdit: Ref<UnwrapRef<boolean>> = ref(false)
// 站点标签ExchangeBox的mainInputBoxes
const exchangeBoxMainInputBoxes: Ref<UnwrapRef<InputBox[]>> = ref<InputBox[]>([
  new InputBox({
    name: 'localTagName',
    type: 'text',
    placeholder: '搜索标签名称',
    inputSpan: 21
  })
])

// 方法
// 查询作品信息
async function getWorksInfo() {
  const response = await apis.worksGetFullWorksInfoById(props.works[0].id)
  if (ApiUtil.check(response)) {
    worksFullInfo.value = ApiUtil.data(response) as WorksDTO
  }
}
// 处理本地标签exchangeBox确认交换事件
async function handleTagExchangeConfirm(type: OriginType, unbound: SelectItem[], bound: SelectItem[]) {
  const worksId = worksFullInfo.value.id
  const boundIds = bound.map((item) => item.value)
  const unboundIds = unbound.map((item) => item.value)
  const boundResponse: ApiResponse = await apis.reWorksTagLink(type, boundIds, worksId)
  const unboundResponse: ApiResponse = await apis.reWorksTagUnlink(type, unboundIds, worksId)
  const upperSuccess = ApiUtil.check(boundResponse)
  const lowerSuccess = ApiUtil.check(unboundResponse)
  if (upperSuccess && lowerSuccess) {
    if (OriginType.LOCAL === type) {
      localTagExchangeBox.value.refreshData()
    } else {
      siteTagExchangeBox.value.refreshData()
    }
    ApiUtil.msg(boundResponse)
    updateWorksTags(type)
  }
}
// 更新标签
async function updateWorksTags(type: OriginType) {
  if (OriginType.LOCAL === type) {
    const response = await apis.localTagListByWorksId(worksFullInfo.value.id)
    if (ApiUtil.check(response)) {
      worksFullInfo.value.localTags = ApiUtil.data<LocalTag[]>(response)
    }
  } else {
    const tempSiteTagPage = new Page<SiteTagQueryDTO, SiteTag>()
    const tempSiteTagQuery = new SiteTagQueryDTO()
    tempSiteTagPage.pageSize = 100
    tempSiteTagQuery.worksId = worksFullInfo.value.id
    tempSiteTagQuery.boundOnWorksId = true
    tempSiteTagPage.query = tempSiteTagQuery
    const response = await apis.siteTagQueryPageByWorksId(tempSiteTagPage)
    if (ApiUtil.check(response)) {
      const tempResultPage = ApiUtil.data<Page<SiteTagQueryDTO, SiteTagDTO>>(response)
      worksFullInfo.value.siteTags = isNullish(tempResultPage?.data) ? [] : tempResultPage.data
    }
  }
}
// 请求作品绑定的本地标签接口的函数
async function requestWorksLocalTagPage(page: IPage<BaseQueryDTO, SelectItem>) {
  const response = await apis.localTagQuerySelectItemPageByWorksId(page)
  if (ApiUtil.check(response)) {
    const newPage = ApiUtil.data<IPage<BaseQueryDTO, SelectItem>>(response)
    return isNullish(newPage) ? page : newPage
  } else {
    throw new Error()
  }
}
// 请求作品绑定的站点标签接口的函数
async function requestWorksSiteTagPage(page: IPage<BaseQueryDTO, SelectItem>) {
  const response = await apis.siteTagQuerySelectItemPageByWorksId(page)
  if (ApiUtil.check(response)) {
    const newPage = ApiUtil.data<IPage<BaseQueryDTO, SelectItem>>(response)
    return isNullish(newPage) ? page : newPage
  } else {
    throw new Error()
  }
}
// 处理图片点击事件
function handlePictureClicked() {
  apis.appLauncherOpenImage(props.works[0].filePath)
}
</script>
<template>
  <el-dialog top="50px">
    <div ref="container" class="works-dialog-container">
      <el-image
        style="height: auto; max-width: 60%; margin-right: 10px; cursor: pointer"
        fit="contain"
        :src="`resource://workdir/${props.works[0].filePath}`"
        @click="handlePictureClicked"
      >
      </el-image>
      <el-scrollbar>
        <el-descriptions style="margin-right: 10px" direction="horizontal" :column="1">
          <el-descriptions-item label="作者">
            {{ localAuthor }}
          </el-descriptions-item>
          <el-descriptions-item label="站点">
            {{ worksFullInfo.site?.siteName }}
          </el-descriptions-item>
          <el-descriptions-item label="本地标签">
            <el-button @click="localTagEdit = true"> 编辑 </el-button>
            <tag-box v-model:data="localTags" />
            <el-drawer v-model="localTagEdit" size="45%" :with-header="false" @open="localTagExchangeBox.refreshData()">
              <exchange-box
                ref="localTagExchangeBox"
                style="height: 100%"
                upper-title="已有标签"
                lower-title="可选标签"
                :upper-main-input-boxes="exchangeBoxMainInputBoxes"
                :lower-main-input-boxes="exchangeBoxMainInputBoxes"
                :upper-load="requestWorksLocalTagPage"
                :lower-load="requestWorksLocalTagPage"
                :upper-load-fixed-params="{ worksId: worksFullInfo.id, boundOnWorksId: true }"
                :lower-load-fixed-params="{ worksId: worksFullInfo.id, boundOnWorksId: false }"
                @exchange-confirm="
                  (unbound: SelectItem[], bound: SelectItem[]) => handleTagExchangeConfirm(OriginType.LOCAL, unbound, bound)
                "
              />
            </el-drawer>
          </el-descriptions-item>
          <el-descriptions-item label="站点标签">
            <el-button @click="siteTagEdit = true"> 编辑 </el-button>
            <tag-box v-model:data="siteTags" />
            <el-drawer v-model="siteTagEdit" size="45%" :with-header="false" @open="siteTagExchangeBox.refreshData()">
              <exchange-box
                ref="siteTagExchangeBox"
                style="height: 100%"
                upper-title="已有标签"
                lower-title="可选标签"
                :upper-main-input-boxes="exchangeBoxMainInputBoxes"
                :lower-main-input-boxes="exchangeBoxMainInputBoxes"
                :upper-load="requestWorksSiteTagPage"
                :lower-load="requestWorksSiteTagPage"
                :upper-load-fixed-params="{ worksId: worksFullInfo.id, boundOnWorksId: true }"
                :lower-load-fixed-params="{ worksId: worksFullInfo.id, boundOnWorksId: false }"
                @exchange-confirm="
                  (unbound: SelectItem[], bound: SelectItem[]) => handleTagExchangeConfirm(OriginType.SITE, unbound, bound)
                "
              />
            </el-drawer>
          </el-descriptions-item>
        </el-descriptions>
      </el-scrollbar>
    </div>
  </el-dialog>
</template>

<style scoped>
.works-dialog-container {
  display: flex;
  flex-direction: row;
  height: calc(100vh - 16px - 16px - 16px - 50px - 50px);
}
</style>
