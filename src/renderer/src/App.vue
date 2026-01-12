<script setup lang="ts">
import * as electron from 'electron'
import { onBeforeUnmount, onMounted, Ref, ref, UnwrapRef } from 'vue'
import LocalAuthorManage from '@renderer/components/subpage/LocalAuthorManage.vue'
import LocalTagManage from '@renderer/components/subpage/LocalTagManage.vue'
import SiteTagManage from '@renderer/components/subpage/SiteTagManage.vue'
import Settings from '@renderer/components/subpage/Settings.vue'
import TaskManage from '@renderer/components/subpage/TaskManage.vue'
import Developing from '@renderer/components/subpage/Developing.vue'
import SiteManage from '@renderer/components/subpage/SiteManage.vue'
import PluginManage from '@renderer/components/subpage/PluginManage.vue'
import SiteAuthorManage from '@renderer/components/subpage/SiteAuthorManage.vue'
import GuidePage from '@renderer/components/subpage/Guide.vue'
import Test from '@renderer/components/subpage/Test.vue'
import SideMenu from './components/oneOff/SideMenu.vue'
import { Close, Coordinate, Discount, HomeFilled, Link, List, Setting, Star, TakeawayBox, User } from '@element-plus/icons-vue'
import WorksGrid from './components/common/WorksGrid.vue'
import ApiUtil from './utils/ApiUtil'
import Page from './model/util/Page.ts'
import SelectItem from './model/util/SelectItem.ts'
import SegmentedTagItem from '@renderer/model/util/SegmentedTagItem.ts'
import WorksQueryDTO from './model/main/queryDTO/WorksQueryDTO.ts'
import ExplainPath from './components/dialogs/ExplainPath.vue'
import ApiResponse from './model/util/ApiResponse.ts'
import TransactionTest from './test/transaction-test.vue'
import { ArrayNotEmpty, IsNullish, NotNullish } from './utils/CommonUtil'
import CollapsePanel from '@renderer/components/common/CollapsePanel.vue'
import SearchConditionQueryDTO from '@renderer/model/main/queryDTO/SearchConditionQueryDTO.ts'
import BaseQueryDTO from '@renderer/model/main/queryDTO/BaseQueryDTO.ts'
import IPage from '@renderer/model/util/IPage.ts'
import AutoLoadTagSelect from '@renderer/components/common/AutoLoadTagSelect.vue'
import { SearchCondition, SearchType } from '@renderer/model/util/SearchCondition.ts'
import lodash from 'lodash'
import { CrudOperator } from '@renderer/constants/CrudOperator.ts'
import StringUtil from '@renderer/utils/StringUtil.ts'
import NotificationList from '@renderer/components/oneOff/NotificationList.vue'
import WorksFullDTO from '@renderer/model/main/dto/WorksFullDTO.ts'
import { PageEnum, PageState } from '@renderer/constants/PageState.ts'
import { usePageStatesStore } from '@renderer/store/UsePageStatesStore.ts'
import TaskQueueResourceReplaceConfirmDialog from '@renderer/components/dialogs/TaskQueueResourceReplaceConfirmDialog.vue'
import { useTourStatesStore } from '@renderer/store/UseTourStatesStore.ts'
import { Settings as SettingsEntity } from '@renderer/model/util/Settings.ts'
import { ElMessage, ElMessageBox } from 'element-plus'
import { AskGotoPage, GotoPage } from '@renderer/utils/PageUtil.ts'

