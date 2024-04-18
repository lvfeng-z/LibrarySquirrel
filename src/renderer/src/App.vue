<script setup lang="ts">
import { reactive, ref } from 'vue'
import TagManage from './floatPages/TagManage.vue'
import SideMenu from './components/SideMenu.vue'

let loading = false
const selectedList = ref()
const tagSelectList = ref()
const pageState = reactive({
  floatPage: false,
  showTagManagePage: false
})

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
      <SideMenu>
        <template #default>
          <el-sub-menu>
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
