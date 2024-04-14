<template>
  <BaseFloatPage>
    <div class="container">
      <div class="left">
        <SearchList
          :title="'本地tag'"
          :multi-select="false"
          :search-api="apis.localTagGetSelectList"
          input-keyword="keyword"
          @selection-change="localTagListChange"
        ></SearchList>
      </div>
      <div class="right">
        <div class="right-top">
          <SearchList
            :title="'对应站点tag'"
            :multi-select="true"
            :search-api="apis.siteTagGetSelectList"
            input-keyword="keyword"
            :parent-params="localTagSelected"
            :select-list="true"
            :select-list-search-api="apis.siteGetSelectList"
            select-keyword="sites"
          ></SearchList>
        </div>
        <div class="right-bottom">
          <SearchList
            :title="'可选站点tag'"
            :multi-select="true"
            :search-api="apis.siteTagGetSelectList"
            input-keyword="keyword"
            :parent-params="localTagSelected"
            :select-list="true"
            :select-list-search-api="apis.siteGetSelectList"
            select-keyword="sites"
          ></SearchList>
        </div>
      </div>
    </div>
  </BaseFloatPage>
</template>

<script setup lang="ts">
import BaseFloatPage from './BaseFloatPage.vue'
import SearchList from '../components/SearchList.vue'
import { reactive, ref } from 'vue'

const localTagSelected = ref({})

const apis = reactive({
  localTagGetSelectList: window.api.localTagGetSelectList,
  siteTagGetSelectList: window.api.siteTagGetSelectList,
  siteGetSelectList: window.api.siteGetSelectList
})

function localTagListChange(selection: string) {
  localTagSelected.value = { localTagId: selection }
}
</script>

<style>
.container {
  display: flex;
  height: 100%; /* 调整为所需的容器高度 */
}

.left {
  flex: 1;
  height: 100%;
}

.right {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.right-top {
  flex: 1;
  height: 100%;
}

.right-bottom {
  flex: 1;
  height: 100%;
}
</style>