// onMounted
onMounted(async () => {
  // const request = apis.worksQueryPage()
  // console.log(request)
  resizeObserver.observe(worksAreaRef.value.$el)
  window.addEventListener('keyup', handleKeyUp)

  // 首次使用软件的向导
  const response = await apis.settingsGetSettings()
  if (ApiUtil.check(response)) {
    const data = ApiUtil.data<SettingsEntity>(response)
    const workDirIsBlank = StringUtil.isBlank(data?.workdir)
    const askSetWorkDir = () =>
      AskGotoPage({
        page: PageEnum.Settings,
        title: '请设置工作目录',
        content: 'LibrarySquirrel需要工作目录才能正常使用',
        options: {
          confirmButtonText: '去设置',
          cancelButtonText: '取消',
          type: 'warning',
          showClose: false
        },
        extraData: true
      })
    if (!data?.tour.firstTimeTourPassed) {
      ElMessageBox.confirm('在使用LibrarySquirrel之前，建议先查看向导', '', {
        confirmButtonText: '前往查看',
        cancelButtonText: '取消'
      })
        .then(async () => {
          await GotoPage(PageEnum.Guide)
          await apis.settingsSaveSettings([{ path: 'tour.firstTimeTourPassed', value: true }])
          await usePageStatesStore().waitPage(usePageStatesStore().pageStates.mainPage)
          if (workDirIsBlank) {
            askSetWorkDir()
          }
        })
        .catch(async () => {
          useTourStatesStore()
            .tourStates.startGuideTour()
            .then(() => {
              if (workDirIsBlank) {
                askSetWorkDir()
              }
            })
          await apis.settingsSaveSettings([{ path: 'tour.firstTimeTourPassed', value: true }])
        })
    } else if (workDirIsBlank) {
      askSetWorkDir()
    }
  } else {
    ElMessage({
      message: '获取设置失败',
      type: 'error'
    })
  }
})
// onBeforeUnmount
onBeforeUnmount(() => {
  window.removeEventListener('keyup', handleKeyUp)
})

// 变量
// 接口
const apis = {
  test: window.api.localAuthorListSelectItems,
  testMainWindowMsgTest: window.api.testMainWindowMsgTest,
  testPLimitTest: window.api.testPLimitTest,
  testInstallPluginTest: window.api.testInstallPluginTest,
  localTagListSelectItems: window.api.localTagListSelectItems,
  searchQuerySearchConditionPage: window.api.searchQuerySearchConditionPage,
  worksQueryPage: window.api.worksQueryPage,
  searchQueryWorksPage: window.api.searchQueryWorksPage,
  settingsGetSettings: window.api.settingsGetSettings,
  settingsSaveSettings: window.api.settingsSaveSettings
}
// main-page-works-space的实例
const worksSpace = ref()
// worksArea组件的实例
const worksAreaRef = ref()
// 向导按钮组件的实例
const guideButton = ref()
// 任务按钮组件的实例
const taskButton = ref()
// 搜索条件工具栏组件的实例
const searchConditionBar = ref()
const pageStatesStore = usePageStatesStore()
const selectedTagList: Ref<UnwrapRef<SegmentedTagItem[]>> = ref([]) // 主搜索栏选中列表
const customTagList: Ref<UnwrapRef<SegmentedTagItem[]>> = ref([]) // 主搜索栏自定义标签列表
const autoLoadInput: Ref<UnwrapRef<string | undefined>> = ref()
const worksList: Ref<UnwrapRef<WorksFullDTO[]>> = ref([]) // 需展示的作品列表
// 当前作品的索引
const currentWorksIndex = ref(0)
// 查询参数类型
const searchConditionType: Ref<UnwrapRef<SearchType[]>> = ref([])
// 作品分页
const worksPage: Ref<UnwrapRef<Page<SearchCondition[], WorksFullDTO>>> = ref(new Page<SearchCondition[], WorksFullDTO>())
// 搜索栏折叠面板开关
const searchBarPanelState: Ref<boolean> = ref(false)
// 提醒列表开关
const notificationListState: Ref<boolean> = ref(false)
// 加载更多按钮开关
const loadMore: Ref<boolean> = ref(false)
// 监听worksArea组件的高度变化
const resizeObserver = new ResizeObserver((entries) => {
  loadMore.value =
    entries[0].contentRect.height < worksSpace.value.clientHeight && worksPage.value.pageNumber < worksPage.value.pageCount
})
// IpcRenderer相关
// 路径解释
const showExplainPath = ref(false) // 解释路径对话框的开关
const pathWaitingExplain: Ref<string> = ref('') // 需要解释含义的路径
// 资源替换确认
const resourceReplaceConfirmState: Ref<boolean> = ref(false)
const resourceReplaceConfirmList: Ref<{ taskId: number; msg: string }[]> = ref([])

