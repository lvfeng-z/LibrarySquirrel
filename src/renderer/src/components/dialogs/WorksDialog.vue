<script setup lang="ts">
import WorksFullDTO from '@renderer/model/main/dto/WorksFullDTO.ts'
import { computed, h, onBeforeMount, onBeforeUnmount, onMounted, Ref, ref, UnwrapRef } from 'vue'
import { IsNullish, NotNullish } from '../../utils/CommonUtil'
import TagBox from '../common/TagBox.vue'
import SelectItem from '../../model/util/SelectItem'
import ApiUtil from '../../utils/ApiUtil'
import ExchangeBox from '@renderer/components/common/ExchangeBox.vue'
import ApiResponse from '@renderer/model/util/ApiResponse.ts'
import LocalTag from '@renderer/model/main/entity/LocalTag.ts'
import IPage from '@renderer/model/util/IPage.ts'
import { OriginType } from '@renderer/constants/OriginType.ts'
import SiteTagFullDTO from '@renderer/model/main/dto/SiteTagFullDTO.ts'
import Page from '@renderer/model/util/Page.ts'
import SiteTag from '@renderer/model/main/entity/SiteTag.ts'
import SiteTagQueryDTO from '@renderer/model/main/queryDTO/SiteTagQueryDTO.ts'
import StringUtil from '@renderer/utils/StringUtil.ts'
import LocalTagQueryDTO from '@renderer/model/main/queryDTO/LocalTagQueryDTO.ts'
import lodash from 'lodash'
import { ElMessage, ElMessageBox } from 'element-plus'
import AuthorInfo from '@renderer/components/common/AuthorInfo.vue'
import { siteQuerySelectItemPageBySiteName } from '@renderer/apis/SiteApi.ts'
import AutoLoadSelect from '@renderer/components/common/AutoLoadSelect.vue'
import { Picture } from '@element-plus/icons-vue'
import SegmentedTagItem from '@renderer/model/util/SegmentedTagItem.ts'
import { CopyIgnoreUndefined } from '@renderer/utils/ObjectUtil.ts'

// props
const props = defineProps<{
  works: WorksFullDTO[]
}>()

// model
const currentWorksIndex = defineModel<number>('currentWorksIndex', { required: true })

