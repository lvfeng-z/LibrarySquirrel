<script setup lang="ts">
import { onMounted, reactive, Ref, ref, UnwrapRef } from 'vue'
import LocalTagManage from './components/closeablePage/LocalTagManage.vue'
import SideMenu from './components/common/SideMenu.vue'
import { CollectionTag, Link, List, Setting, Star, User } from '@element-plus/icons-vue'
import Settings from './components/closeablePage/Settings.vue'
import WorksDisplayArea from './components/common/WorksDisplayArea.vue'
import ApiUtil from './utils/ApiUtil'
import PageModel from './model/util/PageModel'
import DoubleCheckTag from './components/common/DoubleCheckTag.vue'
import SelectItem from './model/util/SelectItem.ts'
import WorksQueryDTO from './model/main/queryDTO/WorksQueryDTO.ts'
import WorksDTO from './model/main/dto/WorksDTO.ts'
import TaskManage from './components/closeablePage/TaskManage.vue'
import ExplainPath from './components/dialogs/ExplainPath.vue'
import ApiResponse from './model/util/ApiResponse.ts'
import TransactionTest from './test/transaction-test.vue'
import LocalAuthorManage from './components/closeablePage/LocalAuthorManage.vue'
import { isNullish } from './utils/CommonUtil'

// onMounted
onMounted(() => {
  // const request = apis.worksQueryPage()
  // console.log(request)
})
// 变量
// 接口
const apis = {
  test: window.api.localAuthorGetSelectItems,
  testPLimitTest: window.api.testPLimitTest,
  localTagGetSelectList: window.api.localTagGetSelectList,
  worksQueryPage: window.api.worksQueryPage
}
let loading = false // 主菜单栏加载中开关
const selectedTagList: Ref<UnwrapRef<SelectItem[]>> = ref([]) // 主搜索栏选中列表
const tagSelectList: Ref<UnwrapRef<SelectItem[]>> = ref([]) // 主搜索栏选择项列表
const pageState = reactive({
  mainPage: true,
  closeablePage: false,
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
async function getTagSelectList(keyword) {
  loading = true
  try {
    const params = { keyword: keyword }
    const response = await apis.localTagGetSelectList(params)
    if (ApiUtil.apiResponseCheck(response)) {
      tagSelectList.value = ApiUtil.apiResponseGetData(response) as SelectItem[]
    }
  } catch (e) {
    console.log(e)
  } finally {
    loading = false
  }
}
// 开启副页面
function showFloatPage(pageName: subpages) {
  closeFloatPage()
  pageState.closeablePage = true
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
function closeFloatPage() {
  Object.keys(pageState).forEach((key) => (pageState[key] = false))
  pageState.mainPage = true
}
// 请求作品接口
async function requestWorks() {
  const page = new PageModel<WorksQueryDTO, WorksDTO>()
  page.query = new WorksQueryDTO()
  page.pageSize = 100

  // 处理搜索框的标签
  selectedTagList.value.forEach((tag) => {
    if (
      tag.extraData !== undefined &&
      tag.extraData !== null &&
      Object.prototype.hasOwnProperty.call(tag.extraData, 'tagType')
    ) {
      // "page.query !== undefined"是为了保证编译能通过，没有实际意义
      if (page.query === undefined) {
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
    if (ApiUtil.apiResponseCheck(response)) {
      const works = (ApiUtil.apiResponseGetData(response) as PageModel<WorksQueryDTO, WorksDTO>)
        .data
      imageList.value = works === undefined ? [] : works
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
  const a = await apis.testPLimitTest()
  console.log(a)
  // showExplainPath.value = true
  // showTestDialog.value = true
}
</script>

<template>
  <div class="ui">
    <!-- 为了不被TagManage中的SearchToolbar的3层z轴遮挡，此处为4层z轴 -->
    <div class="sideMenu z-layer-4">
      <side-menu :default-active="['1-1']">
        <template #default>
          <el-sub-menu index="1">
            <template #title>
              <el-icon><CollectionTag /></el-icon>
              <span>标签</span>
            </template>
            <el-menu-item index="1-1" @click="showFloatPage('TagManage')">本地标签</el-menu-item>
            <el-menu-item index="1-2">站点标签</el-menu-item>
          </el-sub-menu>
          <el-sub-menu index="2">
            <template #title>
              <el-icon><User /></el-icon>
              <span>作者</span>
            </template>
            <el-menu-item index="2-1" @click="showFloatPage('LocalAuthorManage')">
              本地作者
            </el-menu-item>
            <el-menu-item index="2-2">站点作者</el-menu-item>
          </el-sub-menu>
          <el-menu-item index="3">
            <template #title>收藏</template>
            <el-icon><Star /></el-icon>
          </el-menu-item>
          <el-menu-item index="4" @click="showFloatPage('Settings')">
            <template #title>站点</template>
            <el-icon><Link /></el-icon>
          </el-menu-item>
          <el-sub-menu index="5">
            <template #title>
              <el-icon><List /></el-icon>
              <span>任务</span>
            </template>
            <el-menu-item index="5-1" @click="showFloatPage('TaskManage')">任务管理</el-menu-item>
          </el-sub-menu>
          <el-menu-item index="6" @click="showFloatPage('Settings')">
            <template #title>设置</template>
            <el-icon><Setting /></el-icon>
          </el-menu-item>
        </template>
      </side-menu>
    </div>
    <div class="mainSpace">
      <div v-show="pageState.mainPage" class="mainPage margin-box">
        <div class="mainPage-searchbar">
          <el-row>
            <el-col style="display: flex; justify-content: center" :span="2">
              <el-button @click="handleTest">测试</el-button>
            </el-col>
            <el-col :span="20">
              <el-select
                v-model="selectedTagList"
                multiple
                filterable
                remote
                :remote-method="getTagSelectList"
                :loading="loading"
              >
                <el-option
                  v-for="item in tagSelectList"
                  :key="item.value"
                  :label="item.label"
                  :value="item"
                >
                  <span style="float: left">{{ item.label }}</span>
                  <span
                    style="float: right; color: var(--el-text-color-secondary); font-size: 13px"
                  >
                    {{ item.secondaryLabel }}
                  </span>
                </el-option>
                <template #tag>
                  <double-check-tag
                    v-for="item in selectedTagList"
                    :key="item.value"
                    :item="item"
                  ></double-check-tag>
                </template>
              </el-select>
            </el-col>
            <el-col style="display: flex; justify-content: center" :span="2">
              <el-button @click="requestWorks">搜索</el-button>
            </el-col>
          </el-row>
        </div>
        <works-display-area
          class="mainPage-works-space"
          :works-list="imageList"
        ></works-display-area>
      </div>
      <div v-if="pageState.closeablePage" class="subPage">
        <local-tag-manage v-if="pageState.showTagManagePage" @close-self="closeFloatPage" />
        <local-author-manage
          v-if="pageState.showLocalAuthorManagePage"
          @close-self="closeFloatPage"
        />
        <task-manage v-if="pageState.showTaskManagePage" @close-self="closeFloatPage" />
        <settings v-if="pageState.showSettingsPage" @close-self="closeFloatPage" />
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
  width: 100%;
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
