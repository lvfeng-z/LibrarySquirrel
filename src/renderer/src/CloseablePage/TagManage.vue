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
        <div class="inset-center-box">
          <SearchTable></SearchTable>
        </div>
      </div>
      <div class="right">
        <div class="right-top">
          <div class="inset-center-box">
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
        </div>
        <div class="right-bottom">
          <div class="inset-center-box">
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
    </div>
  </BaseCloseablePage>
</template>

<style>
.container {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
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
  width: 100%;
  height: 50%;
}

.right-bottom {
  width: 100%;
  height: 50%;
}
</style>
