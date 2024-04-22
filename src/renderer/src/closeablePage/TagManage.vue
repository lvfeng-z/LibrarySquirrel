<script setup lang="ts">
import BaseCloseablePage from './BaseCloseablePage.vue'
import SearchList from '../components/SearchList.vue'
import SearchTable from '../components/SearchTable.vue'
import { reactive, Ref, ref, UnwrapRef } from 'vue'
import { OperationItem } from '../components/common/OperationItem'
import { Thead } from '../components/common/Thead'
import { SearchBox } from '../components/common/SearchBox'

// 变量
const localTagSelected = ref({})
const operationButton: OperationItem = { label: '查看', icon: 'view', code: 'view' } // searchTable的props.operationButton
const operationDropDown: OperationItem[] = [
  { label: '编辑', icon: 'edit', code: 'edit' },
  { label: '删除', icon: 'delete', code: 'delete' }
] // searchTable的props.operationDropDown
const localTagThead: Ref<UnwrapRef<Thead[]>> = ref([
  {
    name: 'id',
    label: '内部id',
    dataType: 'string',
    hide: false,
    headerAlign: 'center',
    headerTagType: 'success',
    dataAlign: 'center',
    overHide: true
  },
  {
    name: 'localTagName',
    label: '名称',
    dataType: 'string',
    hide: false,
    headerAlign: 'center',
    headerTagType: 'success',
    dataAlign: 'center',
    overHide: true
  },
  {
    name: 'baseLocalTagId',
    label: '上级标签内部id',
    dataType: 'string',
    hide: false,
    headerAlign: 'center',
    headerTagType: 'success',
    dataAlign: 'center',
    overHide: true
  }
])
const mainSearchBoxes: Ref<UnwrapRef<SearchBox[]>> = ref<SearchBox[]>([
  {
    name: 'localTagName',
    label: '名称',
    inputType: 'input',
    dataType: 'text',
    placeholder: '',
    inputSpan: 19
  }
])
const dropDownSearchBoxes: Ref<UnwrapRef<SearchBox[]>> = ref([
  {
    name: 'baseLocalTagId',
    label: '基础标签id',
    inputType: 'input',
    dataType: 'text',
    placeholder: '',
    inputSpan: 19
  }
])
const apis = reactive({
  localTagQuery: window.api.localTagQuery,
  localTagGetSelectList: window.api.localTagGetSelectList,
  siteTagGetSelectList: window.api.siteTagGetSelectList,
  siteGetSelectList: window.api.siteGetSelectList
})

// 方法
//
// function localTagListChange(selection: string) {
//   localTagSelected.value = { localTagId: selection }
// }
</script>

<template>
  <BaseCloseablePage>
    <div class="container">
      <div class="left">
        <div class="inset-center-box">
          <SearchTable
            key-of-data="value"
            :operation-button="operationButton"
            :operation-drop-down="operationDropDown"
            :thead="localTagThead"
            :main-search-boxes="mainSearchBoxes"
            :drop-down-search-boxes="dropDownSearchBoxes"
            :search-api="apis.localTagQuery"
          ></SearchTable>
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
