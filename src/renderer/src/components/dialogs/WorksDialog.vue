<script setup lang="ts">
import WorksFullInfoDTO from '@renderer/model/main/dto/WorksFullInfoDTO.ts'
import { computed, onMounted, Ref, ref, UnwrapRef } from 'vue'
import { IsNullish, NotNullish } from '../../utils/CommonUtil'
import TagBox from '../common/TagBox.vue'
import SelectItem from '../../model/util/SelectItem'
import ApiUtil from '../../utils/ApiUtil'
import ExchangeBox from '@renderer/components/common/ExchangeBox.vue'
import { InputBox } from '@renderer/model/util/InputBox.ts'
import ApiResponse from '@renderer/model/util/ApiResponse.ts'
import LocalTag from '@renderer/model/main/entity/LocalTag.ts'
import IPage from '@renderer/model/util/IPage.ts'
import { OriginType } from '@renderer/constants/OriginType.ts'
import SiteTagDTO from '@renderer/model/main/dto/SiteTagDTO.ts'
import Page from '@renderer/model/util/Page.ts'
import SiteTag from '@renderer/model/main/entity/SiteTag.ts'
import SiteTagQueryDTO from '@renderer/model/main/queryDTO/SiteTagQueryDTO.ts'
import StringUtil from '@renderer/utils/StringUtil.ts'
import LocalTagQueryDTO from '@renderer/model/main/queryDTO/LocalTagQueryDTO.ts'
import lodash from 'lodash'
import { ElMessage } from 'element-plus'

