<script setup lang="ts">
import { onMounted, Ref, ref, UnwrapRef } from 'vue'
import BaseSubpage from './BaseSubpage.vue'
import SearchTable from '../common/SearchTable.vue'
import ExchangeBox from '../common/ExchangeBox.vue'
import LocalTagDialog from '../dialogs/LocalTagDialog.vue'
import lodash from 'lodash'
import ApiUtil from '../../utils/ApiUtil'
import ApiResponse from '../../model/util/ApiResponse'
import DataTableOperationResponse from '../../model/util/DataTableOperationResponse'
import { Thead } from '../../model/util/Thead'
import { InputBox } from '../../model/util/InputBox'
import SelectItem from '../../model/util/SelectItem'
import OperationItem from '../../model/util/OperationItem'
import DialogMode from '../../model/util/DialogMode'
import LocalTag from '../../model/main/entity/LocalTag.ts'
import TreeSelectNode from '@renderer/model/util/TreeSelectNode.ts'
import Page from '@renderer/model/util/Page.ts'
import StringUtil from '@renderer/utils/StringUtil.ts'
import SiteQueryDTO from '@renderer/model/main/queryDTO/SiteQueryDTO.ts'
import Site from '@renderer/model/main/entity/Site.ts'
import { isNullish } from '@renderer/utils/CommonUtil.ts'
import LocalTagQueryDTO from '@renderer/model/main/queryDTO/LocalTagQueryDTO.ts'
import IPage from '@renderer/model/util/IPage.ts'
import BaseQueryDTO from '@renderer/model/main/queryDTO/BaseQueryDTO.ts'

// onMounted
onMounted(() => {
  if (isNullish(page.value.query)) {
    page.value.query = new LocalTagQueryDTO()
  }
  page.value.query.sort = { updateTime: false, createTime: false }
  localTagSearchTable.value.handleSearchButtonClicked()
})

