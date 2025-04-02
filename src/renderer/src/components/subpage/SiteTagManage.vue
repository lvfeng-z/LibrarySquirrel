<script setup lang="ts">
import { onMounted, Ref, ref, UnwrapRef } from 'vue'
import BaseSubpage from './BaseSubpage.vue'
import SearchTable from '../common/SearchTable.vue'
import SiteTagDialog from '../dialogs/SiteTagDialog.vue'
import lodash from 'lodash'
import ApiUtil from '../../utils/ApiUtil'
import DataTableOperationResponse from '../../model/util/DataTableOperationResponse'
import { Thead } from '../../model/util/Thead'
import { InputBox } from '../../model/util/InputBox'
import OperationItem from '../../model/util/OperationItem'
import DialogMode from '../../model/util/DialogMode'
import Page from '@renderer/model/util/Page.ts'
import { IsNullish } from '@renderer/utils/CommonUtil.ts'
import SiteTagQueryDTO from '@renderer/model/main/queryDTO/SiteTagQueryDTO.ts'
import SiteTag from '@renderer/model/main/entity/SiteTag.ts'

// onMounted
onMounted(() => {
  if (IsNullish(page.value.query)) {
    page.value.query = new SiteTagQueryDTO()
  }
  page.value.query.sort = [
    { key: 'updateTime', asc: false },
    { key: 'createTime', asc: false }
  ]
  siteTagSearchTable.value.doSearch()
})

// 变量
// 接口
const apis = {
  siteTagDeleteById: window.api.siteTagDeleteById,
  siteTagUpdateById: window.api.siteTagUpdateById,
  siteTagQueryPage: window.api.siteTagQueryPage
}
// siteTagSearchTable的组件实例
const siteTagSearchTable = ref()
// siteTagExchangeBox的组件实例
const siteTagExchangeBox = ref()
// 被改变的数据行
const changedRows: Ref<UnwrapRef<SiteTag[]>> = ref([])
// 被选中的本地标签
const localTagSelected: Ref<UnwrapRef<SiteTag>> = ref(new SiteTag())
// 本地标签SearchTable的operationButton
const operationButton: OperationItem<SiteTag>[] = [
  {
    label: '创建同名本地标签',
    icon: 'CirclePlusFilled',
    buttonType: 'primary',
    code: 'save',
    rule: (row) => IsNullish(row.localTagId)
  },
  { label: '查看', icon: 'view', code: DialogMode.VIEW },
  { label: '编辑', icon: 'edit', code: DialogMode.EDIT },
  { label: '删除', icon: 'delete', code: 'delete' }
]
// 本地标签SearchTable的表头
const siteTagThead: Ref<UnwrapRef<Thead[]>> = ref([
  new Thead({
    type: 'text',
    defaultDisabled: true,
    dblclickToEdit: true,
    key: 'siteTagName',
    title: '名称',
    hide: false,
    width: 250,
    headerAlign: 'center',
    dataAlign: 'center',
    overHide: true
  }),
  new Thead({
    type: 'textarea',
    defaultDisabled: true,
    dblclickToEdit: true,
    key: 'description',
    title: '详情',
    hide: false,
    width: 400,
    headerAlign: 'center',
    dataAlign: 'center',
    overHide: true
  }),
  new Thead({
    type: 'datetime',
    defaultDisabled: true,
    dblclickToEdit: true,
    key: 'updateTime',
    title: '修改时间',
    hide: false,
    width: 200,
    headerAlign: 'center',
    headerTagType: 'success',
    dataAlign: 'center',
    overHide: true
  })
])
// 本地标签SearchTable的mainInputBoxes
const mainInputBoxes: Ref<UnwrapRef<InputBox[]>> = ref<InputBox[]>([
  new InputBox({
    name: 'localTagName',
    type: 'text',
    placeholder: '输入本地标签的名称',
    inputSpan: 10
  })
])
// 本地标签SearchTable的dropDownInputBoxes
const dropDownInputBoxes: Ref<UnwrapRef<InputBox[]>> = ref([
  new InputBox({
    name: 'id',
    label: 'id',
    type: 'text',
    placeholder: '内部id'
  })
])
// 本地标签SearchTable的分页
const page: Ref<UnwrapRef<Page<SiteTagQueryDTO, SiteTag>>> = ref(new Page<SiteTagQueryDTO, SiteTag>())
// 本地标签弹窗的mode
const localTagDialogMode: Ref<UnwrapRef<DialogMode>> = ref(DialogMode.EDIT)
// 本地标签的对话框开关
const dialogState: Ref<UnwrapRef<boolean>> = ref(false)
// 本地标签对话框的数据
const dialogData: Ref<UnwrapRef<SiteTag>> = ref(new SiteTag())
// 是否禁用ExchangeBox的搜索按钮
const disableExcSearchButton: Ref<boolean> = ref(false)

