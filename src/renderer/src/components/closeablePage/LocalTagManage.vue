<script setup lang="ts">
import { nextTick, onMounted, Ref, ref, UnwrapRef } from 'vue'
import BaseCloseablePage from './BaseCloseablePage.vue'
import SearchTable from '../common/SearchTable.vue'
import ExchangeBox from '../common/ExchangeBox.vue'
import LocalTagDialog from '../dialogs/LocalTagDialog.vue'
import lodash from 'lodash'
import ApiUtil from '../../utils/ApiUtil'
import ApiResponse from '../../model/util/ApiResponse'
import DataTableOperationResponse from '../../model/util/DataTableOperationResponse'
import Thead from '../../model/util/Thead'
import InputBox from '../../model/util/InputBox'
import SelectItem from '../../model/util/SelectItem'
import OperationItem from '../../model/util/OperationItem'
import DialogMode from '../../model/util/DialogMode'
import LocalTag from '../../model/main/LocalTag'

onMounted(() => {
  localTagSearchTable.value.handleSearchButtonClicked()
})

// 变量
// 接口
const apis = {
  localTagDeleteById: window.api.localTagDeleteById,
  localTagUpdateById: window.api.localTagUpdateById,
  localTagSelectPage: window.api.localTagSelectPage,
  localTagGetSelectList: window.api.localTagGetSelectList,
  localTagGetTree: window.api.localTagGetTree,
  siteTagGetSelectList: window.api.siteTagGetSelectList,
  siteTagUpdateBindLocalTag: window.api.siteTagUpdateBindLocalTag,
  siteGetSelectItemPage: window.api.siteGetSelectItemPage,
  siteTagGetBoundOrUnboundInLocalTag: window.api.siteTagGetBoundOrUnboundInLocalTag
}
// localTagSearchTable子组件
const localTagSearchTable = ref()
// siteTagExchangeBox子组件
const siteTagExchangeBox = ref()
// localTagDialog子组件
const localTagDialog = ref()
// 被改变的数据行
const changedRows: Ref<UnwrapRef<object[]>> = ref([])
// 被选中的本地标签
const localTagSelected: Ref<UnwrapRef<{ id?: number }>> = ref({})
// 本地标签SearchTable的operationButton
const operationButton: OperationItem[] = [
  {
    label: '保存',
    icon: 'Checked',
    buttonType: 'primary',
    code: 'save',
    rule: (row) => changedRows.value.includes(row)
  },
  { label: '查看', icon: 'view', code: DialogMode.VIEW },
  { label: '编辑', icon: 'edit', code: DialogMode.EDIT },
  { label: '删除', icon: 'delete', code: 'delete' }
]
// 本地标签SearchTable的表头
const localTagThead: Ref<UnwrapRef<Thead[]>> = ref([
  {
    type: 'text',
    defaultDisabled: true,
    dblclickEnable: true,
    name: 'localTagName',
    label: '名称',
    hide: false,
    width: 150,
    headerAlign: 'center',
    dataAlign: 'center',
    overHide: true
  },
  {
    type: 'selectTree',
    defaultDisabled: true,
    dblclickEnable: true,
    name: 'baseLocalTagId',
    label: '上级标签',
    hide: false,
    width: 150,
    headerAlign: 'center',
    headerTagType: 'success',
    dataAlign: 'center',
    overHide: true,
    useApi: true,
    api: apis.localTagGetTree
  },
  {
    type: 'datetime',
    defaultDisabled: true,
    name: 'updateTime',
    label: '修改时间',
    hide: false,
    width: 200,
    headerAlign: 'center',
    headerTagType: 'success',
    dataAlign: 'center',
    overHide: true
  }
])
// 本地标签SearchTable的mainInputBoxes
const mainInputBoxes: Ref<UnwrapRef<InputBox[]>> = ref<InputBox[]>([
  {
    name: 'localTagName',
    type: 'text',
    placeholder: '输入本地标签的名称',
    inputSpan: 10
  },
  {
    name: 'baseLocalTagId',
    type: 'selectTree',
    placeholder: '选择上级标签',
    inputSpan: 8,
    useApi: true,
    api: apis.localTagGetTree
  }
])
// 本地标签SearchTable的dropDownInputBoxes
const dropDownInputBoxes: Ref<UnwrapRef<InputBox[]>> = ref([
  {
    name: 'id',
    label: 'id',
    type: 'text',
    placeholder: '内部id'
  }
])
// 本地标签弹窗的mode
const localTagDialogMode: Ref<UnwrapRef<DialogMode>> = ref(DialogMode.EDIT)
// 站点标签ExchangeBox的mainInputBoxes
const exchangeBoxMainInputBoxes: Ref<UnwrapRef<InputBox[]>> = ref<InputBox[]>([
  {
    name: 'keyword',
    type: 'text',
    placeholder: '输入站点标签名称',
    inputSpan: 12
  },
  {
    name: 'siteId',
    type: 'select',
    placeholder: '选择站点',
    useApi: true,
    api: apis.siteGetSelectItemPage,
    pagingApi: true,
    inputSpan: 9
  }
])
// 站点标签ExchangeBox的DropDownInputBoxes
const exchangeBoxDropDownInputBoxes: Ref<UnwrapRef<InputBox[]>> = ref<InputBox[]>([
  {
    name: 'keyword',
    type: 'text',
    placeholder: '输入id',
    label: 'id',
    inputSpan: 22
  }
])

