<script setup lang="ts">
import BaseCloseablePage from './BaseCloseablePage.vue'
import SearchTable from '../common/SearchTable.vue'
import { nextTick, onMounted, reactive, Ref, ref, UnwrapRef } from 'vue'
import { OperationItem } from '../../model/util/OperationItem'
import { Thead } from '../../model/util/Thead'
import { InputBox } from '../../model/util/InputBox'
import { DataTableOperationResponse } from '../../model/util/DataTableOperationResponse'
import ExchangeBox from '../common/ExchangeBox.vue'
import { SelectOption } from '../../model/util/SelectOption'
import { apiResponseMsgNoSuccess, apiResponseCheck } from '../../utils/ApiUtil'
import { ApiResponse } from '../../model/util/ApiResponse'
import LocalTagDialog from '../dialogs/LocalTagDialog.vue'
import { DialogMode } from '../../model/util/DialogMode'

onMounted(() => {
  localTagSearchTable.value.handleSearchButtonClicked()
})

// 变量
// localTagSearchTable子组件
const localTagSearchTable = ref()
// siteTagExchangeBox子组件
const siteTagExchangeBox = ref()
// localTagDialog子组件
const localTagDialog = ref()
// 被选中的本地标签
const localTagSelected: Ref<UnwrapRef<{ id?: number }>> = ref({})
// 本地标签SearchTable的operationButton
const operationButton: OperationItem = { label: '查看', icon: 'view', code: DialogMode.VIEW }
// 本地标签SearchTable的operationDropDown
const operationDropDown: OperationItem[] = [
  { label: '编辑', icon: 'edit', code: DialogMode.EDIT },
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
    dataAlign: 'center',
    overHide: true
  },
  {
    name: 'localTagName',
    label: '名称',
    dataType: 'string',
    hide: false,
    headerAlign: 'center',
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
  },
  {
    name: 'createTime',
    label: '创建时间',
    dataType: 'string',
    hide: false,
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
    inputType: 'text',
    placeholder: '输入本地标签的名称查询',
    inputSpan: 18
  }
])
// 本地标签SearchTable的dropDownInputBoxes
const dropDownInputBoxes: Ref<UnwrapRef<InputBox[]>> = ref([
  {
    name: 'baseLocalTagId',
    label: '基础标签id',
    inputType: 'text',
    placeholder: ''
  },
  {
    name: 'baseLocalTagId',
    label: '基础标签id',
    inputType: 'text',
    placeholder: ''
  },
  {
    name: 'baseLocalTagId',
    label: '基础标签id',
    inputType: 'text',
    placeholder: ''
  },
  {
    name: 'baseLocalTagId',
    label: '基础标签id',
    inputType: 'text',
    placeholder: ''
  }
])
// 本地标签弹窗的mode
const localTagDialogMode: Ref<UnwrapRef<DialogMode>> = ref(DialogMode.EDIT)
// 站点标签ExchangeBox的mainInputBoxes
const exchangeBoxMainInputBoxes: Ref<UnwrapRef<InputBox[]>> = ref<InputBox[]>([
  {
    name: 'keyword',
    inputType: 'text',
    placeholder: '输入站点标签的名称查询',
    inputSpan: 21
  }
])
// 站点标签ExchangeBox的DropDownInputBoxes
const exchangeBoxDropDownInputBoxes: Ref<UnwrapRef<InputBox[]>> = ref<InputBox[]>([
  {
    name: 'keyword',
    inputType: 'text',
    placeholder: '输入站点标签的名称查询',
    label: '名111111111称',
    inputSpan: 10
  }
])
// 接口
const apis = reactive({
  localTagQuery: window.api.localTagQuery,
  localTagGetSelectList: window.api.localTagGetSelectList,
  siteTagGetSelectList: window.api.siteTagGetSelectList,
  siteTagSave: window.api.siteTagSave,
  siteTagUpdateById: window.api.siteTagUpdateById,
  siteTagUpdateBindLocalTag: window.api.siteTagUpdateBindLocalTag,
  siteGetSelectList: window.api.siteGetSelectList,
  siteTagGetBoundOrUnboundInLocalTag: window.api.siteTagGetBoundOrUnboundInLocalTag
})

// 方法
// 处理本地标签新增按钮点击事件
async function handleCreateButtonClicked() {
  localTagDialogMode.value = DialogMode.NEW
  localTagDialog.value.handleDialog(true)
}
// 处理本地标签数据行按钮点击事件
function handleRowButtonClicked(op: DataTableOperationResponse) {
  switch (op.code) {
    case DialogMode.VIEW:
      localTagDialogMode.value = DialogMode.VIEW
      localTagDialog.value.handleDialog(true, op.data)
      break
    case DialogMode.EDIT:
      localTagDialogMode.value = DialogMode.EDIT
      localTagDialog.value.handleDialog(true, op.data)
      break
    case 'delete':
      localTagDialogMode.value = DialogMode.EDIT
      localTagDialog.value.handleDialog(true, op.data)
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
// 处理站点标签ExchangeBox确认交换的事件
async function handleExchangeBoxConfirm(unBound: SelectOption[], bound: SelectOption[]) {
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
  apiResponseMsgNoSuccess(upperResponse)
  apiResponseMsgNoSuccess(lowerResponse)
  if (apiResponseCheck(lowerResponse) && apiResponseCheck(upperResponse)) {
    siteTagExchangeBox.value.refreshData()
  }
}
</script>

<template>
  <BaseCloseablePage>
    <template #default>
      <div class="tag-manage-container">
        <div class="tag-manage-left">
          <div class="margin-box">
            <SearchTable
              ref="localTagSearchTable"
              key-of-data="id"
              :create-button="true"
              :operation-button="operationButton"
              :operation-drop-down="operationDropDown"
              :thead="localTagThead"
              :main-input-boxes="mainInputBoxes"
              :drop-down-input-boxes="dropDownInputBoxes"
              :search-api="apis.localTagQuery"
              :multi-select="false"
              :selectable="true"
              @create-button-clicked="handleCreateButtonClicked"
              @row-button-clicked="handleRowButtonClicked"
              @selection-change="handleLocalTagSelectionChange"
            ></SearchTable>
          </div>
        </div>
        <div class="tag-manage-right">
          <div class="margin-box">
            <ExchangeBox
              ref="siteTagExchangeBox"
              upper-title=""
              :upper-drop-down-input-boxes="exchangeBoxDropDownInputBoxes"
              :upper-main-input-boxes="exchangeBoxMainInputBoxes"
              :upper-search-api="apis.siteTagGetBoundOrUnboundInLocalTag"
              :upper-api-static-params="{ localTagId: localTagSelected.id, bound: true }"
              lower-title=""
              :lower-drop-down-input-boxes="exchangeBoxDropDownInputBoxes"
              :lower-main-input-boxes="exchangeBoxMainInputBoxes"
              :lower-search-api="apis.siteTagGetBoundOrUnboundInLocalTag"
              :lower-api-static-params="{ localTagId: localTagSelected.id, bound: false }"
              required-static-params="localTagId"
              @exchange-confirm="handleExchangeBoxConfirm"
            ></ExchangeBox>
          </div>
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
  width: 50%;
  height: 100%;
}

.tag-manage-right {
  display: flex;
  flex-direction: column;
  width: 50%;
  height: 100%;
}
</style>