// 方法
// 分页查询本地标签的函数
async function siteTagQueryPage(page: Page<SiteTagQueryDTO, object>): Promise<Page<SiteTagQueryDTO, object> | undefined> {
  const response = await apis.siteTagQueryPage(page)
  if (ApiUtil.check(response)) {
    let responsePage = ApiUtil.data<Page<SiteTagQueryDTO, SiteTag>>(response)
    if (IsNullish(responsePage)) {
      return undefined
    }
    responsePage = new Page(responsePage)
    const voList = responsePage.data?.map((item: SiteTag) => new SiteTag(item))
    const result = responsePage.transform<SiteTag>()
    result.data = voList
    return result
  } else {
    ApiUtil.msg(response)
    return undefined
  }
}
// 处理本地标签新增按钮点击事件
async function handleCreateButtonClicked() {
  localTagDialogMode.value = DialogMode.NEW
  dialogData.value = new SiteTag()
  dialogState.value = true
}
// 处理本地标签数据行按钮点击事件
function handleRowButtonClicked(op: DataTableOperationResponse<SiteTag>) {
  switch (op.code) {
    case 'save':
      saveRowEdit(op.data)
      break
    case DialogMode.VIEW:
      localTagDialogMode.value = DialogMode.VIEW
      dialogData.value = op.data
      dialogState.value = true
      break
    case DialogMode.EDIT:
      localTagDialogMode.value = DialogMode.EDIT
      dialogData.value = op.data
      dialogState.value = true
      break
    case 'delete':
      deleteLocalTag(op.id)
      break
    default:
      break
  }
}
// 处理被选中的本地标签改变的事件
async function handleLocalTagSelectionChange(selections: SiteTag[]) {
  if (selections.length > 0) {
    disableExcSearchButton.value = false
    localTagSelected.value = selections[0]
    siteTagExchangeBox.value.refreshData()
  }
}
// 处理本地标签弹窗请求成功事件
function refreshTable() {
  siteTagSearchTable.value.doSearch()
}
// 保存行数据编辑
async function saveRowEdit(newData: SiteTag) {
  const tempData = lodash.cloneDeep(newData)

  const response = await apis.siteTagUpdateById(tempData)
  ApiUtil.msg(response)
  if (ApiUtil.check(response)) {
    const index = changedRows.value.indexOf(newData)
    changedRows.value.splice(index, 1)
    refreshTable()
  }
}
// 删除本地标签
async function deleteLocalTag(id: string) {
  const response = await apis.siteTagDeleteById(id)
  ApiUtil.msg(response)
  if (ApiUtil.check(response)) {
    await siteTagSearchTable.value.doSearch()
  }
}
</script>

<template>
  <base-subpage>
    <template #default>
      <div class="tag-manage-container rounded-margin-box">
        <search-table
          ref="siteTagSearchTable"
          v-model:page="page"
          v-model:changed-rows="changedRows"
          class="tag-manage-search-table"
          key-of-data="id"
          :create-button="true"
          :operation-button="operationButton"
          :thead="siteTagThead"
          :main-input-boxes="mainInputBoxes"
          :drop-down-input-boxes="dropDownInputBoxes"
          :search="siteTagQueryPage"
          :multi-select="false"
          :selectable="true"
          :page-sizes="[10, 20, 50, 100, 1000]"
          @create-button-clicked="handleCreateButtonClicked"
          @row-button-clicked="handleRowButtonClicked"
          @selection-change="handleLocalTagSelectionChange"
        ></search-table>
      </div>
    </template>
    <template #dialog>
      <site-tag-dialog
        v-model:form-data="dialogData"
        v-model:state="dialogState"
        align-center
        destroy-on-close
        :mode="localTagDialogMode"
        @request-success="refreshTable"
      />
    </template>
  </base-subpage>
</template>

<style>
.tag-manage-container {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
}
.tag-manage-search-table {
  height: 100%;
  width: 100%;
}
</style>
