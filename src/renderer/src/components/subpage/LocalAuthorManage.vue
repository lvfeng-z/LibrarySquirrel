<script setup lang="ts">
import { nextTick, onMounted, Ref, ref, UnwrapRef } from 'vue'
import BaseSubpage from './BaseSubpage.vue'
import SearchTable from '../common/SearchTable.vue'
import ExchangeBox from '../common/ExchangeBox.vue'
import LocalAuthorDialog from '../dialogs/LocalAuthorDialog.vue'
import lodash from 'lodash'
import ApiUtil from '../../utils/ApiUtil'
import ApiResponse from '../../model/util/ApiResponse'
import DataTableOperationResponse from '../../model/util/DataTableOperationResponse'
import { Thead } from '../../model/util/Thead'
import { InputBox } from '../../model/util/InputBox'
import SelectItem from '../../model/util/SelectItem'
import OperationItem from '../../model/util/OperationItem'
import DialogMode from '../../model/util/DialogMode'
import LocalAuthor from '../../model/main/entity/LocalAuthor.ts'
import Page from '@renderer/model/util/Page.ts'
import SiteQueryDTO from '@renderer/model/main/queryDTO/SiteQueryDTO.ts'
import Site from '@renderer/model/main/entity/Site.ts'
import StringUtil from '@renderer/utils/StringUtil.ts'
import TreeSelectNode from '@renderer/model/util/TreeSelectNode.ts'
import LocalAuthorQueryDTO from '@renderer/model/main/queryDTO/LocalAuthorQueryDTO.ts'
import { isNullish } from '@renderer/utils/CommonUtil.ts'
import IPage from '@renderer/model/util/IPage.ts'
import BaseQueryDTO from '@renderer/model/main/queryDTO/BaseQueryDTO.ts'

onMounted(() => {
  if (isNullish(page.value.query)) {
    page.value.query = new LocalAuthorQueryDTO()
  }
  page.value.query.sort = { updateTime: false, createTime: false }
  localAuthorSearchTable.value.handleSearchButtonClicked()
})

