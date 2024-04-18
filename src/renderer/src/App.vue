<script setup lang="ts">
import { reactive, Ref, ref, UnwrapRef } from 'vue'
import TagManage from './floatPages/TagManage.vue'
import SideMenu from './components/SideMenu.vue'

// 变量
let loading = false // 主菜单栏加载中开关
const selectedList = ref() // 主搜索栏选中列表
const tagSelectList = ref() // 主搜索栏选择项列表
const pageState = reactive({
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
}
</script>

<template>
  <div class="ui">
    <div class="mainPage">
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
    <div v-if="pageState.floatPage" class="floatPage">
      <TagManage v-if="pageState.showTagManagePage" @close-float-page="closeFloatPage"></TagManage>
    </div>
    <div class="sideMenu">
      <SideMenu :menu-mode="sideMenuMode">
        <template #default>
          <el-sub-menu index="1">
            <el-button @click="showFloatPage('TagManage')">打开标签管理页</el-button>
          </el-sub-menu>
        </template>
      </SideMenu>
    </div>
  </div>
</template>

<style>
.ui {
  width: 100%;
  height: 100%;
}
.mainPage {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  background: #f2f2f2;
}
.floatPage {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
}
.sideMenu {
  position: absolute;
  height: 100%;
  z-index: 1;
}
</style>
