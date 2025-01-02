<script setup lang="ts">
import { onMounted, reactive, Ref, ref, UnwrapRef } from 'vue'
import LocalAuthorManage from '@renderer/components/subpage/LocalAuthorManage.vue'
import LocalTagManage from '@renderer/components/subpage/LocalTagManage.vue'
import Settings from '@renderer/components/subpage/Settings.vue'
import TaskManage from '@renderer/components/subpage/TaskManage.vue'
import SideMenu from './components/common/SideMenu.vue'
import { CollectionTag, Coordinate, Link, List, Setting, Star, User } from '@element-plus/icons-vue'
import WorksDisplayArea from './components/common/WorksDisplayArea.vue'
import ApiUtil from './utils/ApiUtil'
import Page from './model/util/Page.ts'
import SelectItem from './model/util/SelectItem.ts'
import WorksQueryDTO from './model/main/queryDTO/WorksQueryDTO.ts'
import WorksDTO from './model/main/dto/WorksDTO.ts'
import ExplainPath from './components/dialogs/ExplainPath.vue'
import ApiResponse from './model/util/ApiResponse.ts'
import TransactionTest from './test/transaction-test.vue'
import { isNullish, notNullish } from './utils/CommonUtil'
import CollapsePanel from '@renderer/components/common/CollapsePanel.vue'
import SearchConditionQueryDTO from '@renderer/model/main/queryDTO/SearchConditionQueryDTO.ts'
import BaseQueryDTO from '@renderer/model/main/queryDTO/BaseQueryDTO.ts'
import IPage from '@renderer/model/util/IPage.ts'
import AutoLoadTagSelect from '@renderer/components/common/AutoLoadTagSelect.vue'
import { SearchCondition, SearchType } from '@renderer/model/util/SearchCondition.ts'
import lodash from 'lodash'
import { CrudOperator } from '@renderer/constants/CrudOperator.ts'
import StringUtil from '@renderer/utils/StringUtil.ts'
import GotoPage from '@renderer/components/dialogs/GotoPage.vue'

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
  searchQueryWorksPage: window.api.searchQueryWorksPage,
  worksMultipleConditionQueryPage: window.api.worksMultipleConditionQueryPage
}
// sideMenu组件的实例
const sideMenuRef = ref()
// 悬浮页面开关
const pageState = reactive({
  mainPage: true,
  subpage: false,
  showTagManagePage: false,
  showLocalAuthorManagePage: false,
  showTaskManagePage: false,
  showSettingsPage: false
})
const selectedTagList: Ref<UnwrapRef<SelectItem[]>> = ref([]) // 主搜索栏选中列表
const autoLoadInput: Ref<UnwrapRef<string | undefined>> = ref()
const imageList: Ref<UnwrapRef<WorksDTO[]>> = ref([]) // 需展示的作品列表
const showExplainPath = ref(false) // 解释路径对话框的开关
const showGotoPage = ref(false) // 页面跳转对话框的开关
const gotoPageProps = ref({ title: '', content: '', buttonText: '' })
const pathWaitingExplain: Ref<UnwrapRef<string>> = ref('') // 需要解释含义的路径
// 副页面名称
type subpages = 'TagManage' | 'LocalAuthorManage' | 'TaskManage' | 'Settings' | ''
// 查询参数类型
const searchConditionType: Ref<UnwrapRef<SearchType[] | undefined>> = ref()
// 设置页面向导配置
const settingsPageTourStates: Ref<UnwrapRef<{ workdir: boolean }>> = ref({ workdir: false })

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
    if (isNullish(newPage)) {
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
function showSubpage(pageName: subpages) {
  closeSubpage()
  pageState.subpage = true
  pageState.mainPage = false
  switch (pageName) {
    case 'TagManage':
      pageState.showTagManagePage = true
      break
    case 'LocalAuthorManage':
      pageState.showLocalAuthorManagePage = true
      break
    case 'TaskManage':
      pageState.showTaskManagePage = true
      break
    case 'Settings':
      pageState.showSettingsPage = true
      break
  }
}
// 关闭副页面
function closeSubpage() {
  Object.keys(pageState).forEach((key) => (pageState[key] = false))
  pageState.mainPage = true
}
// 请求作品接口
async function searchWorks() {
  const page = new Page<SearchCondition[], WorksDTO>()
  page.pageSize = 100

  // 处理搜索框的标签
  page.query = selectedTagList.value
    .map((searchCondition) => {
      let operator: CrudOperator | undefined = undefined
      if (notNullish(searchCondition.disabled) && searchCondition.disabled) {
        operator = CrudOperator.NOT_EQUAL
      }
      if (notNullish(searchCondition.extraData)) {
        const extraData = searchCondition.extraData as { type: SearchType; id: number }
        return new SearchCondition({ type: extraData.type, value: extraData.id, operator: operator })
      } else {
        return undefined
      }
    })
    .filter(notNullish)
  if (StringUtil.isNotBlank(autoLoadInput.value)) {
    const worksName = autoLoadInput.value
    if (isNullish(page.query)) {
      page.query = []
    }
    let tempCondition = new SearchCondition({ type: SearchType.WORKS_SITE_NAME, value: worksName, operator: CrudOperator.LIKE })
    page.query.push(tempCondition)
    tempCondition = new SearchCondition({ type: SearchType.WORKS_NICKNAME, value: worksName, operator: CrudOperator.LIKE })
    page.query.push(tempCondition)
  }

  apis.searchQueryWorksPage(page).then((response: ApiResponse) => {
    if (ApiUtil.check(response)) {
      const page = ApiUtil.data<Page<WorksQueryDTO, WorksDTO>>(response)
      if (notNullish(page)) {
        const works = page.data
        imageList.value = isNullish(works) ? [] : works
      }
    }
  })
}

// 监听
window.electron.ipcRenderer.on('explain-path-request', (_event, dir) => {
  showExplainPath.value = true
  pathWaitingExplain.value = dir
})
window.electron.ipcRenderer.on('goto-page', (_event, config) => {
  gotoPageProps.value.title = config.title
  gotoPageProps.value.content = config.content
  gotoPageProps.value.buttonText = config.buttonText
  showGotoPage.value = true
})

// test
const showTestDialog = ref(false)
async function handleTest() {
  apis.testMainWindowMsgTest()
  // showExplainPath.value = true
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
              <el-menu-item index="1-1" @click="showSubpage('TagManage')">本地标签</el-menu-item>
              <el-menu-item index="1-2">站点标签</el-menu-item>
            </el-sub-menu>
            <el-sub-menu index="2">
              <template #title>
                <el-icon><User /></el-icon>
                <span>作者</span>
              </template>
              <el-menu-item index="2-1" @click="showSubpage('LocalAuthorManage')"> 本地作者 </el-menu-item>
              <el-menu-item index="2-2">站点作者</el-menu-item>
            </el-sub-menu>
            <el-menu-item index="3">
              <template #title>收藏</template>
              <el-icon><Star /></el-icon>
            </el-menu-item>
            <el-menu-item index="4" @click="showSubpage('Settings')">
              <template #title>站点</template>
              <el-icon><Link /></el-icon>
            </el-menu-item>
            <el-sub-menu index="5">
              <template #title>
                <el-icon><List /></el-icon>
                <span>任务</span>
              </template>
              <el-menu-item index="5-1" @click="showSubpage('TaskManage')">任务管理</el-menu-item>
            </el-sub-menu>
            <el-menu-item index="6" @click="showSubpage('Settings')">
              <template #title>设置</template>
              <el-icon><Setting /></el-icon>
            </el-menu-item>
            <el-menu-item index="7" @click="handleTest">
              <template #title>TEST</template>
              <el-icon><Coordinate /></el-icon>
            </el-menu-item>
          </template>
        </side-menu>
      </el-aside>
      <el-main style="padding: 1px 5px 5px 5px">
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
                  <collapse-panel>
                    <div style="padding: 5px; background-color: var(--el-fill-color-blank)">
                      <el-button> test </el-button>
                    </div>
                  </collapse-panel>
                </div>
              </el-col>
              <el-col style="display: flex; justify-content: center" :span="2">
                <el-button @click="searchWorks">搜索</el-button>
              </el-col>
            </el-row>
          </div>
          <works-display-area class="main-page-works-space" :works-list="imageList"></works-display-area>
        </div>
        <div v-if="pageState.subpage" class="subPage">
          <local-tag-manage v-if="pageState.showTagManagePage" @close-self="closeSubpage" />
          <local-author-manage v-if="pageState.showLocalAuthorManagePage" @close-self="closeSubpage" />
          <task-manage v-if="pageState.showTaskManagePage" @close-self="closeSubpage" />
          <settings v-if="pageState.showSettingsPage" v-model:tour-states="settingsPageTourStates" @close-self="closeSubpage" />
        </div>
      </el-main>
    </el-container>
    <explain-path v-model:state="showExplainPath" width="80%" :string-to-explain="pathWaitingExplain" :close-on-click-modal="false" />
    <goto-page
      v-model:state="showGotoPage"
      width="80%"
      :close-on-click-modal="false"
      :title="gotoPageProps.title"
      :content="gotoPageProps.content"
      :button-text="gotoPageProps.buttonText"
      :button-click="
        () => {
          settingsPageTourStates.workdir = true
          showSubpage('Settings')
        }
      "
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
.main-page {
  display: flex;
  flex-direction: column;
}
.main-page-searchbar {
  width: 100%;
}
.main-page-works-space {
  width: 100%;
  height: 100%;
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
