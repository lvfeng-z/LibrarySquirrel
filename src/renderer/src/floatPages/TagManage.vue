<template>
  <BaseFloatPage>
    <div class="container">
      <div class="left">
        <DataTable
          :data="data"
          :thead="thead"
          :multi-select="true"
          :selectable="true"
          key-of-data="test1"
          :operation-button="operationButton"
          :operation-dropdown="operationDropDown"
        ></DataTable>
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
import DataTable, { Thead, OperationItem } from '../components/DataTable.vue'
import SearchList from '../components/SearchList.vue'
import { reactive, Ref, ref, UnwrapRef } from 'vue'

const localTagSelected = ref({})

const apis = reactive({
  localTagGetSelectList: window.api.localTagGetSelectList,
  siteTagGetSelectList: window.api.siteTagGetSelectList,
  siteGetSelectList: window.api.siteGetSelectList
})

// function localTagListChange(selection: string) {
//   localTagSelected.value = { localTagId: selection }
// }

//test
const thead: Ref<UnwrapRef<Thead[]>> = ref([
  {
    name: 'test1',
    label: '测试1',
    dataType: 'string',
    hide: false,
    headerAlign: 'center',
    headerTagType: 'success',
    dataAlign: 'center'
  },
  {
    name: 'test2',
    label: '测试2',
    dataType: 'string',
    hide: false,
    headerAlign: 'center',
    headerTagType: 'success',
    dataAlign: 'center'
  },
  {
    name: 'test3',
    label: '测试3',
    dataType: 'string',
    hide: false,
    headerAlign: 'center',
    headerTagType: 'success',
    dataAlign: 'center'
  }
])
const data = ref([
  {
    test1: '1asdfssd',
    test2: '2dasfasdf',
    test3: '3ddfazvx'
  },
  {
    test1: '1asdfddsd',
    test2: '2dasfasdf',
    test3: '3ddfazvx'
  },
  {
    test1: '1asdfffasd',
    test2: '2dasfasdf',
    test3: '3ddfazvx'
  },
  {
    test1: '1asdfaaasd',
    test2: '2dasfasdf',
    test3: '3ddfazvx'
  }
])

const operationButton: OperationItem = { label: '查看', icon: 'view', code: 'view' }
const operationDropDown: OperationItem[] = [
  { label: '编辑', icon: 'edit', code: 'edit' },
  { label: '删除', icon: 'delete', code: 'delete' }
]
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