// 方法
// 查询标签选择列表
async function querySearchItemPage(page: IPage<BaseQueryDTO, SelectItem>, input?: string): Promise<IPage<BaseQueryDTO, SelectItem>> {
  const query = new SearchConditionQueryDTO()
  query.nonFieldKeyword = input
  query.types = lodash.cloneDeep(searchConditionType.value)
  page.query = query
  let response: ApiResponse
  try {
    response = await apis.searchQuerySearchConditionPage(page)
  } catch (e) {
    console.log(e)
    return page
  }
  if (ApiUtil.check(response)) {
    const newPage = ApiUtil.data<Page<BaseQueryDTO, SelectItem>>(response)
    if (IsNullish(newPage)) {
      ApiUtil.msg(response)
      throw new Error(response.msg)
    }
    return newPage
  } else {
    ApiUtil.msg(response)
    throw new Error(response.msg)
  }
}
// 开启副页面
async function showSubpage(page: PageState) {
  return pageStatesStore.showPage(page)
}
// 关闭副页面
async function closeSubpage() {
  return pageStatesStore.closePage()
}
// 监听esc键
function handleKeyUp(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeSubpage()
  }
}
// 请求作品接口
async function searchWorks(page: Page<SearchCondition[], WorksFullDTO>): Promise<Page<WorksQueryDTO, WorksFullDTO>> {
  // 处理搜索框的标签
  page.query = selectedTagList.value
    .map((searchCondition) => {
      let operator: CrudOperator | undefined = undefined
      if (NotNullish(searchCondition.disabled) && searchCondition.disabled) {
        operator = CrudOperator.NOT_EQUAL
      }
      if (NotNullish(searchCondition.extraData)) {
        const extraData = searchCondition.extraData as { type: SearchType; id: number }
        return new SearchCondition({ type: extraData.type, value: extraData.id, operator: operator })
      } else {
        return undefined
      }
    })
    .filter(NotNullish)
  if (IsNullish(page.query)) {
    page.query = []
  }
  if (ArrayNotEmpty(customTagList.value)) {
    customTagList.value.forEach((tag) =>
      page.query?.push(new SearchCondition({ type: SearchType.WORKS_SITE_NAME, value: tag.value, operator: CrudOperator.LIKE }))
    )
  }
  // 处理搜索框输入的文本
  if (StringUtil.isNotBlank(autoLoadInput.value)) {
    const worksName = autoLoadInput.value
    if (IsNullish(page.query)) {
      page.query = []
    }
    let tempCondition = new SearchCondition({ type: SearchType.WORKS_SITE_NAME, value: worksName, operator: CrudOperator.LIKE })
    page.query.push(tempCondition)
    tempCondition = new SearchCondition({ type: SearchType.WORKS_NICKNAME, value: worksName, operator: CrudOperator.LIKE })
    page.query.push(tempCondition)
  }

  page.pageSize = 16

  return apis.searchQueryWorksPage(page).then((response: ApiResponse) => {
    if (ApiUtil.check(response)) {
      return ApiUtil.data<Page<WorksQueryDTO, WorksFullDTO>>(response)
    } else {
      return page
    }
  })
}
// 加载下一页作品
async function queryWorksPage(next: boolean) {
  // 新查询重置查询条件
  if (!next) {
    worksPage.value = new Page<SearchCondition[], WorksFullDTO>()
    worksPage.value.pageSize = 10
    worksList.value.length = 0
  }
  //查询
  const tempPage = lodash.cloneDeep(worksPage.value)
  tempPage.data = undefined
  const nextPage = await searchWorks(tempPage)

  // 没有新数据时，不再增加页码
  if (ArrayNotEmpty(nextPage.data)) {
    worksPage.value.pageNumber++
    worksPage.value.pageCount = nextPage.pageCount
    worksPage.value.dataCount = nextPage.dataCount
    worksList.value.push(...nextPage.data)
  }
}
// 重新查询搜索条件
async function querySearchCondition() {
  return searchConditionBar.value.newSearch()
}
// 控制搜索标签颜色的函数
function searchTagColorResolver(segmentedTagItem: SegmentedTagItem): void {
  const subLabels = segmentedTagItem.subLabels
  if (ArrayNotEmpty(subLabels)) {
    switch (subLabels[0]) {
      case 'author':
        switch (subLabels[1]) {
          case 'local':
            segmentedTagItem.mainBackGround = 'rgb(245, 108, 108, 25%)'
            segmentedTagItem.mainBackGroundHover = 'rgb(245, 108, 108, 10%)'
            segmentedTagItem.mainTextColor = 'rgb(245, 108, 108, 75%)'
            break
          default:
            segmentedTagItem.mainBackGround = 'rgb(164, 158, 255, 25%)'
            segmentedTagItem.mainBackGroundHover = 'rgb(164, 158, 255, 10%)'
            segmentedTagItem.mainTextColor = 'rgb(164, 158, 255, 95%)'
            break
        }
        break
      case 'tag':
        if (subLabels[1] !== 'local') {
          segmentedTagItem.mainBackGround = 'rgb(64, 158, 255, 25%)'
          segmentedTagItem.mainBackGroundHover = 'rgb(64, 158, 255, 10%)'
          segmentedTagItem.mainTextColor = 'rgb(64, 158, 255, 85%)'
        }
        break
    }
  }
}

