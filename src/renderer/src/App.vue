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
import Test from '@renderer/components/subpage/Test.vue'
import SideMenu from './components/common/SideMenu.vue'
import { Close, Coordinate, Link, List, Setting, Star, User } from '@element-plus/icons-vue'
import WorksArea from './components/common/WorksArea.vue'
import ApiUtil from './utils/ApiUtil'
import Page from './model/util/Page.ts'
import SelectItem from './model/util/SelectItem.ts'
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
import NotificationList from '@renderer/components/common/NotificationList.vue'
import WorksFullDTO from '@renderer/model/main/dto/WorksFullDTO.ts'
import { PageState } from '@renderer/constants/PageState.ts'
import SiteAuthorManage from '@renderer/components/subpage/SiteAuthorManage.vue'
import { usePageStatesStore } from '@renderer/store/UsePageStatesStore.ts'
import TaskQueueResourceReplaceConfirmDialog from '@renderer/components/dialogs/TaskQueueResourceReplaceConfirmDialog.vue'

// onMounted
onMounted(() => {
  // const request = apis.worksQueryPage()
  // console.log(request)
  resizeObserver.observe(worksAreaRef.value.$el)
  window.addEventListener('keyup', handleKeyUp)
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
  searchQueryWorksPage: window.api.searchQueryWorksPage
}
// sideMenu组件的实例
const sideMenuRef = ref()
// main-page-works-space的实例
const worksSpace = ref()
// worksArea组件的实例
const worksAreaRef = ref()
const pageStatesStore = usePageStatesStore()
const selectedTagList: Ref<UnwrapRef<SelectItem[]>> = ref([]) // 主搜索栏选中列表
const autoLoadInput: Ref<UnwrapRef<string | undefined>> = ref()
const worksList: Ref<UnwrapRef<WorksFullDTO[]>> = ref([]) // 需展示的作品列表
// 副页面名称
// 查询参数类型
const searchConditionType: Ref<UnwrapRef<SearchType[] | undefined>> = ref()
// 作品分页
const worksPage: Ref<UnwrapRef<Page<SearchCondition[], WorksFullDTO>>> = ref(new Page<SearchCondition[], WorksFullDTO>())
// 搜索栏折叠面板开关
const searchBarPanelState: Ref<boolean> = ref(false)
// 后台任务列表开关
const backgroundTaskState: Ref<boolean> = ref(false)
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
function handleKeyUp(event) {
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
// 加载下一页
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
      <el-aside class="z-layer-4" width="auto" style="overflow: visible">
        <!-- 为了不被TagManage中的SearchToolbar的3层z轴遮挡，此处为4层z轴 -->
        <side-menu ref="sideMenuRef" class="aside-side-menu" width="160px" fold-width="64px" :default-active="['0']">
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
              <el-icon><List /></el-icon>
            </el-menu-item>
            <el-menu-item index="6" @click="showSubpage(pageStatesStore.pageStates.pluginManage)">
              <template #title>插件</template>
              <el-icon><TakeawayBox /></el-icon>
            </el-menu-item>
            <el-menu-item index="7" @click="showSubpage(pageStatesStore.pageStates.settings)">
              <template #title>设置</template>
              <el-icon><Setting /></el-icon>
            </el-menu-item>
            <el-menu-item index="8" @click="showSubpage(pageStatesStore.pageStates.test)">
              <template #title>测试按钮</template>
              <el-icon><Coordinate /></el-icon>
            </el-menu-item>
          </template>
        </side-menu>
      </el-aside>
      <el-main style="padding: 0">
        <div v-show="pageStatesStore.pageStates.mainPage.state" class="main-page">
          <div class="main-page-searchbar">
            <el-row>
              <el-col style="display: flex; justify-content: center; transition: width 1s ease" :span="3">
                <el-select
                  v-model="searchConditionType"
                  multiple
                  collapse-tags
                  collapse-tags-tooltip
                  clearable
                  placeholder="查询参数类型"
                >
                  <el-option-group>
                    <el-option :value="SearchType.LOCAL_TAG" label="本地标签"></el-option>
                    <el-option :value="SearchType.SITE_TAG" label="站点标签"></el-option>
                    <el-option :value="SearchType.LOCAL_AUTHOR" label="本地作者"></el-option>
                    <el-option :value="SearchType.SITE_AUTHOR" label="站点作者"></el-option>
                  </el-option-group>
                </el-select>
              </el-col>
              <el-col :span="19">
                <div class="main-page-auto-load-tag-select z-layer-3">
                  <auto-load-tag-select
                    v-model:data="selectedTagList"
                    v-model:input="autoLoadInput"
                    :load="querySearchItemPage"
                    :page-size="50"
                    tags-gap="10px"
                    max-height="300px"
                    min-height="33px"
                  />
                  <collapse-panel v-model:state="searchBarPanelState" border-radios="10px">
                    <div style="padding: 5px; background-color: var(--el-fill-color-blank)">
                      <el-button @click="handleTest"> test </el-button>
                    </div>
                  </collapse-panel>
                </div>
              </el-col>
              <el-col style="display: flex; justify-content: center" :span="2">
                <el-button @click="queryWorksPage(false)">搜索</el-button>
              </el-col>
            </el-row>
          </div>
          <div ref="worksSpace" class="main-page-works-space">
            <el-scrollbar v-el-scrollbar-bottomed="() => queryWorksPage(true)">
              <works-area ref="worksAreaRef" class="main-page-works-area" :works-list="worksList"></works-area>
            </el-scrollbar>
            <span
              ref="loadMoreButton"
              :class="{
                'works-area-load-more': true,
                'works-area-show-load-more': loadMore,
                'works-area-hide-load-more': !loadMore
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
          <developing v-if="pageStatesStore.pageStates.developing.state" />
          <test v-if="pageStatesStore.pageStates.test.state" />
        </div>
      </el-main>
    </el-container>
    <notification-list class="main-background-task z-layer-3" :state="backgroundTaskState" />
    <explain-path v-model:state="showExplainPath" width="80%" :string-to-explain="pathWaitingExplain" :close-on-click-modal="false" />
    <task-queue-resource-replace-confirm-dialog
      v-model:state="resourceReplaceConfirmState"
      v-model:confirm-list="resourceReplaceConfirmList"
    />
    <transaction-test v-model="showTestDialog"></transaction-test>
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
.main-page-works-area {
  margin-right: 19px;
}
.works-area-load-more {
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
.works-area-load-more:hover {
  background-color: var(--el-color-info-light-7);
}
.works-area-show-load-more {
  height: 26px;
}
.works-area-hide-load-more {
  height: 0;
  padding-top: 0;
  padding-bottom: 0;
}
.main-page-auto-load-tag-select {
  height: 33px;
  position: relative;
}
.subPage {
  width: 100%;
  height: 100%;
}
</style>
