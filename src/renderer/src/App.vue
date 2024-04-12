<script setup lang="ts">
import { reactive, ref } from 'vue'
import TagManage from './floatPages/TagManage.vue'

let loading = false
const selectedList = ref()
const tagSelectList = ref()
const pageState = reactive({
  floatPage: false,
  showTagManagePage: false
})

const insert = () => {
  const tag1 = { id: null, localTagName: 'aryion', baseLocalTagId: 0 }
  window.api.tagLocalInsert(tag1)
}
const getTagSelectList = async (keyword) => {
  loading = true
  try {
    tagSelectList.value = await window.api.tagLocalGetSelectList(keyword)
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
      <el-button @click="insert">插入</el-button>
      <el-button @click="getTagSelectList">查询</el-button>
      <el-button @click="showFloatPage('TagManage')">打开标签管理页 </el-button>
    </div>
    <div v-if="pageState.floatPage" class="floatPage">
      <TagManage v-if="pageState.showTagManagePage" @close-float-page="closeFloatPage"></TagManage>
    </div>
  </div>
</template>

<style>
.ui {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
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
</style>
