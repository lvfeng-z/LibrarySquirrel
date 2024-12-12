<script setup lang="ts">
import { onMounted, reactive, Ref, ref, UnwrapRef } from 'vue'
import LocalAuthorManage from '@renderer/components/subpage/LocalAuthorManage.vue'
import LocalTagManage from '@renderer/components/subpage/LocalTagManage.vue'
import Settings from '@renderer/components/subpage/Settings.vue'
import TaskManage from '@renderer/components/subpage/TaskManage.vue'
import SideMenu from './components/common/SideMenu.vue'
import { CollectionTag, Link, List, Setting, Star, User } from '@element-plus/icons-vue'
import WorksDisplayArea from './components/common/WorksDisplayArea.vue'
import ApiUtil from './utils/ApiUtil'
import Page from './model/util/Page.ts'
import SelectItem from './model/util/SelectItem.ts'
import WorksQueryDTO from './model/main/queryDTO/WorksQueryDTO.ts'
import WorksDTO from './model/main/dto/WorksDTO.ts'
import ExplainPath from './components/dialogs/ExplainPath.vue'
import ApiResponse from './model/util/ApiResponse.ts'
import TransactionTest from './test/transaction-test.vue'
import { arrayNotEmpty, isNullish, notNullish } from './utils/CommonUtil'
import CollapsePanel from '@renderer/components/common/CollapsePanel.vue'
import SearchConditionQueryDTO from '@renderer/model/main/queryDTO/SearchConditionQueryDTO.ts'
import { SearchType } from '@renderer/model/util/SearchCondition.ts'
import BaseQueryDTO from '@renderer/model/main/queryDTO/BaseQueryDTO.ts'
import SiteTagDTO from '@renderer/model/main/dto/SiteTagDTO.ts'
import IPage from '@renderer/model/util/IPage.ts'
import AutoLoadTagSelect from '@renderer/components/common/AutoLoadTagSelect.vue'

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
// const params: Ref<UnwrapRef<object>> = ref({})
const selectedTagList: Ref<UnwrapRef<SelectItem[]>> = ref([]) // 主搜索栏选中列表
const tagSelectList: Ref<UnwrapRef<SelectItem[]>> = ref([]) // 主搜索栏选择项列表
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

