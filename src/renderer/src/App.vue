<script setup lang="ts">
import { onMounted, reactive, Ref, ref, UnwrapRef } from 'vue'
import LocalAuthorManage from '@renderer/components/subpage/LocalAuthorManage.vue'
import LocalTagManage from '@renderer/components/subpage/LocalTagManage.vue'
import SiteTagManage from '@renderer/components/subpage/SiteTagManage.vue'
import Settings from '@renderer/components/subpage/Settings.vue'
import TaskManage from '@renderer/components/subpage/TaskManage.vue'
import SideMenu from './components/common/SideMenu.vue'
import { CollectionTag, Coordinate, Link, List, Setting, Star, Ticket, User } from '@element-plus/icons-vue'
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
import { ElMessageBox } from 'element-plus'
import Developing from '@renderer/components/subpage/Developing.vue'
import SiteManage from '@renderer/components/subpage/SiteManage.vue'
import PluginManage from '@renderer/components/subpage/PluginManage.vue'
import Test from '@renderer/components/subpage/Test.vue'
import GotoPageConfig from '@renderer/model/util/GotoPageConfig.ts'
import { SubPageEnum } from '@renderer/constants/SubPageEnum.ts'
import MsgList from '@renderer/components/common/MsgList.vue'
import WorksFullDTO from '@renderer/model/main/dto/WorksFullDTO.ts'