// 监听IpcRenderer
window.electron.ipcRenderer.on('explain-path-request', (_event: electron.IpcRendererEvent, dir) => {
  showExplainPath.value = true
  pathWaitingExplain.value = dir
})
window.electron.ipcRenderer.on(
  'task-queue-resource-replace-confirm',
  (_event: electron.IpcRendererEvent, config: { taskId: number; msg: string }) => {
    resourceReplaceConfirmState.value = true
    resourceReplaceConfirmList.value.push(config)
  }
)

// test
const showTestDialog = ref(false)
async function handleTest() {
  // apis.testMainWindowMsgTest()
  showExplainPath.value = true
  // showTestDialog.value = true
}
</script>

<template>
  <div class="ui">
    <div
      :class="{
        'close-subpage-button': true,
        'z-layer-5': true,
        'close-subpage-button-hide': !pageStatesStore.pageStates.subPage.state
      }"
      @click="closeSubpage"
    >
      <Close class="close-subpage-button-icon" />
    </div>
    <el-container>
      <el-aside class="z-layer-4" width="auto">
        <!-- 为了不被TagManage中的SearchToolbar的3层z轴遮挡，此处为4层z轴 -->
        <side-menu class="aside-side-menu" width="160px" fold-width="64px" :default-active="['0']">
          <template #default>
            <el-menu-item index="0" @click="closeSubpage">
              <template #title> 主页 </template>
              <el-icon><HomeFilled /></el-icon>
            </el-menu-item>
            <el-sub-menu index="1">
              <template #title>
                <el-icon><Discount /></el-icon>
                <span>标签</span>
              </template>
              <el-menu-item index="1-1" @click="showSubpage(pageStatesStore.pageStates.localTagManage)">本地标签</el-menu-item>
              <el-menu-item index="1-2" @click="showSubpage(pageStatesStore.pageStates.siteTagManage)">站点标签</el-menu-item>
            </el-sub-menu>
            <el-sub-menu index="2">
              <template #title>
                <el-icon><User /></el-icon>
                <span>作者</span>
              </template>
              <el-menu-item index="2-1" @click="showSubpage(pageStatesStore.pageStates.localAuthorManage)"> 本地作者 </el-menu-item>
              <el-menu-item index="2-2" @click="showSubpage(pageStatesStore.pageStates.siteAuthorManage)">站点作者</el-menu-item>
            </el-sub-menu>
            <el-menu-item index="3" @click="showSubpage(pageStatesStore.pageStates.developing)">
              <template #title>收藏</template>
              <el-icon><Star /></el-icon>
            </el-menu-item>
            <el-menu-item index="4" @click="showSubpage(pageStatesStore.pageStates.siteManage)">
              <template #title>站点</template>
              <el-icon><Link /></el-icon>
            </el-menu-item>
            <el-menu-item index="5" @click="showSubpage(pageStatesStore.pageStates.taskManage)">
              <template #title>任务</template>
              <el-icon ref="taskButton"><List /></el-icon>
            </el-menu-item>
            <el-menu-item index="6" @click="showSubpage(pageStatesStore.pageStates.pluginManage)">
              <template #title>插件</template>
              <el-icon><TakeawayBox /></el-icon>
            </el-menu-item>
            <el-menu-item index="7" @click="showSubpage(pageStatesStore.pageStates.settings)">
              <template #title>设置</template>
              <el-icon><Setting /></el-icon>
            </el-menu-item>
            <el-menu-item index="8" @click="showSubpage(pageStatesStore.pageStates.guide)">
              <template #title>向导</template>
              <el-icon ref="guideButton"><Guide /></el-icon>
            </el-menu-item>
            <el-menu-item index="9" @click="showSubpage(pageStatesStore.pageStates.test)">
              <template #title>测试按钮</template>
              <el-icon><Coordinate /></el-icon>
            </el-menu-item>
          </template>
        </side-menu>
      </el-aside>
      <el-main style="padding: 0">
        <div v-show="pageStatesStore.pageStates.mainPage.state" class="main-page">
          <div class="main-page-searchbar">
            <el-row class="z-layer-3">
              <el-col :span="22">
                <auto-load-tag-select
                  ref="searchConditionBar"
                  v-model:selected-data="selectedTagList"
                  v-model:custom-data="customTagList"
                  v-model:input="autoLoadInput"
                  class="main-page-auto-load-tag-select"
                  :load="querySearchItemPage"
                  :page-size="40"
                  :color-resolver="searchTagColorResolver"
                  tags-gap="10px"
                  max-height="300px"
                  min-height="33px"
                >
                  <template #left>
                    <el-checkbox-group
                      v-model="searchConditionType"
                      class="main-page-auto-load-tag-select-tag-type-checkbox-group"
                      @change="querySearchCondition"
                    >
                      <el-checkbox :value="SearchType.LOCAL_TAG">
                        <span
                          class="main-page-auto-load-tag-select-tag-type-checkbox main-page-auto-load-tag-select-tag-type-checkbox-local-tag"
                        >
                          本地标签
                        </span>
                      </el-checkbox>
                      <el-checkbox :value="SearchType.SITE_TAG">
                        <span
                          class="main-page-auto-load-tag-select-tag-type-checkbox main-page-auto-load-tag-select-tag-type-checkbox-site-tag"
                        >
                          站点标签
                        </span>
                      </el-checkbox>
                      <el-checkbox :value="SearchType.LOCAL_AUTHOR">
                        <span
                          class="main-page-auto-load-tag-select-tag-type-checkbox main-page-auto-load-tag-select-tag-type-checkbox-local-author"
                        >
                          本地作者
                        </span>
                      </el-checkbox>
                      <el-checkbox :value="SearchType.SITE_AUTHOR">
                        <span
                          class="main-page-auto-load-tag-select-tag-type-checkbox main-page-auto-load-tag-select-tag-type-checkbox-site-author"
                        >
                          站点作者
                        </span>
                      </el-checkbox>
                    </el-checkbox-group>
                  </template>
                </auto-load-tag-select>
                <collapse-panel v-model:state="searchBarPanelState" class="z-layer-3" border-radios="10px">
                  <div style="padding: 5px; background-color: var(--el-fill-color-blank)">
                    <!--TODO在这里实现一个更灵活的组合查询条件的组件，比如拖拽组成AND或OR组合-->
                    <el-button @click="handleTest"> test </el-button>
                  </div>
                </collapse-panel>
              </el-col>
              <el-col style="display: flex; justify-content: center" :span="2">
                <el-button @click="queryWorksPage(false)">搜索</el-button>
              </el-col>
            </el-row>
          </div>
          <div ref="worksSpace" class="main-page-works-space">
            <el-scrollbar v-el-scrollbar-bottomed="() => queryWorksPage(true)">
              <works-grid
                ref="worksAreaRef"
                v-model:current-works-index="currentWorksIndex"
                class="main-page-works-grid"
                :works-list="worksList"
              ></works-grid>
            </el-scrollbar>
            <span
              ref="loadMoreButton"
              :class="{
                'works-grid-load-more': true,
                'works-grid-show-load-more': loadMore,
                'works-grid-hide-load-more': !loadMore
              }"
              @click="queryWorksPage(true)"
            >
              加载更多...
            </span>
          </div>
        </div>
        <div v-if="pageStatesStore.pageStates.subPage.state" class="subPage">
          <local-tag-manage v-if="pageStatesStore.pageStates.localTagManage.state" />
          <site-tag-manage v-if="pageStatesStore.pageStates.siteTagManage.state" />
          <local-author-manage v-if="pageStatesStore.pageStates.localAuthorManage.state" />
          <site-author-manage v-if="pageStatesStore.pageStates.siteAuthorManage.state" />
          <plugin-manage v-if="pageStatesStore.pageStates.pluginManage.state" />
          <task-manage
            v-if="pageStatesStore.pageStates.taskManage.state"
            @open-replace-res-confirm-dialog="resourceReplaceConfirmState = true"
          />
          <settings v-if="pageStatesStore.pageStates.settings.state" :state="pageStatesStore.pageStates.settings" />
          <site-manage v-if="pageStatesStore.pageStates.siteManage.state" />
          <guide-page v-if="pageStatesStore.pageStates.guide.state" />
          <developing v-if="pageStatesStore.pageStates.developing.state" />
          <test v-if="pageStatesStore.pageStates.test.state" />
        </div>
      </el-main>
    </el-container>
    <notification-list class="main-background-task z-layer-3" :state="notificationListState" />
    <explain-path v-model:state="showExplainPath" width="80%" :string-to-explain="pathWaitingExplain" :close-on-click-modal="false" />
    <task-queue-resource-replace-confirm-dialog
      v-model:state="resourceReplaceConfirmState"
      v-model:confirm-list="resourceReplaceConfirmList"
    />
    <transaction-test v-model="showTestDialog"></transaction-test>
    <el-tour
      v-model="useTourStatesStore().tourStates.guideMenuTour"
      :scroll-into-view-options="true"
      :mask="false"
      @finish="useTourStatesStore().tourStates.getCallback('guideMenuTour')"
    >
      <el-tour-step
        :target="guideButton?.$el"
        title="向导"
        description="后续可以点击这里进入向导页面"
        placement="right"
      ></el-tour-step>
    </el-tour>
    <el-tour
      v-model="useTourStatesStore().tourStates.taskMenuTour"
      :scroll-into-view-options="true"
      @finish="useTourStatesStore().tourStates.getCallback('taskMenuTour')"
    >
      <el-tour-step :target="taskButton?.$el" title="任务向导" description="点击这里进入任务页面"></el-tour-step>
    </el-tour>
  </div>
