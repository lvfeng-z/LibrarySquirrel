<script setup lang="ts">
import SearchToolbar, { SearchBox } from './SearchToolbar.vue'
import DataTable, { Thead, OperationItem, OperationResponse } from './DataTable.vue'
import { ref, Ref, UnwrapRef } from 'vue'

// 方法
function buttonClicked(code: OperationResponse) {
  console.log('buttonClicked(code)', code)
}

// test

// <DataTable>
const thead: Ref<UnwrapRef<Thead[]>> = ref([
  {
    name: 'test1',
    label: '测试1',
    dataType: 'string',
    hide: false,
    headerAlign: 'center',
    headerTagType: 'success',
    dataAlign: 'center',
    overHide: true
  },
  {
    name: 'test2',
    label: '测试2',
    dataType: 'string',
    hide: false,
    headerAlign: 'center',
    headerTagType: 'success',
    dataAlign: 'center',
    overHide: true
  },
  {
    name: 'test3',
    label: '测试3',
    dataType: 'string',
    hide: false,
    headerAlign: 'center',
    headerTagType: 'success',
    dataAlign: 'center'
  },
  {
    name: 'test4',
    label: '测试4',
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
  },
  {
    test1: '1cvaere',
    test2: '2dasfasdf',
    test3: '3ddfazvx'
  },
  {
    test1: '1badt',
    test2: '2dasfasdf',
    test3: '3ddfazvx'
  },
  {
    test1: '1athdsaf',
    test2: '2dasfasdf',
    test3: '3ddfazvx'
  },
  {
    test1: '1vfhdty',
    test2: '2dasfasdf',
    test3: '3ddfazvx'
  },
  {
    test1: '1hjiovnm',
    test2: '2dasfasdf',
    test3: '3ddfazvx'
  },
  {
    test1: '1yudgnfdhd',
    test2: '2dasfasdf',
    test3: '3ddfazvx'
  },
  {
    test1: '1vbetyjsnh',
    test2: '2dasfasdf',
    test3: '3ddfazvx'
  },
  {
    test1: '1bsrrjvywj',
    test2: '2dasfasdf',
    test3: '3ddfazvx'
  },
  {
    test1: '1./,;.,',
    test2: '2dasfasdf',
    test3: '3ddfazvx'
  },
  {
    test1: '1 5飞洒啊发撒',
    test2: '2dasfasdf',
    test3: '3ddfazvx'
  },
  {
    test1: '1；。】【；。/;,.]/[,.][/;,.];/[,.]/[;,.][/;,.][/;,.][/,];[./,[]/;,.[]',
    test2: '2dasfasdf',
    test3: '3ddfazvx'
  }
])
const operationButton: OperationItem = { label: '查看', icon: 'view', code: 'view' }
const operationDropDown: OperationItem[] = [
  { label: '编辑', icon: 'edit', code: 'edit' },
  { label: '删除', icon: 'delete', code: 'delete' }
]
// <SearchToolbar>
const mainSearchBoxes = ref([
  {
    name: 'test1',
    label: '字段1',
    inputType: 'input',
    dataType: 'text',
    placeholder: ''
  },
  {
    name: 'test2',
    label: '字段2',
    inputType: 'input',
    dataType: 'text',
    placeholder: ''
  },
  {
    name: 'test3',
    label: '字段3',
    inputType: 'input',
    dataType: 'text',
    placeholder: ''
  },
  {
    name: 'test4',
    label: '字段4',
    inputType: 'input',
    dataType: 'text',
    placeholder: ''
  }
])
const dropDownSearchBoxes: Ref<UnwrapRef<SearchBox[]>> = ref([
  {
    name: 'test5',
    label: '字段5',
    inputType: 'input',
    dataType: 'text',
    placeholder: ''
  }
])
</script>

<template>
  <div class="search-table">
    <div class="search-table-wrapper inset-box-centering">
      <div class="search-table-toolbar">
        <SearchToolbar
          :drop-down-search-boxes="dropDownSearchBoxes"
          :main-search-boxes="mainSearchBoxes"
        >
        </SearchToolbar>
      </div>
      <div class="search-table-data-table rounded-borders">
        <DataTable
          :data="data"
          :thead="thead"
          :multi-select="true"
          :selectable="true"
          key-of-data="test1"
          :operation-button="operationButton"
          :operation-dropdown="operationDropDown"
          @button-clicked="buttonClicked"
        ></DataTable>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-table {
  height: 100%;
  width: 100%;
}

.search-table-toolbar {
  height: 100px;
  width: 100%;
}

.search-table-data-table {
  height: calc(100% - 100px);
  width: 100%;
}
</style>