// onMounted
onMounted(() => {
  // const request = apis.worksQueryPage()
  // console.log(request)
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
// 悬浮页面开关
const pageState = reactive({
  mainPage: true,
  subpage: false,
  showLocalTagManagePage: false,
  showSiteTagManagePage: false,
  showLocalAuthorManagePage: false,
  showPluginManagePage: false,
  showTaskManagePage: false,
  showSiteManagePage: false,
  showSettingsPage: false,
  showDeveloping: false,
  showTest: false
})
const selectedTagList: Ref<UnwrapRef<SelectItem[]>> = ref([]) // 主搜索栏选中列表
const autoLoadInput: Ref<UnwrapRef<string | undefined>> = ref()
const worksList: Ref<UnwrapRef<WorksFullDTO[]>> = ref([]) // 需展示的作品列表
const showExplainPath = ref(false) // 解释路径对话框的开关
const pathWaitingExplain: Ref<UnwrapRef<string>> = ref('') // 需要解释含义的路径
// 副页面名称
// 查询参数类型
const searchConditionType: Ref<UnwrapRef<SearchType[] | undefined>> = ref()
// 设置页面向导配置
const settingsPageTourStates: Ref<UnwrapRef<{ workdir: boolean }>> = ref({ workdir: false })
// 作品分页
const worksPage: Ref<UnwrapRef<Page<SearchCondition[], WorksFullDTO>>> = ref(new Page<SearchCondition[], WorksFullDTO>())
// 搜索栏折叠面板开关
const searchBarPanelState: Ref<boolean> = ref(false)
//
const subpageProps: Ref<{ siteManageFocusOnSiteDomainId: string[] | undefined }> = ref({
  siteManageFocusOnSiteDomainId: undefined
})
// 后台任务列表开关
const backgroundTaskState: Ref<boolean> = ref(false)

// 方法
// 查询标签选择列表
async function querySearchItemPage(page: IPage<BaseQueryDTO, SelectItem>, input?: string): Promise<IPage<BaseQueryDTO, SelectItem>> {
  const query = new SearchConditionQueryDTO()
  query.keyword = input
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
function showSubpage(pageName: SubPageEnum) {
  closeSubpage()
  pageState.subpage = true
  pageState.mainPage = false
  switch (pageName) {
    case SubPageEnum.LocalTagManage:
      pageState.showLocalTagManagePage = true
      break
    case SubPageEnum.SiteTagManage:
      pageState.showSiteTagManagePage = true
      break
    case SubPageEnum.LocalAuthorManage:
      pageState.showLocalAuthorManagePage = true
      break
    case SubPageEnum.PluginManage:
      pageState.showPluginManagePage = true
      break
    case SubPageEnum.TaskManage:
      pageState.showTaskManagePage = true
      break
    case SubPageEnum.Settings:
      pageState.showSettingsPage = true
      break
    case SubPageEnum.SiteManage:
      pageState.showSiteManagePage = true
      break
    case SubPageEnum.Developing:
      pageState.showDeveloping = true
      break
    case SubPageEnum.Test:
      pageState.showTest = true
      break
  }
}
// 关闭副页面
function closeSubpage() {
  Object.keys(pageState).forEach((key) => (pageState[key] = false))
  pageState.mainPage = true
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

// 监听
window.electron.ipcRenderer.on('explain-path-request', (_event, dir) => {
  showExplainPath.value = true
  pathWaitingExplain.value = dir
})
window.electron.ipcRenderer.on('goto-page', (_event, config: GotoPageConfig) => {
  ElMessageBox.alert(config.content, config.title, config.options).then(() => {
    switch (config.page) {
      case SubPageEnum.Settings:
        settingsPageTourStates.value.workdir = true
        showSubpage(SubPageEnum.Settings)
        break
      case SubPageEnum.SiteManage:
        subpageProps.value.siteManageFocusOnSiteDomainId = config.extraData as string[]
        showSubpage(SubPageEnum.SiteManage)
        break
    }
  })
})

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
    <el-container>
      <el-aside class="z-layer-4" width="auto" style="overflow: visible">
        <!-- 为了不被TagManage中的SearchToolbar的3层z轴遮挡，此处为4层z轴 -->
        <side-menu ref="sideMenuRef" class="sideMenu" width="63px" :default-active="['1-1']">
          <template #default>
            <el-sub-menu index="1">
              <template #title>
                <el-icon><CollectionTag /></el-icon>
                <span>标签</span>
              </template>
              <el-menu-item index="1-1" @click="showSubpage(SubPageEnum.LocalTagManage)">本地标签</el-menu-item>
              <el-menu-item index="1-2" @click="showSubpage(SubPageEnum.SiteTagManage)">站点标签</el-menu-item>
            </el-sub-menu>
            <el-sub-menu index="2">
              <template #title>
                <el-icon><User /></el-icon>
                <span>作者</span>
              </template>
              <el-menu-item index="2-1" @click="showSubpage(SubPageEnum.LocalAuthorManage)"> 本地作者 </el-menu-item>
              <el-menu-item index="2-2" @click="showSubpage(SubPageEnum.Developing)">站点作者</el-menu-item>
            </el-sub-menu>
            <el-menu-item index="3" @click="showSubpage(SubPageEnum.Developing)">
              <template #title>收藏</template>
              <el-icon><Star /></el-icon>
            </el-menu-item>
            <el-menu-item index="4" @click="showSubpage(SubPageEnum.SiteManage)">
              <template #title>站点</template>
              <el-icon><Link /></el-icon>
            </el-menu-item>
            <el-sub-menu index="5">
              <template #title>
                <el-icon><List /></el-icon>
                <span>任务</span>
              </template>
              <el-menu-item index="5-1" @click="showSubpage(SubPageEnum.TaskManage)">任务管理</el-menu-item>
            </el-sub-menu>
            <el-menu-item index="6" @click="showSubpage(SubPageEnum.PluginManage)">
              <template #title>插件</template>
              <el-icon><Ticket /></el-icon>
            </el-menu-item>
            <el-menu-item index="7" @click="showSubpage(SubPageEnum.Settings)">
              <template #title>设置</template>
              <el-icon><Setting /></el-icon>
            </el-menu-item>
            <el-menu-item index="8" @click="showSubpage(SubPageEnum.Test)">
              <template #title>测试按钮</template>
              <el-icon><Coordinate /></el-icon>
            </el-menu-item>
          </template>
        </side-menu>
      </el-aside>
      <el-main style="padding: 0">
        <div v-show="pageState.mainPage" class="main-page margin-box">
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
          <div class="main-page-works-space">
            <el-scrollbar v-el-scrollbar-bottomed="() => queryWorksPage(true)">
              <works-area style="margin-right: 8px" :works-list="worksList"></works-area>
            </el-scrollbar>
          </div>
        </div>
        <div v-if="pageState.subpage" class="subPage">
          <local-tag-manage v-if="pageState.showLocalTagManagePage" @close-self="closeSubpage" />
          <site-tag-manage v-if="pageState.showSiteTagManagePage" @close-self="closeSubpage" />
          <local-author-manage v-if="pageState.showLocalAuthorManagePage" @close-self="closeSubpage" />
          <plugin-manage v-if="pageState.showPluginManagePage" @close-self="closeSubpage" />
          <task-manage v-if="pageState.showTaskManagePage" @close-self="closeSubpage" />
          <settings v-if="pageState.showSettingsPage" v-model:tour-states="settingsPageTourStates" @close-self="closeSubpage" />
          <site-manage
            v-if="pageState.showSiteManagePage"
            :focus-on-domains="subpageProps.siteManageFocusOnSiteDomainId"
            @close-self="closeSubpage"
          />
          <developing v-if="pageState.showDeveloping" @close-self="closeSubpage" />
          <test v-if="pageState.showTest" @close-self="closeSubpage" />
        </div>
      </el-main>
      <msg-list class="main-background-task z-layer-3" :state="backgroundTaskState" />
    </el-container>
    <explain-path v-model:state="showExplainPath" width="80%" :string-to-explain="pathWaitingExplain" :close-on-click-modal="false" />
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
.main-background-task {
  align-self: center;
  height: 85%;
}
.main-page {
  display: flex;
  flex-direction: column;
}
.main-page-searchbar {
  height: 33px;
  width: 100%;
}
.main-page-works-space {
  height: calc(100% - 33px);
  margin-right: 8px;
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