// props
const props = defineProps<{
  works: WorksFullInfoDTO[]
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
const worksFullInfo: Ref<WorksFullInfoDTO> = ref(new WorksFullInfoDTO())
// 本地作者
const localAuthor: Ref<UnwrapRef<string>> = computed(() => {
  const names = worksFullInfo.value.localAuthors?.map((localAuthor) => localAuthor.localAuthorName)
  return IsNullish(names) ? '' : names.join(',')
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
  return IsNullish(result) ? [] : result
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
  return IsNullish(result) ? [] : result
})
// 本地标签编辑开关
const drawerState: Ref<boolean> = ref(false)
// 本地标签编辑开关
const localTagEdit: Ref<UnwrapRef<boolean>> = ref(false)
// 本地标签编辑开关
const siteTagEdit: Ref<UnwrapRef<boolean>> = ref(false)
// 本地标签ExchangeBox的mainInputBoxes
const localTagExchangeMainInput: Ref<UnwrapRef<InputBox[]>> = ref<InputBox[]>([
  new InputBox({
    name: 'localTagName',
    type: 'text',
    placeholder: '搜索标签名称',
    inputSpan: 21
  })
])
// 站点标签ExchangeBox的mainInputBoxes
const siteTagExchangeMainInput: Ref<UnwrapRef<InputBox[]>> = ref<InputBox[]>([
  new InputBox({
    name: 'siteTagName',
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
    const temp = ApiUtil.data<WorksFullInfoDTO>(response)
    if (NotNullish(temp)) {
      worksFullInfo.value = temp
    } else {
      ElMessage({
        type: 'error',
        message: '获取作品信息失败'
      })
    }
  }
}
// 处理本地标签exchangeBox确认交换事件
async function handleTagExchangeConfirm(type: OriginType, upper: SelectItem[], lower: SelectItem[], isUpper?: boolean) {
  const worksId = worksFullInfo.value.id
  if (IsNullish(isUpper) ? true : isUpper) {
    const boundIds = upper.map((item) => item.value)
    const boundResponse: ApiResponse = await apis.reWorksTagLink(type, boundIds, worksId)
    if (ApiUtil.check(boundResponse)) {
      ApiUtil.msg(boundResponse)
    }
  }
  if (IsNullish(isUpper) ? true : !isUpper) {
    const unboundIds = lower.map((item) => item.value)
    const unboundResponse: ApiResponse = await apis.reWorksTagUnlink(type, unboundIds, worksId)
    if (ApiUtil.check(unboundResponse)) {
      ApiUtil.msg(unboundResponse)
    }
  }
  if (OriginType.LOCAL === type) {
    localTagExchangeBox.value.refreshData(isUpper)
  } else {
    siteTagExchangeBox.value.refreshData(isUpper)
  }
  updateWorksTags(type)
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
      worksFullInfo.value.siteTags = IsNullish(tempResultPage?.data) ? [] : tempResultPage.data
    }
  }
}
// 请求作品绑定的本地标签接口的函数
async function requestWorksLocalTagPage(page: IPage<LocalTagQueryDTO, SelectItem>, bounded: boolean) {
  if (IsNullish(page.query)) {
    page.query = new LocalTagQueryDTO()
  }
  page.query.worksId = worksFullInfo.value.id
  page.query.boundOnWorksId = bounded
  const tempPage = lodash.cloneDeep(page)
  const response = await apis.localTagQuerySelectItemPageByWorksId(tempPage)
  if (ApiUtil.check(response)) {
    const newPage = ApiUtil.data<IPage<LocalTagQueryDTO, SelectItem>>(response)
    return IsNullish(newPage) ? tempPage : newPage
  } else {
    throw new Error()
  }
}
// 请求作品绑定的站点标签接口的函数
async function requestWorksSiteTagPage(page: IPage<SiteTagQueryDTO, SelectItem>, bounded: boolean) {
  if (IsNullish(page.query)) {
    page.query = new SiteTagQueryDTO()
  }
  page.query.worksId = worksFullInfo.value.id
  page.query.boundOnWorksId = bounded
  const response = await apis.siteTagQuerySelectItemPageByWorksId(lodash.cloneDeep(page))
  if (ApiUtil.check(response)) {
    const newPage = ApiUtil.data<IPage<SiteTagQueryDTO, SelectItem>>(response)
    return IsNullish(newPage) ? page : newPage
  } else {
    throw new Error()
  }
}
// 处理图片点击事件
function handlePictureClicked() {
  if (NotNullish(worksFullInfo.value.resource?.filePath)) {
    apis.appLauncherOpenImage(worksFullInfo.value.resource.filePath)
  } else {
    ElMessage({
      type: 'error',
      message: '无法打开图片，获取资源路径失败'
    })
  }
}
// 打开本地标签和站点标签的抽屉面板
function openDrawer(isLocal: boolean) {
  drawerState.value = true
  if (isLocal) {
    siteTagEdit.value = false
    localTagEdit.value = true
  } else {
    localTagEdit.value = false
    siteTagEdit.value = true
  }
}
//
function handleDrawerOpen() {
  if (localTagEdit.value) {
    localTagExchangeBox.value.refreshData()
  }
  if (siteTagEdit.value) {
    siteTagExchangeBox.value.refreshData()
  }
}
</script>
<template>
  <el-dialog top="50px">
    <div ref="container" class="works-dialog-container">
      <el-image
        class="works-dialog-image"
        fit="contain"
        :src="`resource://workdir/${worksFullInfo.resource?.filePath}`"
        @click="handlePictureClicked"
      >
      </el-image>
      <el-scrollbar>
        <el-descriptions class="works-dialog-info" direction="horizontal" :column="1">
          <el-descriptions-item>
            {{ StringUtil.isBlank(worksFullInfo.nickName) ? worksFullInfo.siteWorksName : worksFullInfo.nickName }}
          </el-descriptions-item>
          <el-descriptions-item label="作者">
            {{ localAuthor }}
          </el-descriptions-item>
          <el-descriptions-item label="站点">
            {{ worksFullInfo.site?.siteName }}
          </el-descriptions-item>
          <el-descriptions-item label="本地标签">
            <el-button @click="openDrawer(true)"> 编辑 </el-button>
            <tag-box v-model:data="localTags" />
          </el-descriptions-item>
          <el-descriptions-item label="站点标签">
            <el-button @click="openDrawer(false)"> 编辑 </el-button>
            <tag-box v-model:data="siteTags" />
          </el-descriptions-item>
        </el-descriptions>
      </el-scrollbar>
      <el-drawer v-model="drawerState" size="45%" :with-header="false" :open-delay="1" @open="handleDrawerOpen">
        <exchange-box
          v-if="localTagEdit"
          ref="localTagExchangeBox"
          class="works-dialog-tag-exchange-box"
          :upper-main-input-boxes="localTagExchangeMainInput"
          :lower-main-input-boxes="localTagExchangeMainInput"
          :upper-load="(_page: IPage<LocalTagQueryDTO, SelectItem>) => requestWorksLocalTagPage(_page, true)"
          :lower-load="(_page: IPage<LocalTagQueryDTO, SelectItem>) => requestWorksLocalTagPage(_page, false)"
          :search-button-disabled="false"
          tags-gap="10px"
          @upper-confirm="(upper: SelectItem[], lower: SelectItem[]) => handleTagExchangeConfirm(OriginType.LOCAL, upper, lower, true)"
          @lower-confirm="
            (upper: SelectItem[], lower: SelectItem[]) => handleTagExchangeConfirm(OriginType.LOCAL, upper, lower, false)
          "
          @all-confirm="(upper: SelectItem[], lower: SelectItem[]) => handleTagExchangeConfirm(OriginType.LOCAL, upper, lower)"
        >
          <template #upperTitle>
            <div class="works-dialog-tag-exchange-box-title">
              <span class="works-dialog-tag-exchange-box-title-text">已绑定</span>
            </div>
          </template>
          <template #lowerTitle>
            <div class="works-dialog-tag-exchange-box-title">
              <span class="works-dialog-tag-exchange-box-title-text">未绑定</span>
            </div>
          </template>
        </exchange-box>
        <exchange-box
          v-if="siteTagEdit"
          ref="siteTagExchangeBox"
          class="works-dialog-tag-exchange-box"
          :upper-main-input-boxes="siteTagExchangeMainInput"
          :lower-main-input-boxes="siteTagExchangeMainInput"
          :upper-load="(_page) => requestWorksSiteTagPage(_page, true)"
          :lower-load="(_page) => requestWorksSiteTagPage(_page, false)"
          :search-button-disabled="false"
          tags-gap="10px"
          @upper-confirm="(upper: SelectItem[], lower: SelectItem[]) => handleTagExchangeConfirm(OriginType.SITE, upper, lower)"
          @lower-confirm="(upper: SelectItem[], lower: SelectItem[]) => handleTagExchangeConfirm(OriginType.SITE, upper, lower)"
          @all-confirm="(upper: SelectItem[], lower: SelectItem[]) => handleTagExchangeConfirm(OriginType.LOCAL, upper, lower)"
        >
          <template #upperTitle>
            <div class="works-dialog-tag-exchange-box-title">
              <span class="works-dialog-tag-exchange-box-title-text">已绑定</span>
            </div>
          </template>
          <template #lowerTitle>
            <div class="works-dialog-tag-exchange-box-title">
              <span class="works-dialog-tag-exchange-box-title-text">未绑定</span>
            </div>
          </template>
        </exchange-box>
      </el-drawer>
    </div>
  </el-dialog>
</template>

<style scoped>
.works-dialog-container {
  display: flex;
  flex-direction: row;
  height: calc(100vh - 16px - 16px - 16px - 50px - 50px);
}
.works-dialog-image {
  height: auto;
  max-width: 60%;
  margin-right: 10px;
  flex-shrink: 0;
  cursor: pointer;
}
.works-dialog-info {
  margin-right: 10px;
}
.works-dialog-tag-exchange-box {
  height: 100%;
}
.works-dialog-tag-exchange-box-title {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--el-border-color);
  border-radius: 5px;
}
.works-dialog-tag-exchange-box-title-text {
  text-align: center;
  writing-mode: vertical-lr;
  color: var(--el-text-color-regular);
}
</style>
