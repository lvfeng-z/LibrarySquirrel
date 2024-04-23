<script setup lang="ts">
import BaseCloseablePage from './BaseCloseablePage.vue'
import SearchTable from '../components/SearchTable.vue'
import { reactive, Ref, ref, UnwrapRef } from 'vue'
import { OperationItem } from '../components/common/OperationItem'
import { Thead } from '../components/common/Thead'
import { SearchBox } from '../components/common/SearchBox'
import { OperationResponse } from '../components/common/OperationResponse'
import ExchangeBox from '../components/ExchangeBox.vue'

// 变量
const localTagSelected = ref()
// 本地标签SearchTable的operationButton
const operationButton: OperationItem = { label: '查看', icon: 'view', code: 'view' }
// 本地标签SearchTable的operationDropDown
const operationDropDown: OperationItem[] = [
  { label: '编辑', icon: 'edit', code: 'edit' },
  { label: '删除', icon: 'delete', code: 'delete' }
]
// 本地标签SearchTable的表头
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
// 本地标签SearchTable的mainSearchBoxes
const mainSearchBoxes: Ref<UnwrapRef<SearchBox[]>> = ref<SearchBox[]>([
  {
    name: 'localTagName',
    inputType: 'input',
    dataType: 'text',
    placeholder: '输入本地标签的名称查询',
    inputSpan: 18
  }
])
// 本地标签SearchTable的dropDownSearchBoxes
const dropDownSearchBoxes: Ref<UnwrapRef<SearchBox[]>> = ref([
  {
    name: 'baseLocalTagId',
    label: '基础标签id',
    inputType: 'input',
    dataType: 'text',
    placeholder: ''
  }
])
// 站点标签ExchangeBox的mainSearchBoxes
const exchangeBoxMainSearchBoxes: Ref<UnwrapRef<SearchBox[]>> = ref<SearchBox[]>([
  {
    name: 'keyword',
    inputType: 'input',
    dataType: 'text',
    placeholder: '输入站点标签的名称查询',
    inputSpan: 21
  }
])
// 接口
const apis = reactive({
  localTagQuery: window.api.localTagQuery,
  localTagGetSelectList: window.api.localTagGetSelectList,
  siteTagGetSelectList: window.api.siteTagGetSelectList,
  siteGetSelectList: window.api.siteGetSelectList
})

// 方法
// 处理新增按钮点击事件
function handleCreateButtonClicked() {
  console.log('TagManage.vue.handleCreateButtonClicked')
}
// 处理数据行按钮点击事件
function handleRowButtonClicked(op: OperationResponse) {
  console.log('TagManage.vue.handleRowButtonClicked', op)
}
// 处理被选中的LocalTag改变的事件
function handleLocalTagSelectionChange(selections: object[]) {
  if (selections.length > 0) {
    localTagSelected.value = selections[0]
  } else {
    localTagSelected.value = null
  }
}
</script>

<template>
  <BaseCloseablePage>
    <div class="container">
      <div class="left">
        <div class="margin-box">
          <SearchTable
            key-of-data="id"
            :create-button="true"
            :operation-button="operationButton"
            :operation-drop-down="operationDropDown"
            :thead="localTagThead"
            :main-search-boxes="mainSearchBoxes"
            :drop-down-search-boxes="dropDownSearchBoxes"
            :search-api="apis.localTagQuery"
            :multi-select="false"
            :selectable="true"
            @create-button-clicked="handleCreateButtonClicked"
            @row-button-clicked="handleRowButtonClicked"
            @selection-change="handleLocalTagSelectionChange"
          ></SearchTable>
        </div>
      </div>
      <div class="right">
        <div class="margin-box">
          <ExchangeBox
            :upper-drop-down-search-boxes="[]"
            :upper-main-search-boxes="exchangeBoxMainSearchBoxes"
            :upper-search-api="apis.siteTagGetSelectList"
            :lower-drop-down-search-boxes="[]"
            :lower-main-search-boxes="exchangeBoxMainSearchBoxes"
            :lower-search-api="apis.siteTagGetSelectList"
          ></ExchangeBox>
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
</style>
