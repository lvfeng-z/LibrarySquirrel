<script setup lang="ts">
import BaseCloseablePage from './BaseCloseablePage.vue'
import SearchList from '../components/SearchList.vue'
import SearchTable from '../components/SearchTable.vue'
import { reactive, ref } from 'vue'

const localTagSelected = ref({})

const apis = reactive({
  localTagGetSelectList: window.api.localTagGetSelectList,
  siteTagGetSelectList: window.api.siteTagGetSelectList,
  siteGetSelectList: window.api.siteGetSelectList
})

// function localTagListChange(selection: string) {
//   localTagSelected.value = { localTagId: selection }
// }
</script>

<template>
  <BaseCloseablePage>
    <div class="container">
      <div class="left">
        <SearchTable> </SearchTable>
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
  </BaseCloseablePage>
</template>

<style>
.container {
  display: flex;
  height: 100%; /* 调整为所需的容器高度 */
}

.left {
  width: 50%;
  height: 100%;
}

.right {
  display: flex;
  flex-direction: column;
  width: 50%;
  height: 100%;
}

.right-top {
  height: 100%;
}

.right-bottom {
  height: 100%;
}
</style>
