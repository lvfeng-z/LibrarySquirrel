<script setup lang="ts">
import { reactive, Ref, ref, UnwrapRef } from 'vue'
import TagManage from './closeablePage/TagManage.vue'
import SideMenu from './components/SideMenu.vue'
import { CollectionTag, Link, List, Setting, Star, User } from '@element-plus/icons-vue'

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
    <!-- 为了不被TagManage中的dropdownTable的2层z轴遮挡，此处为3层z轴 -->
    <div class="sideMenu z-layer-3">
      <SideMenu :menu-mode="sideMenuMode" :default-active="['1-1']">
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
            <el-menu-item index="2-1" @click="showFloatPage('TagManage')">本地作者</el-menu-item>
            <el-menu-item index="2-2">站点作者</el-menu-item>
          </el-sub-menu>
          <el-sub-menu index="3">
            <template #title>
              <el-icon><Star /></el-icon>
              <span>兴趣点</span>
            </template>
          </el-sub-menu>
          <el-sub-menu index="4">
            <template #title>
              <el-icon><Link /></el-icon>
              <span>站点</span>
            </template>
          </el-sub-menu>
          <el-sub-menu index="5">
            <template #title>
              <el-icon><List /></el-icon>
              <span>任务</span>
            </template>
          </el-sub-menu>
          <el-sub-menu index="6">
            <template #title>
              <el-icon><Setting /></el-icon>
              <span>设置</span>
            </template>
          </el-sub-menu>
        </template>
      </SideMenu>
    </div>
    <div class="mainSpace">
      <div v-show="pageState.mainPage" class="mainSpace-wrapper inset-center-box">
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
.mainSpace-wrapper {
  display: flex;
  flex-direction: column;
}
.mainSpace-searchbar {
  width: 100%;
}
.mainSpace-works-space {
  width: 100%;
  height: 100%;
}
</style>