// 变量
// 接口
const apis = {
  localTagDeleteById: window.api.localTagDeleteById,
  localTagUpdateById: window.api.localTagUpdateById,
  localTagQueryPage: window.api.localTagQueryPage,
  localTagListSelectItems: window.api.localTagListSelectItems,
  localTagGetTree: window.api.localTagGetTree,
  siteTagGetSelectList: window.api.siteTagGetSelectList,
  siteTagUpdateBindLocalTag: window.api.siteTagUpdateBindLocalTag,
  siteQuerySelectItemPage: window.api.siteQuerySelectItemPage,
  siteTagQueryBoundOrUnboundToLocalTagPage: window.api.siteTagQueryBoundOrUnboundToLocalTagPage
}
// localTagSearchTable的组件实例
const localTagSearchTable = ref()
// siteTagExchangeBox的组件实例
const siteTagExchangeBox = ref()
// localTagDialog的组件实例
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
  new Thead({
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
  }),
  new Thead({
    type: 'treeSelect',
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
    useLoad: true,
    load: requestLocalTagTree
  }),
  new Thead({
    type: 'datetime',
    defaultDisabled: true,
    dblclickEnable: true,
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
// 本地标签SearchTable的mainInputBoxes
const mainInputBoxes: Ref<UnwrapRef<InputBox[]>> = ref<InputBox[]>([
  new InputBox({
    name: 'localTagName',
    type: 'text',
    placeholder: '输入本地标签的名称',
    inputSpan: 10
  }),
  new InputBox({
    name: 'baseLocalTagId',
    type: 'treeSelect',
    placeholder: '选择上级标签',
    inputSpan: 8,
    useLoad: true,
    load: requestLocalTagTree
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
const page: Ref<UnwrapRef<Page<LocalTagQueryDTO, LocalTag>>> = ref(new Page<LocalTagQueryDTO, LocalTag>())
// 本地标签弹窗的mode
const localTagDialogMode: Ref<UnwrapRef<DialogMode>> = ref(DialogMode.EDIT)
// 站点标签ExchangeBox的mainInputBoxes
const exchangeBoxMainInputBoxes: Ref<UnwrapRef<InputBox[]>> = ref<InputBox[]>([
  new InputBox({
    name: 'siteTagName',
    type: 'text',
    placeholder: '输入站点标签名称',
    inputSpan: 12
  }),
  new InputBox({
    name: 'siteId',
    type: 'select',
    placeholder: '选择站点',
    useLoad: true,
    load: requestSiteQuerySelectItemPage,
    inputSpan: 9
  })
])
// 站点标签ExchangeBox的DropDownInputBoxes
const exchangeBoxDropDownInputBoxes: Ref<UnwrapRef<InputBox[]>> = ref<InputBox[]>([
  new InputBox({
    name: 'id',
    type: 'text',
    placeholder: '输入id',
    label: 'id',
    inputSpan: 22
  })
])

// 方法
// 分页查询本地标签的函数
async function localTagQueryPage(page: Page<LocalTagQueryDTO, object>): Promise<Page<LocalTagQueryDTO, object> | undefined> {
  const response = await apis.localTagQueryPage(page)
  if (ApiUtil.check(response)) {
    return ApiUtil.data(response) as Page<LocalTagQueryDTO, object>
  } else {
    ApiUtil.msg(response)
    return undefined
  }
}
// 请求本地标签树的函数
async function requestLocalTagTree(query: number) {
  const param = isNullish(query) ? undefined : Number(query)
  const response = await apis.localTagGetTree(param)
  if (ApiUtil.check(response)) {
    return ApiUtil.data(response) as TreeSelectNode[]
  } else {
    return []
  }
}
// 请求站点分页列表的函数
async function requestSiteQuerySelectItemPage(query: string) {
  const sitePage: Page<SiteQueryDTO, Site> = new Page()
  if (StringUtil.isNotBlank(query)) {
    sitePage.query = { siteName: query }
  }
  const response = await apis.siteQuerySelectItemPage(sitePage)
  if (ApiUtil.check(response)) {
    const newSitePage = ApiUtil.data(response) as Page<LocalTagQueryDTO, object>
    return newSitePage.data as TreeSelectNode[]
  } else {
    return []
  }
}
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
  ApiUtil.msg(response)
  if (ApiUtil.check(response)) {
    const index = changedRows.value.indexOf(newData)
    changedRows.value.splice(index, 1)
  }
}
// 删除本地标签
async function deleteLocalTag(id: string) {
  const response = await apis.localTagDeleteById(id)
  ApiUtil.msg(response)
  if (ApiUtil.check(response)) {
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
  ApiUtil.msg(upperResponse)
  ApiUtil.msg(lowerResponse)
  if (ApiUtil.check(lowerResponse) && ApiUtil.check(upperResponse)) {
    siteTagExchangeBox.value.refreshData()
  }
}
// 请求站点标签分页选择列表的函数
async function requestSiteTagSelectItemPage(page: IPage<BaseQueryDTO, SelectItem>) {
  return apis.siteTagQueryBoundOrUnboundToLocalTagPage(page).then((response) => {
    if (ApiUtil.check(response)) {
      const newPage = ApiUtil.data<IPage<BaseQueryDTO, SelectItem>>(response)
      return isNullish(newPage) ? page : newPage
    } else {
      throw new Error()
    }
  })
}
</script>

<template>
  <base-subpage>
    <template #default>
      <div class="tag-manage-container rounded-margin-box">
        <div class="tag-manage-left">
          <search-table
            ref="localTagSearchTable"
            v-model:page="page"
            v-model:changed-rows="changedRows"
            class="tag-manage-left-search-table"
            key-of-data="id"
            :create-button="true"
            :operation-button="operationButton"
            :thead="localTagThead"
            :main-input-boxes="mainInputBoxes"
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
        <div class="tag-manage-right">
          <exchange-box
            ref="siteTagExchangeBox"
            upper-title="已绑定站点标签"
            :upper-drop-down-input-boxes="exchangeBoxDropDownInputBoxes"
            :upper-main-input-boxes="exchangeBoxMainInputBoxes"
            :upper-load="requestSiteTagSelectItemPage"
            :upper-load-fixed-params="{ localTagId: localTagSelected.id, bound: true }"
            lower-title="可绑定站点标签"
            :lower-drop-down-input-boxes="exchangeBoxDropDownInputBoxes"
            :lower-main-input-boxes="exchangeBoxMainInputBoxes"
            :lower-load="requestSiteTagSelectItemPage"
            :lower-load-fixed-params="{ localTagId: localTagSelected.id, bound: false }"
            required-fixed-params="localTagId"
            @exchange-confirm="handleExchangeBoxConfirm"
          />
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

.tag-manage-left {
  width: calc(50% - 5px);
  height: 100%;
  margin-right: 5px;
}
.tag-manage-left-search-table {
  height: 100%;
  width: 100%;
}
.tag-manage-right {
  width: calc(50% - 5px);
  height: 100%;
  margin-left: 5px;
}
</style>
