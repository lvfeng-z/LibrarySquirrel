<script setup lang="ts">
import BaseSubpage from '@renderer/components/subpage/BaseSubpage.vue'
import SearchTable from '@renderer/components/common/SearchTable.vue'
import { ref, Ref, UnwrapRef } from 'vue'
import Page from '@renderer/model/util/Page.ts'
import Site from '@renderer/model/main/entity/Site.ts'
import SiteQueryDTO from '@renderer/model/main/queryDTO/SiteQueryDTO.ts'
import OperationItem from '@renderer/model/util/OperationItem.ts'
import DialogMode from '@renderer/model/util/DialogMode.ts'
import { Thead } from '@renderer/model/util/Thead.ts'
import { InputBox } from '@renderer/model/util/InputBox.ts'

// 变量
// 站点分页参数
const sitePage: Ref<Page<SiteQueryDTO, Site>> = ref(new Page<SiteQueryDTO, Site>())
// 站点被修改的行
const siteChangedRows: Ref<Site[]> = ref([])
// site操作栏按钮
const siteOperationButton: OperationItem<Site>[] = [
  {
    label: '保存',
    icon: 'Checked',
    buttonType: 'primary',
    code: 'save',
    rule: (row) => siteChangedRows.value.includes(row)
  },
  { label: '查看', icon: 'view', code: DialogMode.VIEW },
  { label: '编辑', icon: 'edit', code: DialogMode.EDIT },
  { label: '删除', icon: 'delete', code: 'delete' }
]
// 站点的表头
const siteThead: Ref<UnwrapRef<Thead[]>> = ref([
  new Thead({
    type: 'text',
    defaultDisabled: true,
    dblclickToEdit: true,
    name: 'localTagName',
    label: '名称',
    hide: false,
    width: 150,
    headerAlign: 'center',
    dataAlign: 'center',
    overHide: true
  }),
  new Thead({
    type: 'treeSelect',
    defaultDisabled: true,
    dblclickToEdit: true,
    name: 'baseLocalTagId',
    label: '上级标签',
    hide: false,
    width: 150,
    headerAlign: 'center',
    headerTagType: 'success',
    dataAlign: 'center',
    overHide: true,
    useLoad: true
  }),
  new Thead({
    type: 'datetime',
    defaultDisabled: true,
    dblclickToEdit: true,
    name: 'updateTime',
    label: '修改时间',
    hide: false,
    width: 200,
    headerAlign: 'center',
    headerTagType: 'success',
    dataAlign: 'center',
    overHide: true
  })
])
// 站点的查询参数
const siteMainInputBoxes: Ref<UnwrapRef<InputBox[]>> = ref<InputBox[]>([
  new InputBox({
    name: 'localTagName',
    type: 'text',
    placeholder: '输入本地标签的名称',
    inputSpan: 10
  })
])
</script>
<template>
  <base-subpage>
    <template #default>
      <div class="tag-manage-container rounded-margin-box">
        <div class="tag-manage-left">
          <search-table
            ref="localTagSearchTable"
            v-model:page="sitePage"
            v-model:changed-rows="siteChangedRows"
            class="tag-manage-left-search-table"
            key-of-data="id"
            :create-button="true"
            :operation-button="siteOperationButton"
            :thead="siteThead"
            :main-input-boxes="siteMainInputBoxes"
            :drop-down-input-boxes="[]"
            :search="localTagQueryPage"
            :multi-select="false"
            :selectable="true"
            :page-sizes="[10, 20, 50, 100, 1000]"
            @create-button-clicked="handleCreateButtonClicked"
            @row-button-clicked="handleRowButtonClicked"
            @selection-change="handleLocalTagSelectionChange"
          ></search-table>
        </div>
        <div class="tag-manage-right">
          <search-table
            ref="localTagSearchTable"
            v-model:page="sitePage"
            v-model:changed-rows="siteChangedRows"
            class="tag-manage-left-search-table"
            key-of-data="id"
            :create-button="true"
            :operation-button="siteOperationButton"
            :thead="siteThead"
            :main-input-boxes="siteMainInputBoxes"
            :drop-down-input-boxes="dropDownInputBoxes"
            :search="localTagQueryPage"
            :multi-select="false"
            :selectable="true"
            :page-sizes="[10, 20, 50, 100, 1000]"
            @create-button-clicked="handleCreateButtonClicked"
            @row-button-clicked="handleRowButtonClicked"
            @selection-change="handleLocalTagSelectionChange"
          ></search-table>
        </div>
      </div>
    </template>
  </base-subpage>
</template>

<style scoped></style>
