<template>
  <BaseFloatPage>
    <div class="container">
      <div class="left">
        <DataTable :data="data" :thead="thead" :multi-select="false" :selectable="true"></DataTable>
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
import DataTable from '../components/DataList.vue'
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

//test

const thead = ref([
  {
    name: 'test1',
    label: '测试1',
    type: 'string',
    hide: false
  },
  {
    name: 'test2',
    label: '测试2',
    type: 'string',
    hide: false
  },
  {
    name: 'test3',
    label: '测试3',
    type: 'string',
    hide: false
  }
])
const data = ref([
  {
    test1: '1asdfasd',
    test2: '2dasfasdf',
    test3: '3ddfazvx'
  },
  {
    test1: '1asdfasd',
    test2: '2dasfasdf',
    test3: '3ddfazvx'
  },
  {
    test1: '1asdfasd',
    test2: '2dasfasdf',
    test3: '3ddfazvx'
  },
  {
    test1: '1asdfasd',
    test2: '2dasfasdf',
    test3: '3ddfazvx'
  }
])
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
