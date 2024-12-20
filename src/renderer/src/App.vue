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
import { SearchType } from '@renderer/model/util/SearchCondition.ts'
import lodash from 'lodash'

// onMounted
onMounted(() => {
  // const request = apis.worksQueryPage()
  // console.log(request)
})

// 变量
// 接口
const apis = {
  test: window.api.localAuthorListSelectItems,
  testPLimitTest: window.api.testPLimitTest,
  localTagListSelectItems: window.api.localTagListSelectItems,
  searchQuerySearchConditionPage: window.api.searchQuerySearchConditionPage,
  worksQueryPage: window.api.worksQueryPage,
  worksMultipleConditionQueryPage: window.api.worksMultipleConditionQueryPage
}
// sideMenu组件的实例
const sideMenuRef = ref()
const selectedTagList: Ref<UnwrapRef<SelectItem[]>> = ref([]) // 主搜索栏选中列表
const pageState = reactive({
  mainPage: true,
  subpage: false,
  showTagManagePage: false,
  showLocalAuthorManagePage: false,
  showTaskManagePage: false,
  showSettingsPage: false
}) // 悬浮页面开关
const imageList: Ref<UnwrapRef<WorksDTO[]>> = ref([]) // 需展示的作品列表
const showExplainPath = ref(false) // 解释路径dialog的开关
const pathWaitingExplain: Ref<UnwrapRef<string>> = ref('') // 需要解释含义的路径
// 副页面名称
type subpages = 'TagManage' | 'LocalAuthorManage' | 'TaskManage' | 'Settings' | ''
// 查询参数类型
const searchConditionType: Ref<UnwrapRef<SearchType[] | undefined>> = ref()

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
async function requestWorks() {
  const page = new Page<WorksQueryDTO, WorksDTO>()
  page.query = new WorksQueryDTO()
  page.pageSize = 100

  // 处理搜索框的标签
  selectedTagList.value.forEach((tag) => {
    if (tag.extraData !== undefined && tag.extraData !== null && Object.prototype.hasOwnProperty.call(tag.extraData, 'tagType')) {
      if (isNullish(page.query)) {
        return
      }
      // 如果extraData存储的tagType为true，则此标签是本地标签，否则是站点标签，
      if (tag.extraData['tagType']) {
        // 根据标签状态判断是包含此标签还是排除此标签
        if (tag.disabled === undefined || tag.disabled) {
          if (isNullish(page.query.includeLocalTagIds)) {
            page.query.includeLocalTagIds = []
          }
          ;(page.query.includeLocalTagIds as (string | number)[]).push(tag.value)
        } else {
          if (isNullish(page.query.excludeLocalTagIds)) {
            page.query.excludeLocalTagIds = []
          }
          ;(page.query.excludeLocalTagIds as (string | number)[]).push(tag.value)
        }
      } else {
        // 根据标签状态判断是包含此标签还是排除此标签
        if (tag.disabled === undefined || tag.disabled) {
          if (isNullish(page.query.includeSiteTagIds)) {
            page.query.includeSiteTagIds = []
          }
          ;(page.query.includeSiteTagIds as (string | number)[]).push(tag.value)
        } else {
          if (isNullish(page.query.excludeSiteTagIds)) {
            page.query.excludeSiteTagIds = []
          }
          ;(page.query.excludeSiteTagIds as (string | number)[]).push(tag.value)
        }
      }
    }
  })

  apis.worksQueryPage(page).then((response: ApiResponse) => {
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

// test
const showTestDialog = ref(false)
async function handleTest() {
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
              <el-col :span="22">
                <div class="main-page-auto-load-tag-select z-layer-3">
                  <auto-load-tag-select
                    :load="querySearchItemPage"
                    :page-size="50"
                    tags-gap="10px"
                    max-height="300px"
                    min-height="33px"
                  />
                  <collapse-panel>
                    <div style="padding: 5px">
                      <el-button> test </el-button>
                    </div>
                  </collapse-panel>
                </div>
              </el-col>
              <el-col style="display: flex; justify-content: center" :span="2">
                <el-button @click="requestWorks">搜索</el-button>
              </el-col>
            </el-row>
          </div>
          <works-display-area class="main-page-works-space" :works-list="imageList"></works-display-area>
        </div>
        <div v-if="pageState.subpage" class="subPage">
          <local-tag-manage v-if="pageState.showTagManagePage" @close-self="closeSubpage" />
          <local-author-manage v-if="pageState.showLocalAuthorManagePage" @close-self="closeSubpage" />
          <task-manage v-if="pageState.showTaskManagePage" @close-self="closeSubpage" />
          <settings v-if="pageState.showSettingsPage" @close-self="closeSubpage" />
        </div>
      </el-main>
    </el-container>
    <explain-path
      v-model:state="showExplainPath"
      width="80%"
      :string-to-explain="pathWaitingExplain"
      :close-on-click-modal="false"
    ></explain-path>
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