</template>

<style>
.ui {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 100%;
  background-color: #fafafa;
}
.close-subpage-button {
  display: flex;
  justify-content: end;
  align-items: end;
  background-color: var(--el-color-danger);
  cursor: pointer;
  position: absolute;
  left: -65px;
  top: -65px;
  width: 100px;
  height: 100px;
  pointer-events: visibleFill;
  clip-path: circle(50px);
  transition: 0.3s;
}
.close-subpage-button:hover {
  left: -55px;
  top: -55px;
  background-color: var(--el-color-danger-light-3);
}
.close-subpage-button-hide {
  left: -100px;
  top: -100px;
}
.close-subpage-button-icon {
  width: 25%;
  height: 25%;
  color: #fafafa;
  margin-right: 12%;
  margin-bottom: 12%;
}
.main-background-task {
  align-self: center;
  height: 85%;
}
.aside-side-menu {
  height: 100%;
}
.main-page {
  display: flex;
  flex-direction: column;
  height: calc(100% - 3px);
  width: calc(100% - 3px);
  margin-left: 3px;
  margin-top: 3px;
}
.main-page-searchbar {
  height: 33px;
  width: 100%;
}
.main-page-works-space {
  position: relative;
  display: flex;
  flex-direction: column;
  height: calc(100% - 33px);
  margin-right: 8px;
}
.main-page-works-grid {
  margin-right: 19px;
}
.works-grid-load-more {
  position: absolute;
  bottom: 0;
  width: 100%;
  transition:
    height 0.3s ease,
    padding 0.3s ease,
    background-color 0.3s ease;
  overflow: hidden;
  color: var(--el-color-info);
  font-weight: bold;
  border-radius: 5px;
  background-color: var(--el-color-info-light-9);
  text-align: center;
  cursor: pointer;
}
.works-grid-load-more:hover {
  background-color: var(--el-color-info-light-7);
}
.works-grid-show-load-more {
  height: 26px;
}
.works-grid-hide-load-more {
  height: 0;
  padding-top: 0;
  padding-bottom: 0;
}
.main-page-auto-load-tag-select {
  height: 33px;
  width: 100%;
  position: relative;
}
.main-page-auto-load-tag-select-tag-type-checkbox-group {
  display: flex;
  flex-direction: column;
}
.main-page-auto-load-tag-select-tag-type-checkbox {
  padding: 0 7px 0 6px;
  border-radius: 15px;
}
.main-page-auto-load-tag-select-tag-type-checkbox-local-tag {
  background-color: rgb(133.4, 206.2, 97.4, 30%);
  color: rgb(78.1, 141.8, 46.6, 75%);
}
.main-page-auto-load-tag-select-tag-type-checkbox-site-tag {
  background-color: rgb(64, 158, 255, 25%);
  color: rgb(64, 158, 255, 85%);
}
.main-page-auto-load-tag-select-tag-type-checkbox-local-author {
  background-color: rgb(245, 108, 108, 25%);
  color: rgb(245, 108, 108, 75%);
}
.main-page-auto-load-tag-select-tag-type-checkbox-site-author {
  background-color: rgb(164, 158, 255, 25%);
  color: rgb(164, 158, 255, 95%);
}
.subPage {
  width: 100%;
  height: 100%;
}
</style>