// 方法
// 查询标签选择列表
async function getSearchItemSelectList(page: IPage<BaseQueryDTO, SelectItem>, input?: string) {
  const query = new SearchConditionQueryDTO()
  query.keyword = input
  page.query = query
  try {
    const response = await apis.searchQuerySearchConditionPage(page)
    if (ApiUtil.check(response)) {
      const data = ApiUtil.data<Map<SearchType, Page<BaseQueryDTO, SelectItem>>>(response)
      const result: SelectItem[] = []
      if (notNullish(data)) {
        const localTagPage = data.get(SearchType.LOCAL_TAG)
        const siteTagPage = data.get(SearchType.SITE_TAG)
        const localAuthorPage = data.get(SearchType.LOCAL_AUTHOR)
        const siteAuthorPage = data.get(SearchType.SITE_AUTHOR)
        if (arrayNotEmpty(localTagPage?.data)) {
          localTagPage.data.forEach((localTag) => {
            localTag.extraData = { id: localTag.value }
            localTag.value = String(SearchType.LOCAL_TAG) + localTag.value
            if (arrayNotEmpty(localTag.subLabels)) {
              localTag.subLabels.unshift('tag', 'local')
            } else {
              localTag.subLabels = ['tag', 'local']
            }
          })
          result.push(...localTagPage.data)
          if (localTagPage.pageCount > page.pageCount) {
            page.pageCount = localTagPage.pageCount
          }
        }
        if (arrayNotEmpty(siteTagPage?.data)) {
          siteTagPage.data.forEach((siteTag) => {
            siteTag.value = String(SearchType.SITE_TAG) + siteTag.value
            if (arrayNotEmpty(siteTag.subLabels)) {
              siteTag.subLabels.unshift('tag')
            } else {
              const siteName = (siteTag.extraData as SiteTagDTO).site?.siteName
              if (notNullish(siteName)) {
                siteTag.subLabels = ['tag', siteName]
              } else {
                siteTag.subLabels = ['tag', '?']
              }
            }
          })
          result.push(...siteTagPage.data)
          if (siteTagPage.pageCount > page.pageCount) {
            page.pageCount = siteTagPage.pageCount
          }
        }
        if (arrayNotEmpty(localAuthorPage?.data)) {
          localAuthorPage.data.forEach((localAuthor) => {
            localAuthor.extraData = { id: localAuthor.value }
            localAuthor.value = String(SearchType.LOCAL_AUTHOR) + localAuthor.value
            if (arrayNotEmpty(localAuthor.subLabels)) {
              localAuthor.subLabels.unshift('author', 'local')
            } else {
              localAuthor.subLabels = ['author', 'local']
            }
          })
          result.push(...localAuthorPage.data)
          if (localAuthorPage.pageCount > page.pageCount) {
            page.pageCount = localAuthorPage.pageCount
          }
        }
        if (arrayNotEmpty(siteAuthorPage?.data)) {
          siteAuthorPage.data.forEach((siteAuthor) => {
            siteAuthor.value = String(SearchType.SITE_AUTHOR) + siteAuthor.value
            if (arrayNotEmpty(siteAuthor.subLabels)) {
              siteAuthor.subLabels.unshift('author')
            } else {
              siteAuthor.subLabels = ['author']
            }
          })
          result.push(...siteAuthorPage.data)
          if (siteAuthorPage.pageCount > page.pageCount) {
            page.pageCount = siteAuthorPage.pageCount
          }
        }
      }
      tagSelectList.value = result
      page.data = result
    }
    return page
  } catch (e) {
    console.log(e)
    return page
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
        if (tag.state === undefined || tag.state) {
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
        if (tag.state === undefined || tag.state) {
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
    <!-- 为了不被TagManage中的SearchToolbar的3层z轴遮挡，此处为4层z轴 -->
    <side-menu class="sideMenu z-layer-4" :default-active="['1-1']">
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
      </template>
    </side-menu>
    <div class="mainSpace">
      <div v-show="pageState.mainPage" class="mainPage margin-box">
        <div class="mainPage-searchbar">
          <el-row>
            <el-col style="display: flex; justify-content: center" :span="1">
              <el-button @click="handleTest">-</el-button>
            </el-col>
            <el-col :span="21">
              <!--              <auto-load-select-->
              <!--                :load="getSearchItemSelectList"-->
              <!--                v-model="selectedTagList"-->
              <!--                multiple-->
              <!--                filterable-->
              <!--                remote-->
              <!--                collapse-tags-->
              <!--                collapse-tags-tooltip-->
              <!--                clearable-->
              <!--                :loading="loading"-->
              <!--                :max-collapse-tags="3"-->
              <!--                param-name="keyword"-->
              <!--              >-->
              <!--              </auto-load-select>-->
              <auto-load-tag-select style="height: 100%" :load="getSearchItemSelectList"></auto-load-tag-select>
              <collapse-panel class="z-layer-3">
                <div style="padding: 5px; background-color: #fafafa">
                  <el-button> test </el-button>
                </div>
              </collapse-panel>
            </el-col>
            <el-col style="display: flex; justify-content: center" :span="2">
              <el-button @click="requestWorks">搜索</el-button>
            </el-col>
          </el-row>
        </div>
        <works-display-area class="mainPage-works-space" :works-list="imageList"></works-display-area>
      </div>
      <div v-if="pageState.subpage" class="subPage">
        <local-tag-manage v-if="pageState.showTagManagePage" @close-self="closeSubpage" />
        <local-author-manage v-if="pageState.showLocalAuthorManagePage" @close-self="closeSubpage" />
        <task-manage v-if="pageState.showTaskManagePage" @close-self="closeSubpage" />
        <settings v-if="pageState.showSettingsPage" @close-self="closeSubpage" />
      </div>
    </div>
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
}
.mainSpace {
  max-width: calc(100% - 63px);
  height: 100%;
  flex-grow: 1;
  background: #fafafa;
}
.sideMenu {
  height: 100%;
}
.mainPage {
  display: flex;
  flex-direction: column;
}
.mainPage-searchbar {
  width: 100%;
}
.mainPage-works-space {
  width: 100%;
  height: 100%;
}
.subPage {
  width: 100%;
  height: 100%;
}
</style>