// onBeforeMount
onBeforeMount(() => {
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
// onMounted
onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

// onBeforeUnmount
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
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
  worksDeleteWorksAndSurroundingData: window.api.worksDeleteWorksAndSurroundingData,
  worksGetFullWorksInfoById: window.api.worksGetFullWorksInfoById
}
// 主要容器的实例
const infosRef = ref()
// localTag的ExchangeBox组件的实例
const localTagExchangeBox = ref()
// siteTag的ExchangeBox组件的实例
const siteTagExchangeBox = ref()
// 作品信息
const worksFullInfo: Ref<WorksFullDTO> = computed(() => new WorksFullDTO(props.works[currentWorksIndex.value]))
// 本地标签
const localTags: Ref<UnwrapRef<SegmentedTagItem[]>> = computed(() => {
  const result = worksFullInfo.value.localTags?.map(
    (localTag) =>
      new SegmentedTagItem({
        value: localTag.id as number,
        label: localTag.localTagName as string,
        disabled: false
      })
  )
  return IsNullish(result) ? [] : result
})
// 本地标签
const siteTags: Ref<UnwrapRef<SegmentedTagItem[]>> = computed(() => {
  const result = worksFullInfo.value.siteTags?.map(
    (siteTag) =>
      new SegmentedTagItem({
        value: siteTag.id as number,
        label: siteTag.siteTagName as string,
        subLabels: [(StringUtil.isBlank(siteTag.site?.siteName) ? '?' : siteTag.site?.siteName) as string],
        disabled: false
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
// 本地标签的查询参数
const localTagExchangeUpperSearchParams: Ref<LocalTagQueryDTO> = ref(new LocalTagQueryDTO())
// 本地标签的查询参数
const localTagExchangeLowerSearchParams: Ref<LocalTagQueryDTO> = ref(new LocalTagQueryDTO())
// 站点标签的查询参数
const siteTagExchangeUpperSearchParams: Ref<SiteTagQueryDTO> = ref(new SiteTagQueryDTO())
// 站点标签的查询参数
const siteTagExchangeLowerSearchParams: Ref<SiteTagQueryDTO> = ref(new SiteTagQueryDTO())

// 方法
// 查询作品信息
async function getWorksInfo() {
  const response = await apis.worksGetFullWorksInfoById(props.works[0].id)
  if (ApiUtil.check(response)) {
    const temp = ApiUtil.data<WorksFullDTO>(response)
    if (NotNullish(temp)) {
      CopyIgnoreUndefined(worksFullInfo.value, temp)
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
      const tempResultPage = ApiUtil.data<Page<SiteTagQueryDTO, SiteTagFullDTO>>(response)
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
// 处理抽屉面板打开事件
function handleDrawerOpen() {
  if (localTagEdit.value) {
    localTagExchangeBox.value.refreshData()
  }
  if (siteTagEdit.value) {
    siteTagExchangeBox.value.refreshData()
  }
}
// 处理删除按钮点击事件
function handleDeleteButtonClick() {
  ElMessageBox.confirm(
    h('div', {}, [h('span', null, '是否删除作品？'), h('br'), h('span', null, `${worksFullInfo.value.siteWorksName}`)]),
    '确认删除',
    {
      confirmButtonText: '删除',
      confirmButtonClass: 'el-button--danger',
      cancelButtonText: '取消'
    }
  )
    .then(() => deleteWorks())
    .catch(() => ElMessage.warning({ message: '取消删除' }))
}
// 切换当前作品
function setCurrentWorks(newIndex: number): void {
  if (props.works.length <= newIndex) {
    currentWorksIndex.value = props.works.length - 1
    return
  }
  if (newIndex < 0) {
    currentWorksIndex.value = 0
    return
  }
  currentWorksIndex.value = newIndex
  getWorksInfo()
}
// 处理键盘按下事件
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowLeft') {
    setCurrentWorks(currentWorksIndex.value - 1)
  } else if (event.key === 'ArrowRight') {
    setCurrentWorks(currentWorksIndex.value + 1)
  }
}
// 删除作品
async function deleteWorks() {
  if (NotNullish(worksFullInfo.value.id)) {
    const response = await apis.worksDeleteWorksAndSurroundingData(worksFullInfo.value.id)
    ApiUtil.msg(response)
  }
}
</script>
<template>
  <el-dialog center style="margin: auto; width: 90%">
    <template #header>
      <span class="works-dialog-works-name">
        {{ StringUtil.isBlank(worksFullInfo.nickName) ? worksFullInfo.siteWorksName : worksFullInfo.nickName }}
      </span>
    </template>
    <div class="works-dialog-container">
      <el-image
        class="works-dialog-image"
        fit="contain"
        :src="`resource://workdir/${worksFullInfo.resource?.filePath}`"
        @click="handlePictureClicked"
      >
        <template #error>
          <div class="works-dialog-image-error">
            <el-icon class="works-dialog-image-error-icon"><Picture /></el-icon>
          </div>
        </template>
      </el-image>
      <el-scrollbar class="works-dialog-scrollbar">
        <el-descriptions ref="infosRef" class="works-dialog-info" direction="horizontal" :column="1">
          <el-descriptions-item label="作者">
            <author-info id="author" :local-authors="worksFullInfo.localAuthors" :site-authors="worksFullInfo.siteAuthors" />
          </el-descriptions-item>
          <el-descriptions-item label="站点">
            <span id="site">{{ worksFullInfo.site?.siteName }}</span>
          </el-descriptions-item>
          <el-descriptions-item>
            <template #label>
              <span>本地标签 </span>
              <el-button @click="openDrawer(true)"> 编辑 </el-button>
            </template>
            <tag-box id="localTag" v-model:data="localTags" />
          </el-descriptions-item>
          <el-descriptions-item>
            <template #label>
              <span>站点标签 </span>
              <el-button @click="openDrawer(false)"> 编辑 </el-button>
            </template>
            <tag-box id="siteTag" v-model:data="siteTags" />
          </el-descriptions-item>
        </el-descriptions>
      </el-scrollbar>
      <el-anchor :container="infosRef?.parentElement?.parentElement" direction="vertical" type="default" :offset="30">
        <el-anchor-link href="#author" title="作者" />
        <el-anchor-link href="#site" title="站点" />
        <el-anchor-link href="#localTag" title="本地标签" />
        <el-anchor-link href="#siteTag" title="站点标签" />
      </el-anchor>
      <el-drawer v-model="drawerState" size="45%" :with-header="false" :open-delay="1" @open="handleDrawerOpen">
        <exchange-box
          v-if="localTagEdit"
          ref="localTagExchangeBox"
          v-model:upper-search-params="localTagExchangeUpperSearchParams"
          v-model:lower-search-params="localTagExchangeLowerSearchParams"
          class="works-dialog-tag-exchange-box"
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
          <template #upperToolbarMain>
            <el-input v-model="localTagExchangeUpperSearchParams.localTagName" placeholder="输入本地标签名称" clearable />
          </template>
          <template #lowerToolbarMain>
            <el-input v-model="localTagExchangeLowerSearchParams.localTagName" placeholder="输入本地标签名称" clearable />
          </template>
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
          v-model:upper-search-params="siteTagExchangeUpperSearchParams"
          v-model:lower-search-params="siteTagExchangeLowerSearchParams"
          class="works-dialog-tag-exchange-box"
          :upper-load="(_page) => requestWorksSiteTagPage(_page, true)"
          :lower-load="(_page) => requestWorksSiteTagPage(_page, false)"
          :search-button-disabled="false"
          tags-gap="10px"
          @upper-confirm="(upper: SelectItem[], lower: SelectItem[]) => handleTagExchangeConfirm(OriginType.SITE, upper, lower)"
          @lower-confirm="(upper: SelectItem[], lower: SelectItem[]) => handleTagExchangeConfirm(OriginType.SITE, upper, lower)"
          @all-confirm="(upper: SelectItem[], lower: SelectItem[]) => handleTagExchangeConfirm(OriginType.LOCAL, upper, lower)"
        >
          <template #upperToolbarMain>
            <el-row class="works-dialog-search-bar">
              <el-col :span="18">
                <el-input v-model="siteTagExchangeUpperSearchParams.siteTagName" placeholder="输入站点标签名称" clearable />
              </el-col>
              <el-col :span="6">
                <auto-load-select
                  v-model="siteTagExchangeUpperSearchParams.siteId"
                  :load="siteQuerySelectItemPageBySiteName"
                  placeholder="选择站点"
                  remote
                  filterable
                  clearable
                >
                  <template #default="{ list }">
                    <el-option v-for="item in list" :key="item.value" :value="item.value" :label="item.label" />
                  </template>
                </auto-load-select>
              </el-col>
            </el-row>
          </template>
          <template #lowerToolbarMain>
            <el-row class="works-dialog-search-bar">
              <el-col :span="18">
                <el-input v-model="siteTagExchangeLowerSearchParams.siteTagName" placeholder="输入站点标签名称" clearable />
              </el-col>
              <el-col :span="6">
                <auto-load-select
                  v-model="siteTagExchangeLowerSearchParams.siteId"
                  :load="siteQuerySelectItemPageBySiteName"
                  placeholder="选择站点"
                  remote
                  filterable
                  clearable
                >
                  <template #default="{ list }">
                    <el-option v-for="item in list" :key="item.value" :value="item.value" :label="item.label" />
                  </template>
                </auto-load-select>
              </el-col>
            </el-row>
          </template>
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
    <template #footer>
      <div class="works-dialog-footer-buttons">
        <el-button type="danger" icon="delete" @click="handleDeleteButtonClick">删除</el-button>
        <el-button-group class="works-dialog-footer-buttons-group" size="large">
          <el-button icon="back" @click="setCurrentWorks(currentWorksIndex - 1)" />
          <el-button icon="right" @click="setCurrentWorks(currentWorksIndex + 1)" />
        </el-button-group>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.works-dialog-works-name {
  text-overflow: ellipsis;
  white-space: nowrap;
}
.works-dialog-container {
  display: flex;
  flex-direction: row;
}
.works-dialog-scrollbar {
  flex-grow: 1;
}
.works-dialog-image {
  max-height: 75vh;
  max-width: 60%;
  margin-right: 10px;
  cursor: pointer;
  transition-duration: 0.3s;
}
.works-dialog-image:hover {
  background-color: rgb(166.2, 168.6, 173.4, 10%);
  filter: drop-shadow(0 0 10px rgba(0, 0, 0, 0.2));
}
.works-dialog-image-error {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: var(--el-fill-color-dark);
  width: 200px;
}
.works-dialog-image-error-icon {
  color: var(--el-text-color-secondary);
  scale: 2;
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
.works-dialog-search-bar {
  flex-grow: 1;
}
.works-dialog-footer-buttons {
  display: flex;
  align-items: center;
  position: relative;
  width: 100%;
}
.works-dialog-footer-buttons .works-dialog-footer-buttons-group {
  margin: 0 auto;
}
</style>