// 方法
// 处理本地标签新增按钮点击事件
async function handleCreateButtonClicked() {
  localTagDialogMode.value = DialogMode.NEW
  await localTagDialog.value.handleDialog(true)
}
// 处理本地标签数据行按钮点击事件
function handleRowButtonClicked(op: DataTableOperationResponse) {
  switch (op.code) {
    case 'save':
      saveRowEdit(op.data as LocalTag)
      break
    case DialogMode.VIEW:
      localTagDialogMode.value = DialogMode.VIEW
      localTagDialog.value.handleDialog(true, op.data)
      break
    case DialogMode.EDIT:
      localTagDialogMode.value = DialogMode.EDIT
      localTagDialog.value.handleDialog(true, op.data)
      break
    case 'delete':
      deleteLocalTag(op.id)
      break
    default:
      break
  }
}
// 处理被选中的本地标签改变的事件
async function handleLocalTagSelectionChange(selections: object[]) {
  if (selections.length > 0) {
    localTagSelected.value = selections[0]
    // 不等待DOM更新完成会导致ExchangeBox总是使用更新之前的值查询
    await nextTick()
    siteTagExchangeBox.value.refreshData()
  } else {
    localTagSelected.value = {}
  }
}
// 处理本地标签弹窗请求成功事件
function handleDialogRequestSuccess() {
  localTagSearchTable.value.handleSearchButtonClicked()
}
// 保存行数据编辑
async function saveRowEdit(newData: LocalTag) {
  const tempData = lodash.cloneDeep(newData)

  const response = await apis.localTagUpdateById(tempData)
  ApiUtil.apiResponseMsg(response)
  if (ApiUtil.apiResponseCheck(response)) {
    const index = changedRows.value.indexOf(newData)
    changedRows.value.splice(index, 1)
  }
}
// 删除本地标签
async function deleteLocalTag(id: string) {
  const response = await apis.localTagDeleteById(id)
  ApiUtil.apiResponseMsg(response)
  if (ApiUtil.apiResponseCheck(response)) {
    await localTagSearchTable.value.handleSearchButtonClicked()
  }
}
// 处理站点标签ExchangeBox确认交换的事件
async function handleExchangeBoxConfirm(unBound: SelectItem[], bound: SelectItem[]) {
  let upperResponse: ApiResponse
  if (bound && bound.length > 0) {
    const boundIds = bound.map((item) => item.value)
    upperResponse = await apis.siteTagUpdateBindLocalTag(localTagSelected.value['id'], boundIds)
  } else {
    upperResponse = { success: true, msg: '', data: undefined }
  }
  let lowerResponse: ApiResponse
  if (unBound && unBound.length > 0) {
    const unBoundIds = unBound.map((item) => item.value)
    lowerResponse = await apis.siteTagUpdateBindLocalTag(null, unBoundIds)
  } else {
    lowerResponse = { success: true, msg: '', data: undefined }
  }
  ApiUtil.apiResponseMsgNoSuccess(upperResponse)
  ApiUtil.apiResponseMsgNoSuccess(lowerResponse)
  if (ApiUtil.apiResponseCheck(lowerResponse) && ApiUtil.apiResponseCheck(upperResponse)) {
    siteTagExchangeBox.value.refreshData()
  }
}
</script>

<template>
  <BaseCloseablePage>
    <template #default>
      <div class="tag-manage-container rounded-margin-box">
        <div class="tag-manage-left">
          <SearchTable
            ref="localTagSearchTable"
            v-model:changed-rows="changedRows"
            key-of-data="id"
            :create-button="true"
            :operation-button="operationButton"
            :thead="localTagThead"
            :sort="[
              { column: 'updateTime', order: 'desc' },
              { column: 'createTime', order: 'desc' }
            ]"
            :main-input-boxes="mainInputBoxes"
            :drop-down-input-boxes="dropDownInputBoxes"
            :search-api="apis.localTagSelectPage"
            :multi-select="false"
            :selectable="true"
            @create-button-clicked="handleCreateButtonClicked"
            @row-button-clicked="handleRowButtonClicked"
            @selection-change="handleLocalTagSelectionChange"
          ></SearchTable>
        </div>
        <div class="tag-manage-right">
          <ExchangeBox
            ref="siteTagExchangeBox"
            upper-title="已绑定站点标签"
            :upper-drop-down-input-boxes="exchangeBoxDropDownInputBoxes"
            :upper-main-input-boxes="exchangeBoxMainInputBoxes"
            :upper-search-api="apis.siteTagGetBoundOrUnboundInLocalTag"
            :upper-api-static-params="{ localTagId: localTagSelected.id, bound: true }"
            lower-title="可绑定站点标签"
            :lower-drop-down-input-boxes="exchangeBoxDropDownInputBoxes"
            :lower-main-input-boxes="exchangeBoxMainInputBoxes"
            :lower-search-api="apis.siteTagGetBoundOrUnboundInLocalTag"
            :lower-api-static-params="{ localTagId: localTagSelected.id, bound: false }"
            required-static-params="localTagId"
            @exchange-confirm="handleExchangeBoxConfirm"
          ></ExchangeBox>
        </div>
      </div>
    </template>
    <template #dialog>
      <LocalTagDialog
        ref="localTagDialog"
        align-center
        destroy-on-close
        :mode="localTagDialogMode"
        @request-success="handleDialogRequestSuccess"
      ></LocalTagDialog>
    </template>
  </BaseCloseablePage>
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

.tag-manage-left {
  width: calc(50% - 5px);
  height: 100%;
  margin-right: 5px;
}

.tag-manage-right {
  width: calc(50% - 5px);
  height: 100%;
  margin-left: 5px;
}
</style>