// 变量
// 接口
const apis = {
  localAuthorDeleteById: window.api.localAuthorDeleteById,
  localAuthorUpdateById: window.api.localAuthorUpdateById,
  localAuthorQueryPage: window.api.localAuthorQueryPage,
  siteAuthorUpdateBindLocalAuthor: window.api.siteAuthorUpdateBindLocalAuthor,
  siteQuerySelectItemPage: window.api.siteQuerySelectItemPage,
  siteAuthorQueryBoundOrUnboundInLocalAuthorPage: window.api.siteAuthorQueryBoundOrUnboundInLocalAuthorPage
}
// localAuthorSearchTable的组件实例
const localAuthorSearchTable = ref()
// siteAuthorExchangeBox的组件实例
const siteAuthorExchangeBox = ref()
// localAuthorDialog的组件实例
const localAuthorDialog = ref()
// 本地作者SearchTable的分页
const page: Ref<UnwrapRef<Page<LocalAuthorQueryDTO, LocalAuthor>>> = ref(new Page<LocalAuthorQueryDTO, LocalAuthor>())
// 被改变的数据行
const changedRows: Ref<UnwrapRef<object[]>> = ref([])
// 被选中的本地作者
const localAuthorSelected: Ref<UnwrapRef<{ id?: number }>> = ref({})
// 本地作者SearchTable的operationButton
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
// 本地作者SearchTable的表头
const localAuthorThead: Ref<UnwrapRef<Thead[]>> = ref([
  new Thead({
    type: 'text',
    defaultDisabled: true,
    dblclickEnable: true,
    name: 'localAuthorName',
    label: '名称',
    hide: false,
    width: 150,
    headerAlign: 'center',
    dataAlign: 'center',
    overHide: true
  }),
  new Thead({
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
  }),
  new Thead({
    type: 'datetime',
    defaultDisabled: true,
    name: 'createTime',
    label: '创建时间',
    hide: false,
    width: 200,
    headerAlign: 'center',
    headerTagType: 'success',
    dataAlign: 'center',
    overHide: true
  })
])
// 本地作者SearchTable的mainInputBoxes
const mainInputBoxes: Ref<UnwrapRef<InputBox[]>> = ref<InputBox[]>([
  new InputBox({
    name: 'localAuthorName',
    type: 'text',
    placeholder: '输入本地作者的名称',
    inputSpan: 18
  })
])
// 本地作者SearchTable的dropDownInputBoxes
const dropDownInputBoxes: Ref<UnwrapRef<InputBox[]>> = ref([
  new InputBox({
    name: 'id',
    label: 'id',
    type: 'text',
    placeholder: '内部id'
  })
])
// 本地作者弹窗的mode
const localAuthorDialogMode: Ref<UnwrapRef<DialogMode>> = ref(DialogMode.EDIT)
// 站点作者ExchangeBox的mainInputBoxes
const exchangeBoxMainInputBoxes: Ref<UnwrapRef<InputBox[]>> = ref<InputBox[]>([
  new InputBox({
    name: 'siteAuthorName',
    type: 'text',
    placeholder: '输入站点作者名称',
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
// 站点作者ExchangeBox的DropDownInputBoxes
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
// 分页查询本地作者的函数
async function localAuthorQueryPage(page: Page<LocalAuthorQueryDTO, object>): Promise<Page<LocalAuthorQueryDTO, object> | undefined> {
  const response = await apis.localAuthorQueryPage(page)
  if (ApiUtil.check(response)) {
    return ApiUtil.data(response) as Page<LocalAuthorQueryDTO, object>
  } else {
    ApiUtil.msg(response)
    return undefined
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
    const page = ApiUtil.data(response) as Page<LocalAuthorQueryDTO, object>
    return page.data as TreeSelectNode[]
  } else {
    return []
  }
}
// 处理本地作者新增按钮点击事件
async function handleCreateButtonClicked() {
  localAuthorDialogMode.value = DialogMode.NEW
  await localAuthorDialog.value.handleDialog(true)
}
// 处理本地作者数据行按钮点击事件
function handleRowButtonClicked(op: DataTableOperationResponse) {
  switch (op.code) {
    case 'save':
      saveRowEdit(op.data as LocalAuthor)
      break
    case DialogMode.VIEW:
      localAuthorDialogMode.value = DialogMode.VIEW
      localAuthorDialog.value.handleDialog(true, op.data)
      break
    case DialogMode.EDIT:
      localAuthorDialogMode.value = DialogMode.EDIT
      localAuthorDialog.value.handleDialog(true, op.data)
      break
    case 'delete':
      deleteLocalAuthor(op.id)
      break
    default:
      break
  }
}
// 处理被选中的本地作者改变的事件
async function handleLocalAuthorSelectionChange(selections: object[]) {
  if (selections.length > 0) {
    localAuthorSelected.value = selections[0]
    // 不等待DOM更新完成会导致ExchangeBox总是使用更新之前的值查询
    await nextTick()
    siteAuthorExchangeBox.value.refreshData()
  } else {
    localAuthorSelected.value = {}
  }
}
// 处理本地作者弹窗请求成功事件
function handleDialogRequestSuccess() {
  localAuthorSearchTable.value.handleSearchButtonClicked()
}
// 保存行数据编辑
async function saveRowEdit(newData: LocalAuthor) {
  const tempData = lodash.cloneDeep(newData)

  const response = await apis.localAuthorUpdateById(tempData)
  ApiUtil.msg(response)
  if (ApiUtil.check(response)) {
    const index = changedRows.value.indexOf(newData)
    changedRows.value.splice(index, 1)
  }
}
// 删除本地作者
async function deleteLocalAuthor(id: string) {
  const response = await apis.localAuthorDeleteById(id)
  ApiUtil.msg(response)
  if (ApiUtil.check(response)) {
    await localAuthorSearchTable.value.handleSearchButtonClicked()
  }
}
// 处理站点作者ExchangeBox确认交换的事件
async function handleExchangeBoxConfirm(unBound: SelectItem[], bound: SelectItem[]) {
  let upperResponse: ApiResponse
  if (bound && bound.length > 0) {
    const boundIds = bound.map((item) => item.value)
    upperResponse = await apis.siteAuthorUpdateBindLocalAuthor(localAuthorSelected.value['id'], boundIds)
  } else {
    upperResponse = { success: true, msg: '', data: undefined }
  }
  let lowerResponse: ApiResponse
  if (unBound && unBound.length > 0) {
    const unBoundIds = unBound.map((item) => item.value)
    lowerResponse = await apis.siteAuthorUpdateBindLocalAuthor(null, unBoundIds)
  } else {
    lowerResponse = { success: true, msg: '', data: undefined }
  }
  ApiUtil.failedMsg(upperResponse)
  ApiUtil.failedMsg(lowerResponse)
  if (ApiUtil.check(lowerResponse) && ApiUtil.check(upperResponse)) {
    siteAuthorExchangeBox.value.refreshData()
  }
}
// 请求站点标签分页选择列表的函数
async function requestSiteAuthorSelectItemPage(page: IPage<BaseQueryDTO, SelectItem>) {
  const response = await apis.siteAuthorQueryBoundOrUnboundInLocalAuthorPage(page)
  if (ApiUtil.check(response)) {
    const newPage = ApiUtil.data<IPage<BaseQueryDTO, SelectItem>>(response)
    return isNullish(newPage) ? page : newPage
  } else {
    throw new Error()
  }
}
</script>

<template>
  <base-subpage>
    <template #default>
      <div class="local-author-manage-container rounded-margin-box">
        <div class="local-author-manage-left">
          <search-table
            ref="localAuthorSearchTable"
            v-model:page="page"
            v-model:changed-rows="changedRows"
            class="local-author-manage-left-search-table"
            key-of-data="id"
            :create-button="true"
            :operation-button="operationButton"
            :thead="localAuthorThead"
            :main-input-boxes="mainInputBoxes"
            :drop-down-input-boxes="dropDownInputBoxes"
            :search="localAuthorQueryPage"
            :multi-select="false"
            :selectable="true"
            @create-button-clicked="handleCreateButtonClicked"
            @row-button-clicked="handleRowButtonClicked"
            @selection-change="handleLocalAuthorSelectionChange"
          ></search-table>
        </div>
        <div class="local-author-manage-right">
          <exchange-box
            ref="siteAuthorExchangeBox"
            upper-title="已绑定站点作者"
            :upper-drop-down-input-boxes="exchangeBoxDropDownInputBoxes"
            :upper-main-input-boxes="exchangeBoxMainInputBoxes"
            :upper-load="requestSiteAuthorSelectItemPage"
            :upper-load-fixed-params="{ localAuthorId: localAuthorSelected.id, bound: true }"
            lower-title="可绑定站点作者"
            :lower-drop-down-input-boxes="exchangeBoxDropDownInputBoxes"
            :lower-main-input-boxes="exchangeBoxMainInputBoxes"
            :lower-load="requestSiteAuthorSelectItemPage"
            :lower-load-fixed-params="{ localAuthorId: localAuthorSelected.id, bound: false }"
            required-fixed-params="localAuthorId"
            @exchange-confirm="handleExchangeBoxConfirm"
          />
        </div>
      </div>
    </template>
    <template #dialog>
      <LocalAuthorDialog
        ref="localAuthorDialog"
        align-center
        destroy-on-close
        :mode="localAuthorDialogMode"
        @request-success="handleDialogRequestSuccess"
      ></LocalAuthorDialog>
    </template>
  </base-subpage>
</template>

<style>
.local-author-manage-container {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
}

.local-author-manage-left {
  width: calc(50% - 5px);
  height: 100%;
  margin-right: 5px;
}
.local-author-manage-left-search-table {
  height: 100%;
  width: 100%;
}
.local-author-manage-right {
  width: calc(50% - 5px);
  height: 100%;
  margin-left: 5px;
}
</style>
