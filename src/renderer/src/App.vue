<script setup lang="ts">
import { reactive, Ref, ref, UnwrapRef } from 'vue'
import TagManage from './CloseablePage/TagManage.vue'
import SideMenuHorizontal from './components/SideMenuHorizontal.vue'
import { CollectionTag } from '@element-plus/icons-vue'

// 变量
let loading = false // 主菜单栏加载中开关
const selectedList = ref() // 主搜索栏选中列表
const tagSelectList = ref() // 主搜索栏选择项列表
const pageState = reactive({
  mainPage: true,
  floatPage: false,
  showTagManagePage: false
}) // 悬浮页面开关
const sideMenuMode: Ref<UnwrapRef<'horizontal' | 'vertical'>> = ref('vertical') // 侧边菜单水平还是垂直

// 方法
async function getTagSelectList(keyword) {
  loading = true
  try {
    const params = { keyword: keyword }
    tagSelectList.value = await window.api.localTagGetSelectList(params)
  } catch (e) {
    console.log(e)
  } finally {
    loading = false
  }
}

function showFloatPage(pageName) {
  pageState.floatPage = true
  pageState.mainPage = false
  switch (pageName) {
    case 'TagManage':
      pageState.showTagManagePage = true
      break
  }
}

function closeFloatPage() {
  Object.keys(pageState).forEach((key) => {
    pageState[key] = false
  })
  pageState.mainPage = true
}
</script>

<template>
  <div class="ui">
    <div class="sideMenu z-layer-2">
      <SideMenuHorizontal :menu-mode="sideMenuMode">
        <template #default>
          <el-sub-menu index="1">
            <template #title>
              <el-icon><CollectionTag /></el-icon>
              <span>标签</span>
            </template>
            <el-menu-item index="1-1" @click="showFloatPage('TagManage')">本地标签</el-menu-item>
            <el-menu-item index="1-2">站点标签</el-menu-item>
          </el-sub-menu>
          <el-sub-menu index="2"></el-sub-menu>
          <el-sub-menu index="3"></el-sub-menu>
        </template>
      </SideMenuHorizontal>
    </div>
    <div class="mainSpace">
      <div v-show="pageState.mainPage" class="mainSpace-wrapper inset-box-centering">
        <div class="mainSpace-searchbar">
          <el-select
            v-model="selectedList"
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
              :value="item.value"
            ></el-option>
          </el-select>
        </div>
        <div class="mainSpace-works-space"></div>
      </div>
      <div v-if="pageState.floatPage" class="floatPage">
        <TagManage
          v-if="pageState.showTagManagePage"
          @close-float-page="closeFloatPage"
        ></TagManage>
      </div>
    </div>
  </div>
</template>

<style>
.ui {
  display: flex;
  width: 100%;
  height: 100%;
}
.mainSpace {
  width: 100%;
  height: 100%;
  flex-grow: 1;
  background: ivory;
}
.floatPage {
  width: 100%;
  height: 100%;
}
.sideMenu {
  height: 100%;
}
.mainSpace-searchbar {
  width: 100%;
}
.mainSpace-works-space {
  width: 100%;
}
</style>
